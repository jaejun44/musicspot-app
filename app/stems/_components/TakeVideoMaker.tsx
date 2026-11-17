'use client';

import { useEffect, useRef, useState } from 'react';
import type { StemProject } from '@/types/stem';
import { useT } from '@/lib/i18n';
import { createAudioContext, resumeContext, loadTracksAligned } from '@/lib/ensemble-audio';
import { renderProjectBacking, resolveJamBacking } from '@/lib/jam/backing';
import { keyLabel } from '@/lib/jam/catalog';
import { chordName } from '@/lib/jam/engine';
import { computeTimeline } from '@/lib/takevideo/timeline';
import { mixSection, computeLevels } from '@/lib/takevideo/mix';
import { recordTakeVideo, TakeVideoError } from '@/lib/takevideo/render';
import { pickTakeVideoMime, takeVideoFileName } from '@/lib/takevideo/support';
import type { Participant, TakeVideoLabels, TakeVideoMeta } from '@/lib/takevideo/draw';

/**
 * 테이크 공유 영상 만들기 — 섹션 1(반주 포함)을 9:16 mp4로. 기기에서만 만들고 서버에 올리지 않는다.
 * mp4 녹화가 안 되는 기기는 버튼 자체를 숨긴다(기존 링크 공유는 그대로).
 * (최소 버전 2026-11-17: 만들기 → 저장만. 공유·복사 문구·이벤트는 실기기 확인 뒤)
 */

export interface VideoTrack {
  file_url: string;
  user_id: string | null;
  user_name: string;
  user_emoji: string;
  instrument: string | null;
}

type Phase =
  | { kind: 'idle' }
  | { kind: 'working'; step: 'load' | 'record'; progress: number }
  | { kind: 'done'; url: string; file: File; mimeType: string }
  | { kind: 'failed'; message: string };

export default function TakeVideoMaker({ project, sectionTracks }: { project: StemProject; sectionTracks: VideoTrack[] }) {
  const t = useT();
  const [mime, setMime] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    setMime(pickTakeVideoMime());
    return () => {
      abortRef.current?.abort();
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, []);

  if (!mime || sectionTracks.length === 0) return null;

  function clearResult() {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
  }

  async function make() {
    if (!mime) return;
    clearResult();
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setPhase({ kind: 'working', step: 'load', progress: 0 });
    // 아이폰: 터치 안에서 만들고 resume해야 소리가 난다
    const ctx = createAudioContext();
    let handedOff = false;
    try {
      await resumeContext(ctx);
      const decoded = await loadTracksAligned(sectionTracks.map((tr) => tr.file_url), ctx);
      const takes = decoded.filter((b): b is AudioBuffer => !!b);
      if (takes.length === 0) throw new TakeVideoError('load', 'error', '트랙을 불러오지 못함');
      const resolved = resolveJamBacking(project);
      const backing = resolved ? await renderProjectBacking(project) : null;
      if (ac.signal.aborted) throw new TakeVideoError('load', 'cancel', '취소됨');
      const audioSec = Math.max(...takes.map((b) => b.duration), backing?.duration ?? 0);
      const timeline = computeTimeline(audioSec, resolved ? resolved.spec.bpm : null);
      const input = { backing, takes, timeline };
      const mixed = await mixSection(input).catch((e) => {
        throw new TakeVideoError('mix', 'error', e instanceof Error ? e.message : String(e));
      });
      const levels = computeLevels(input);
      if (ac.signal.aborted) throw new TakeVideoError('mix', 'cancel', '취소됨');

      const seen = new Set<string>();
      const people: Participant[] = [];
      for (const tr of sectionTracks) {
        const k = tr.user_id ?? tr.user_name;
        if (seen.has(k)) continue;
        seen.add(k);
        people.push({ name: tr.user_name, emoji: tr.user_emoji, instrument: tr.instrument ? t(tr.instrument) : null });
      }
      const meta: TakeVideoMeta = {
        title: project.title,
        infoLine: resolved
          ? `${keyLabel(resolved.combo.key)} · ${t(resolved.combo.style.label)} · ${resolved.spec.bpm} BPM`
          : [project.key_signature, project.genre, project.bpm ? `${project.bpm} BPM` : null].filter(Boolean).join(' · ') || null,
        chords: resolved ? resolved.spec.chords.map(chordName) : null,
        people,
        timeline,
      };
      const labels: TakeVideoLabels = {
        challenge: t('8마디 챌린지'),
        backing: t('반주'),
        take: t('연주'),
        next: t('다음 코드'),
        bar: t('마디'),
        morePeople: (n) => t('외 {count}명', { count: n }),
        endTitle: resolved ? t('이 반주로 나도 치기') : t('이 8마디에 나도 이어 치기'),
        url: resolved ? 'musicspotfest.com/jam' : 'musicspotfest.com/stems',
      };

      const canvas = canvasRef.current;
      if (!canvas) throw new TakeVideoError('record', 'error', '캔버스 없음');
      setPhase({ kind: 'working', step: 'record', progress: 0 });
      handedOff = true; // 여기부터 ctx는 recordTakeVideo가 닫는다
      const res = await recordTakeVideo({
        ctx,
        canvas,
        mixed,
        meta,
        levels,
        labels,
        mimeType: mime,
        signal: ac.signal,
        monitor: true,
        onProgress: (p) => setPhase((cur) => (cur.kind === 'working' ? { ...cur, progress: p } : cur)),
      });
      const file = new File([res.blob], takeVideoFileName(project.id), { type: res.blob.type || 'video/mp4' });
      const url = URL.createObjectURL(file);
      urlRef.current = url;
      setPhase({ kind: 'done', url, file, mimeType: res.mimeType });
    } catch (e) {
      const err = e instanceof TakeVideoError ? e : new TakeVideoError('load', 'error', e instanceof Error ? e.message : String(e));
      if (err.reason === 'cancel') {
        setPhase({ kind: 'idle' });
        return;
      }
      console.error('[takevideo] 만들기 실패', err.stage, err.reason, err.message);
      setPhase({
        kind: 'failed',
        message: err.reason === 'hidden' ? t('만드는 동안 화면을 켜 두어야 해요. 다시 만들어 주세요.') : t('영상을 만들지 못했어요. 다시 시도해 주세요.'),
      });
    } finally {
      if (!handedOff) await ctx.close().catch((err) => console.warn('[takevideo] AudioContext 닫기 실패', err));
      if (abortRef.current === ac) abortRef.current = null;
    }
  }

  function cancel() {
    abortRef.current?.abort();
  }

  function close() {
    cancel();
    clearResult();
    setPhase({ kind: 'idle' });
    setOpen(false);
  }

  async function saveToPhotos(file: File) {
    try {
      await navigator.share({ files: [file] });
    } catch (e) {
      if ((e as Error).name !== 'AbortError') console.error('[takevideo] 공유 시트 실패', e);
    }
  }

  const canShareFile = (file: File) => {
    try {
      return typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });
    } catch {
      return false;
    }
  };

  const btn = 'min-h-[44px] w-full rounded-[12px] border-[3px] border-[#0A0A0A] text-[14px] font-bold';

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`mt-3 ${btn} bg-white text-[#0A0A0A]`}
        style={{ boxShadow: '4px 4px 0 #0A0A0A', fontFamily: 'Pretendard, sans-serif' }}
      >
        🎬 {t('영상 만들기')}
      </button>

      {open && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#0A0A0A]/40 px-4" role="dialog" aria-modal="true" aria-label={t('영상 만들기')}>
          <div
            className="w-full max-w-[360px] max-h-[92vh] overflow-y-auto rounded-[20px] border-[3px] border-[#0A0A0A] bg-[#FFF8F0] p-4"
            style={{ boxShadow: '4px 4px 0 #0A0A0A', fontFamily: 'Pretendard, sans-serif' }}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-[16px] font-bold text-[#0A0A0A]">🎬 {t('영상 만들기')}</h2>
              <button type="button" onClick={close} className="min-h-[44px] min-w-[44px] text-[20px] font-bold" aria-label={t('닫기')}>
                ✕
              </button>
            </div>

            <div className="mt-2 flex justify-center">
              {phase.kind === 'done' ? (
                <video src={phase.url} controls playsInline className="w-[180px] rounded-[12px] border-[2px] border-[#0A0A0A]" />
              ) : (
                <canvas ref={canvasRef} width={1080} height={1920} className="w-[180px] rounded-[12px] border-[2px] border-[#0A0A0A] bg-white" />
              )}
            </div>

            {phase.kind === 'idle' && (
              <div className="mt-3 space-y-2">
                <p className="text-[13px] text-[#0A0A0A]/70">{t('9:16 영상(45초 이하)을 이 기기에서 만들어요. 만드는 동안 소리가 나고, 화면을 켜 두어야 해요.')}</p>
                <button type="button" onClick={make} className={`${btn} bg-[#FF3D77] text-white`} style={{ boxShadow: '3px 3px 0 #0A0A0A' }}>
                  {t('만들기 시작')}
                </button>
              </div>
            )}

            {phase.kind === 'working' && (
              <div className="mt-3 space-y-2">
                <p role="status" className="text-[13px] font-bold text-[#0A0A0A]">
                  {phase.step === 'load' ? t('소리 준비 중…') : t('영상 만드는 중… {pct}%', { pct: Math.round(phase.progress * 100) })}
                </p>
                <div className="h-3 w-full overflow-hidden rounded-full border-[2px] border-[#0A0A0A] bg-white">
                  <div className="h-full bg-[#FF3D77]" style={{ width: `${Math.round(phase.progress * 100)}%` }} />
                </div>
                <button type="button" onClick={cancel} className={`${btn} bg-white text-[#0A0A0A]`}>
                  {t('취소')}
                </button>
              </div>
            )}

            {phase.kind === 'done' && (
              <div className="mt-3 space-y-2">
                {canShareFile(phase.file) && (
                  <button type="button" onClick={() => saveToPhotos(phase.file)} className={`${btn} bg-[#FF3D77] text-white`} style={{ boxShadow: '3px 3px 0 #0A0A0A' }}>
                    {t('사진 앱에 저장 · 공유')}
                  </button>
                )}
                <a href={phase.url} download={phase.file.name} className={`${btn} flex items-center justify-center bg-white text-[#0A0A0A]`}>
                  {t('파일로 저장')}
                </a>
                <p className="text-[12px] text-[#0A0A0A]/60">
                  {(phase.file.size / 1024 / 1024).toFixed(1)}MB · {phase.mimeType}
                </p>
                <button type="button" onClick={make} className={`${btn} bg-white text-[#0A0A0A]`}>
                  {t('다시 만들기')}
                </button>
              </div>
            )}

            {phase.kind === 'failed' && (
              <div className="mt-3 space-y-2">
                <p role="alert" className="text-[13px] font-bold text-[#FF3D77]">
                  {phase.message}
                </p>
                <button type="button" onClick={make} className={`${btn} bg-[#FF3D77] text-white`}>
                  {t('다시 만들기')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
