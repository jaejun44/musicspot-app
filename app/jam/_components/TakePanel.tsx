'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { track, incrementUserProperty } from '@/lib/analytics';
import { useT } from '@/lib/i18n';
import { useAuth } from '@/hooks/useAuth';
import { useTakeRecorder, TAKE_BARS } from '@/hooks/useTakeRecorder';
import { createAudioContext, createMasterChain } from '@/lib/ensemble-audio';
import { eightBarsDuration } from '@/lib/metronome';
import { unlockEarAudio } from '@/lib/ear/synth';
import { findProgression, noteName, progressionChords, type JamCombo, type Progression } from '@/lib/jam/catalog';
import { mutesToMask, renderJamLoop, maskToMutes, type JamSpec, type Part } from '@/lib/jam/engine';
import { currentSessionType, enterRecordSession, sessionModeFromUrl } from '@/lib/jam/session';
import {
  OFFSET_MAX_MS,
  OFFSET_MIN_MS,
  OFFSET_STEP_MS,
  clampOffset,
  encodeWavMono16,
  mixToMono,
  normalizeTake,
  processTake,
} from '@/lib/jam/take';
import { TAKE_BACKING_GAIN_DEFAULT } from '@/lib/jam/backing';
import { clearPendingTake, loadPendingTake, savePendingTake } from '@/lib/jam/takeStore';
import { INSTRUMENTS } from '@/lib/instruments';
import { CARD } from './ui';

const SHADOW = { boxShadow: '4px 4px 0 #0A0A0A' };
const MAX_UPLOAD_BYTES = 30 * 1024 * 1024;

/** 8마디 장르 칸(자유 입력)에 넣을 이름 */
const GENRE: Record<string, string> = { blues: '블루스', rock: '록', funk: '펑크', metal: '메탈', ballad: '발라드', 'pop-punk': '팝펑크' };

/** 녹음 때 설정 그대로(미리듣기·올리기는 이 값으로 — 화면 조절값이 바뀌어도 테이크와 맞게) */
interface Take {
  samples: Float32Array;
  sampleRate: number;
  bpm: number;
  progId: string;
  mutes: number;
}

interface Props {
  combo: JamCombo;
  progression: Progression;
  /** 지금 화면의 BPM·음소거(녹음 시작 때 고정) */
  bpm: number;
  muted: Record<Part, boolean>;
  /** 녹음 전에 실시간 반주를 멈춘다 */
  onBeforeRecord: () => void;
  /** 로그인 후 복원된 테이크의 진행으로 화면을 맞춘다 */
  onRestoreProgression: (progId: string) => void;
}

/** 녹음 webm → 모노 샘플. 디코딩 전용 컨텍스트를 쓰고 닫는다 */
async function decodeTake(blob: Blob): Promise<{ samples: Float32Array; sampleRate: number }> {
  const ctx = createAudioContext();
  try {
    const data = await blob.arrayBuffer();
    const buf = await new Promise<AudioBuffer>((resolve, reject) => ctx.decodeAudioData(data, resolve, reject));
    const channels = Array.from({ length: buf.numberOfChannels }, (_, i) => buf.getChannelData(i));
    return { samples: mixToMono(channels), sampleRate: buf.sampleRate };
  } finally {
    void ctx.close().catch(() => {});
  }
}

export default function TakePanel({ combo, progression, bpm, muted, onBeforeRecord, onRestoreProgression }: Props) {
  const t = useT();
  const router = useRouter();
  const { user } = useAuth();
  const slug = combo.slug;
  const rec = useTakeRecorder(bpm);
  const [take, setTake] = useState<Take | null>(null);
  const [offsetMs, setOffsetMs] = useState(0);
  const [gain, setGain] = useState(1);
  /** 반주 음량 배수(0~2). 올리면 jam_gain(%)으로 저장돼 /stems 재생에도 그대로 */
  const [backingGain, setBackingGain] = useState(TAKE_BACKING_GAIN_DEFAULT);
  const [instrument, setInstrument] = useState('기타');
  const [previewing, setPreviewing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [restored, setRestored] = useState(false);
  /**
   * 미리듣기(8마디 반복). takeGain·backingGain = 음량 슬라이더 즉시 반영,
   * swapTake = 싱크를 바꾸면 테이크만 새 싱크로 같은 위치에서 다시 이어 재생
   */
  const preview = useRef<{ stop: () => void; takeGain: GainNode; backingGain: GainNode; swapTake: (offsetMs: number) => void } | null>(null);
  const backingCache = useRef<{ key: string; buf: Promise<AudioBuffer> } | null>(null);

  const specFor = useCallback(
    (tk: Take): JamSpec => {
      const prog = findProgression(combo, tk.progId) ?? progression;
      return { style: combo.style.id, bpm: tk.bpm, chords: progressionChords(combo.key, prog) };
    },
    [combo, progression],
  );

  const backingFor = useCallback(
    (tk: Take) => {
      const key = `${tk.progId}|${tk.bpm}|${tk.mutes}`;
      if (backingCache.current?.key !== key) backingCache.current = { key, buf: renderJamLoop(specFor(tk), maskToMutes(tk.mutes)) };
      return backingCache.current.buf;
    },
    [specFor],
  );

  // 24시간 지난 임시 보관분 정리 + 로그인하고 돌아왔으면(?resume=1) 복원. 자동으로 올리지 않는다
  useEffect(() => {
    let alive = true;
    (async () => {
      const pending = await loadPendingTake();
      const params = new URLSearchParams(window.location.search);
      if (!alive || params.get('resume') !== '1') return;
      params.delete('resume');
      const rest = params.toString();
      window.history.replaceState(null, '', `${window.location.pathname}${rest ? `?${rest}` : ''}`);
      if (!pending || pending.slug !== slug) return;
      setTake({ samples: pending.samples, sampleRate: pending.sampleRate, bpm: pending.bpm, progId: pending.progId, mutes: pending.mutes });
      setOffsetMs(pending.offsetMs);
      setGain(pending.gain);
      setBackingGain(pending.backingGain ?? TAKE_BACKING_GAIN_DEFAULT);
      setInstrument(pending.instrument);
      setRestored(true);
      onRestoreProgression(pending.progId);
      track('jam_resume', { slug });
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const stopPreview = useCallback(() => {
    if (!preview.current) return;
    preview.current.stop();
    preview.current = null;
    setPreviewing(false);
  }, []);
  useEffect(() => stopPreview, [stopPreview]);

  function startRecord() {
    if (uploading) return;
    stopPreview();
    onBeforeRecord();
    setMessage('');
    setRestored(false);
    const settings = { bpm, progId: progression.id, mutes: mutesToMask(muted) };
    const sessMode = sessionModeFromUrl();
    let restore: () => void = () => {};
    let sessionDuring = 'none';
    track('jam_record_start', { slug, bpm });
    void rec.start({
      beforeMic: () => {
        restore = enterRecordSession(sessMode);
        sessionDuring = currentSessionType();
      },
      afterStop: () => restore(),
      loadBacking: async () => [await renderJamLoop({ style: combo.style.id, bpm, chords: progressionChords(combo.key, progression) }, muted)],
      onRecorded: async (blob, info) => {
        const diag = { mime: info.mime, track_muted: info.trackMuted ?? undefined, track_state: info.trackState ?? undefined, session: sessionDuring, sess_mode: sessMode };
        try {
          const { samples, sampleRate } = await decodeTake(blob);
          if (samples.length < sampleRate * 0.5) {
            track('jam_record_error', { slug, reason: 'empty', ...diag });
            setMessage(t('녹음된 소리가 없어요. 다시 녹음해 주세요.'));
            return;
          }
          // 자동 음량 맞춤: 작게 녹음됐으면 최대 −3dB까지. 미리듣기·올리기 모두 이 샘플로
          const norm = normalizeTake(samples);
          if (!norm) {
            console.warn('[jam] 테이크에 소리가 거의 없음 — 증폭하지 않음', diag);
            track('jam_record_error', { slug, reason: 'silent', ...diag });
            setMessage(t('녹음된 소리가 거의 없어요. 마이크를 확인해 주세요'));
            return;
          }
          setTake({ samples: norm.samples, sampleRate, ...settings });
          setOffsetMs(0);
          setGain(1);
          setBackingGain(TAKE_BACKING_GAIN_DEFAULT);
          track('jam_record_done', { slug, peak_db: Math.round(norm.peakDb), boost_db: norm.boostDb, ...diag });
        } catch (e) {
          console.error('[jam] 테이크 디코딩 실패', e);
          track('jam_record_error', { slug, reason: 'decode', ...diag });
          setMessage(t('녹음을 읽지 못했어요. 다시 녹음해 주세요.'));
        }
      },
    });
  }

  // 마이크 오류는 훅이 기존 한국어 문구로 알려 준다
  useEffect(() => {
    if (rec.phase === 'error') track('jam_record_error', { slug, reason: 'mic' });
  }, [rec.phase, slug]);

  function processed(tk: Take): Float32Array {
    return processTake(tk.samples, tk.sampleRate, offsetMs, eightBarsDuration(tk.bpm), gain);
  }

  async function playPreview() {
    if (!take) return;
    if (previewing) return stopPreview();
    const ctx = await unlockEarAudio(); // 재생은 음감과 같은 세션(무음 스위치 무시)
    const loopSec = eightBarsDuration(take.bpm);
    /** 음량은 아래 GainNode로(바로 반영). 싱크만 샘플에 */
    const takeBufFor = (off: number) => {
      const samples = processTake(take.samples, take.sampleRate, off, loopSec, 1);
      const buf = ctx.createBuffer(1, samples.length, take.sampleRate);
      buf.getChannelData(0).set(samples);
      return buf;
    };
    let backing: AudioBuffer | null = null;
    try {
      backing = await backingFor(take);
    } catch (e) {
      console.error('[jam] 미리듣기 반주 렌더 실패 — 테이크만 재생', e);
    }
    // playEnsemble과 같은 마스터 체인. 반주·테이크가 각자 GainNode를 하나 더 거친다
    const { master, limiter } = createMasterChain(ctx);
    const takeGain = ctx.createGain();
    takeGain.gain.value = gain;
    takeGain.connect(master);
    const backingNode = ctx.createGain();
    backingNode.gain.value = backingGain;
    backingNode.connect(master);
    const when = ctx.currentTime + 0.1;
    // 8마디를 멈출 때까지 반복 — 들으면서 싱크·음량을 맞춘다
    const startLoop = (buf: AudioBuffer, dest: AudioNode, at: number, pos: number) => {
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      src.loopEnd = buf.duration;
      src.connect(dest);
      src.start(at, pos);
      return src;
    };
    const stopSrc = (src: AudioBufferSourceNode | null, at?: number) => {
      if (!src) return;
      try {
        src.stop(at);
      } catch {
        /* 이미 끝난 소스 */
      }
    };
    const backingSrc = backing ? startLoop(backing, backingNode, when, 0) : null;
    let takeSrc = startLoop(takeBufFor(offsetMs), takeGain, when, 0);
    const swapTake = (off: number) => {
      const at = Math.max(ctx.currentTime + 0.03, when); // 시작 전이면 반주와 같은 시각에
      const pos = (at - when) % loopSec;
      const old = takeSrc;
      takeSrc = startLoop(takeBufFor(off), takeGain, at, pos);
      stopSrc(old, at);
      setTimeout(() => old.disconnect(), 200);
    };
    const stop = () => {
      stopSrc(backingSrc);
      stopSrc(takeSrc);
      backingSrc?.disconnect();
      takeSrc.disconnect();
      takeGain.disconnect();
      backingNode.disconnect();
      master.disconnect();
      limiter.disconnect();
    };
    preview.current = { stop, takeGain, backingGain: backingNode, swapTake };
    setPreviewing(true);
    track('jam_take_preview', { slug, offset_ms: offsetMs });
  }

  function changeBackingGain(v: number) {
    setBackingGain(v);
    const p = preview.current;
    if (p) p.backingGain.gain.setTargetAtTime(v, p.backingGain.context.currentTime, 0.02);
  }

  function changeGain(v: number) {
    setGain(v);
    const p = preview.current;
    if (p) p.takeGain.gain.setTargetAtTime(v, p.takeGain.context.currentTime, 0.02); // 듣는 중이면 바로
  }

  /** 최신 싱크 값(빠르게 연타해도 누른 만큼 — 렌더 전 값에 덧붙지 않게) */
  const offsetRef = useRef(offsetMs);
  offsetRef.current = offsetMs;
  function changeOffset(v: number) {
    const next = clampOffset(v);
    if (next === offsetRef.current) return;
    offsetRef.current = next;
    setOffsetMs(next);
    preview.current?.swapTake(next); // 듣는 중이면 같은 위치에서 바로
  }
  const nudgeOffset = (delta: number) => changeOffset(offsetRef.current + delta);

  async function upload() {
    if (!take || uploading) return;
    stopPreview();
    setMessage('');
    track('jam_upload_click', { slug, logged_in: !!user });

    if (!user) {
      const ok = await savePendingTake({
        slug,
        progId: take.progId,
        bpm: take.bpm,
        mutes: take.mutes,
        offsetMs,
        gain,
        backingGain,
        instrument,
        sampleRate: take.sampleRate,
        samples: take.samples,
        savedAt: Date.now(),
      });
      if (!ok) {
        track('jam_upload_error', { slug, stage: 'save_local' });
        setMessage(t('이 브라우저에서는 임시 보관이 안 돼요. 로그인한 뒤 다시 녹음해 주세요.'));
        return;
      }
      const back = `/jam/${slug}?p=${encodeURIComponent(take.progId)}&resume=1`;
      router.push(`/login?returnTo=${encodeURIComponent(back)}`);
      return;
    }

    setUploading(true);
    const wav = new Blob([encodeWavMono16(processed(take), take.sampleRate)], { type: 'audio/wav' });
    if (wav.size > MAX_UPLOAD_BYTES) {
      setMessage(t('파일 크기는 30MB 이하여야 합니다.'));
      setUploading(false);
      return;
    }
    const userName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || '익명';
    const keyName = `${noteName(combo.key.pc, false)}${combo.key.mode === 'minor' ? 'm' : ''}`;
    const title = `${combo.key.name} ${combo.key.mode === 'major' ? '메이저' : '마이너'} ${combo.style.label} · 백킹 잼`;
    // 개발 서버 QA 전용: ?qa_fail=track 이면 트랙 저장 실패를 흉내 낸다(운영 빌드에서는 무시)
    const qaFail = process.env.NODE_ENV !== 'production' ? new URLSearchParams(window.location.search).get('qa_fail') : null;

    const fail = (stage: 'project' | 'storage' | 'track', text: string, orphan?: string) => {
      track('jam_upload_error', { slug, stage, ...(orphan ? { orphan_path: orphan } : {}) });
      setMessage(text);
      setUploading(false);
    };

    // 1) 프로젝트
    const { data: project, error: projectErr } = await supabase
      .from('stem_projects')
      .insert({
        title,
        creator_id: user.id,
        creator_name: userName,
        creator_emoji: '🎵',
        bpm: take.bpm,
        key_signature: keyName,
        genre: GENRE[combo.style.slug] ?? null,
        is_open: true,
        jam_slug: slug,
        jam_bpm: take.bpm,
        jam_prog: take.progId,
        jam_mutes: take.mutes,
        jam_gain: Math.round(backingGain * 100), // 기본 50도 명시 저장(NULL은 100으로 읽히므로)
      })
      .select('id')
      .single();
    if (projectErr || !project) {
      console.error('[jam] 프로젝트 생성 실패', projectErr);
      return fail('project', t('올리지 못했어요. 다시 시도해 주세요.'));
    }
    const projectId = project.id as string;
    // 실패하면 프로젝트를 지운다(트랙 없는 빈 프로젝트 금지)
    const dropProject = async () => {
      const { error } = await supabase.from('stem_projects').delete().eq('id', projectId);
      if (error) console.error('[jam] 빈 프로젝트 삭제 실패', projectId, error);
    };

    // 2) 파일 — <프로젝트>/<내 id>/<시각>.wav : 두 번째 폴더가 내 id라 실패 시 지울 수 있다(stems_auth_delete)
    const path = `${projectId}/${user.id}/${Date.now()}.wav`;
    const { error: storageErr } = await supabase.storage.from('stems').upload(path, wav, { contentType: 'audio/wav' });
    if (storageErr) {
      console.error('[jam] 저장소 업로드 실패', storageErr);
      await dropProject();
      return fail('storage', t('업로드 실패: {message}', { message: storageErr.message }));
    }
    const { data: urlData } = supabase.storage.from('stems').getPublicUrl(path);

    // 3) 트랙(section 1, 첫 주자)
    track('challenge_upload_start', { project_id: projectId, track_order: 1, source: 'backing_jam' });
    const { error: trackErr } = qaFail === 'track'
      ? { error: { message: 'QA: 트랙 저장 실패 흉내' } }
      : await supabase.from('stem_tracks').insert({
          project_id: projectId,
          user_id: user.id,
          user_name: userName,
          user_emoji: '🎵',
          file_url: urlData.publicUrl,
          youtube_url: null,
          instrument: instrument || null,
          track_order: 1,
          section: 1,
        });
    if (trackErr) {
      console.error('[jam] 트랙 저장 실패', trackErr);
      const { error: removeErr } = await supabase.storage.from('stems').remove([path]);
      if (removeErr) console.error('[jam] 올라간 파일 삭제 실패', path, removeErr);
      await dropProject();
      return fail('track', t('트랙 저장 실패: {message}', { message: trackErr.message }), removeErr ? path : undefined);
    }

    // 성공: 기존 8마디 흐름과 같은 기록(생성 + 첫 업로드 = 패스 1회)
    track('challenge_create_complete', { project_id: projectId, genre: GENRE[combo.style.slug], bpm: take.bpm, key_signature: keyName });
    incrementUserProperty('challenge_created_count');
    track('challenge_upload_complete', { project_id: projectId, track_order: 1, source: 'backing_jam', section: 1, has_instrument: !!instrument });
    incrementUserProperty('stem_track_count');
    void supabase.rpc('increment_pass_count', { p_project_id: projectId });
    track('jam_upload_done', { slug, project_id: projectId });
    await clearPendingTake();
    router.push(`/stems/${projectId}?uploaded=1`);
  }

  const busy = rec.phase === 'preparing' || rec.phase === 'countin' || rec.phase === 'recording';

  return (
    <section className={`${CARD} p-5 space-y-4`} style={SHADOW} aria-label={t('내 테이크')}>
      <div>
        <h2 className="text-[16px] font-bold text-[#0A0A0A]">🎙 {t('반주 위에 녹음해서 8마디로 올리기')}</h2>
        <p className="mt-1 text-[13px] font-bold text-[#0A0A0A]/70 break-keep">{t('이어폰을 끼면 반주가 녹음에 섞이지 않아요')}</p>
      </div>

      {busy ? (
        <div className="space-y-3 text-center">
          <p className="font-bungee text-[40px] leading-none text-[#FF3D77]">
            {rec.phase === 'preparing' ? '…' : rec.phase === 'countin' ? rec.countNumber || 4 : `${rec.currentBar}/${TAKE_BARS}`}
          </p>
          <p className="text-[13px] font-bold text-[#0A0A0A]/60">
            {rec.phase === 'preparing' ? t('마이크 준비 중') : rec.phase === 'countin' ? t('카운트인... 준비하세요!') : t('녹음 중 — 8마디 뒤 자동으로 멈춰요')}
          </p>
          <div className="flex gap-1" aria-hidden>
            {Array.from({ length: TAKE_BARS }, (_, i) => (
              <span key={i} className={`h-2 flex-1 rounded-full border-[2px] border-[#0A0A0A] ${i < rec.currentBar ? 'bg-[#FF3D77]' : 'bg-white'}`} />
            ))}
          </div>
          <button
            type="button"
            onClick={() => rec.cancel(true)}
            className="min-h-[44px] px-4 rounded-[12px] border-[3px] border-[#0A0A0A] bg-[#0A0A0A] text-white text-[13px] font-bold"
          >
            ■ {t('중단')}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={startRecord}
          disabled={uploading}
          className="w-full min-h-[56px] rounded-[16px] border-[3px] border-[#0A0A0A] bg-white text-[17px] font-bold text-[#0A0A0A] disabled:opacity-40"
          style={SHADOW}
        >
          🎙 {take ? t('다시 녹음') : t('내 테이크 녹음')}
        </button>
      )}
      {rec.phase === 'error' && rec.error && <p className="text-[13px] font-bold text-[#FF3D77] whitespace-pre-line">⚠️ {rec.error}</p>}

      {take && !busy && (
        <div className="space-y-4 border-t-[2px] border-dashed border-[#0A0A0A]/20 pt-4">
          {restored && <p className="text-[13px] font-bold text-[#41C66B]">✅ {t('로그인 전에 녹음한 테이크를 되찾았어요. 다시 [올리기]를 눌러 주세요.')}</p>}
          <p className="text-[12px] font-bold text-[#0A0A0A]/60">
            {t('녹음 설정: {bpm} BPM', { bpm: take.bpm })}
          </p>
          <button
            type="button"
            onClick={playPreview}
            aria-pressed={previewing}
            className="w-full min-h-[52px] rounded-[16px] border-[3px] border-[#0A0A0A] bg-[#4FC3F7] text-[16px] font-bold text-[#0A0A0A]"
            style={SHADOW}
          >
            {previewing ? `■ ${t('정지')}` : `▶ ${t('반주와 같이 듣기')}`}
          </button>

          <div>
            <label htmlFor="jam-offset" className="flex items-baseline justify-between text-[14px] font-bold text-[#0A0A0A]">
              <span>{t('싱크 조절')}</span>
              <span>
                <span className="font-bungee text-[18px]">{offsetMs > 0 ? `+${offsetMs}` : offsetMs}</span> ms
              </span>
            </label>
            <div className="mt-2 flex items-center gap-2">
              <button type="button" onClick={() => nudgeOffset(-OFFSET_STEP_MS)} className="w-11 h-11 shrink-0 rounded-[12px] border-[3px] border-[#0A0A0A] bg-white font-bold" aria-label={t('테이크 당기기')}>
                −
              </button>
              <input
                id="jam-offset"
                type="range"
                min={OFFSET_MIN_MS}
                max={OFFSET_MAX_MS}
                step={OFFSET_STEP_MS}
                value={offsetMs}
                onChange={(e) => changeOffset(Number(e.target.value))}
                className="flex-1 min-w-0 h-11 accent-[#FF3D77]"
              />
              <button type="button" onClick={() => nudgeOffset(OFFSET_STEP_MS)} className="w-11 h-11 shrink-0 rounded-[12px] border-[3px] border-[#0A0A0A] bg-white font-bold" aria-label={t('테이크 늦추기')}>
                +
              </button>
            </div>
            <p className="mt-1 text-[12px] text-[#0A0A0A]/60 break-keep">{t('들으면서 맞춰 보세요. 내 연주가 반주보다 늦게 들리면 −, 빠르게 들리면 +')}</p>
          </div>

          <div>
            <label htmlFor="jam-backing-gain" className="flex items-baseline justify-between text-[14px] font-bold text-[#0A0A0A]">
              <span>{t('반주 음량')}</span>
              <span>{Math.round(backingGain * 100)}%</span>
            </label>
            <input id="jam-backing-gain" type="range" min={0} max={200} step={5} value={Math.round(backingGain * 100)} onChange={(e) => changeBackingGain(Number(e.target.value) / 100)} className="mt-2 w-full h-11 accent-[#FF3D77]" />
          </div>

          <div>
            <label htmlFor="jam-gain" className="flex items-baseline justify-between text-[14px] font-bold text-[#0A0A0A]">
              <span>{t('내 테이크 음량')}</span>
              <span>{Math.round(gain * 100)}%</span>
            </label>
            <input id="jam-gain" type="range" min={0} max={200} step={5} value={Math.round(gain * 100)} onChange={(e) => changeGain(Number(e.target.value) / 100)} className="mt-2 w-full h-11 accent-[#FF3D77]" />
          </div>

          <div>
            <p className="text-[14px] font-bold text-[#0A0A0A]">{t('악기')}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {INSTRUMENTS.map((inst) => (
                <button
                  key={inst}
                  type="button"
                  onClick={() => setInstrument(instrument === inst ? '' : inst)}
                  aria-pressed={instrument === inst}
                  className={`min-h-[44px] px-3 rounded-[10px] border-[2px] border-[#0A0A0A] text-[13px] font-bold ${instrument === inst ? 'bg-[#4FC3F7]' : 'bg-white'}`}
                >
                  {t(inst)}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={upload}
            disabled={uploading}
            className="w-full min-h-[56px] rounded-[16px] border-[3px] border-[#0A0A0A] bg-[#FF3D77] text-white text-[17px] font-bold disabled:opacity-60"
            style={SHADOW}
          >
            {uploading ? t('올리는 중…') : user ? `⬆️ ${t('8마디로 올리기')}` : `⬆️ ${t('로그인하고 8마디로 올리기')}`}
          </button>
          {!user && <p className="text-[12px] text-[#0A0A0A]/60 break-keep">{t('녹음은 이 브라우저에만 잠시 보관돼요(24시간). 로그인하고 돌아오면 이어서 올릴 수 있어요.')}</p>}
        </div>
      )}
      {message && <p role="status" className="text-[13px] font-bold text-[#FF3D77] break-keep">{message}</p>}
    </section>
  );
}
