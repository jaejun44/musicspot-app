'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Upload, Mic, Square, Video, Guitar, Play, Pause } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import JamRecorder, { type JamMode } from './JamRecorder';
import { INSTRUMENTS } from '@/lib/instruments';
import AudioTrimmer, { type TrimHandle } from './AudioTrimmer';
import { acquireMic } from '@/lib/mic';
import { createAudioContext, resumeContext, loadTracks, loadTracksAligned, playEnsemble, playSequence, type EnsembleHandle, type MixHandle } from '@/lib/ensemble-audio';
import { encodeWavMono16, layerMix, mixToMono, normalizeTake, peakLinear, LAYER_BASE_MIN } from '@/lib/jam/take';
import { useT } from '@/lib/i18n';
import { track, incrementUserProperty } from '@/lib/analytics';
import { TRACK_UPLOAD_SCORE } from '@/lib/challenge-score';
import { requestPushNotify } from '@/lib/push';

/** Storage에 실제로 올라가는 파일(잘라낸 8마디 또는 녹음물)의 상한. */
const MAX_UPLOAD_BYTES = 30 * 1024 * 1024;
/** 브라우저에서 구간을 잘라내기 위해 받아들이는 원본 파일의 상한. */
const MAX_SOURCE_BYTES = 100 * 1024 * 1024;
const ALLOWED_EXTS = ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'];

type UploadMode = 'file' | 'record' | 'youtube' | 'jam';

/**
 * 유튜브 링크로 올리기 표시 여부 (2026-11-17 숨김 — 사용자 결정).
 * 운영 stem_tracks.file_url이 NOT NULL이라 링크 업로드(file_url: null)는 항상 실패한다.
 * 되살리려면 스키마 변경(file_url NULL 허용)과 합주 재생에서 링크 트랙을 어떻게 다룰지 설계가 먼저 필요하다.
 * 코드는 그대로 두고 이 값만 true로 바꾸면 다시 보인다. 이미 올라온 링크 트랙의 재생·표시는 이 값과 무관.
 * 응답 5단계(docs/STRATEGY.md)의 녹음 응답은 파일·녹음·함께로 그대로 남는다.
 */
export const YOUTUBE_UPLOAD_ENABLED = false;

const UPLOAD_MODES: UploadMode[] = YOUTUBE_UPLOAD_ENABLED ? ['jam', 'file', 'record', 'youtube'] : ['jam', 'file', 'record'];

export function extractYoutubeId(url: string): string | null {
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/
  );
  return match?.[1] ?? null;
}

interface Props {
  user: User;
  projectId: string;
  trackOrder: number;
  onUploaded: () => void;
  /** 프로젝트 BPM — JAM(함께 연주) 카운트인·8마디 길이 계산용. */
  bpm?: number;
  /** 가장 최근 섹션 번호(0이면 트랙 없음). 새 트랙의 section 계산용. */
  latestSection?: number;
  /** 최근 섹션의 오디오 URL — 쌓기 모드에서 반주로 깔고, 쌓기 미리듣기에 사용. */
  layerBackingUrls?: string[];
  /** 섹션 순서대로 묶은 전체 오디오 URL — 이어붙이기 미리듣기(전곡+내 트랙)에 사용. */
  orderedSectionUrls?: string[][];
  /** 백킹 잼 프로젝트의 반주 8마디(합성). 녹음·미리듣기에서 섹션마다 깐다. 없으면 기존과 같음 */
  jamBacking?: () => Promise<AudioBuffer | null>;
  /** 처음 열 때 고를 방식. 최근 테이크의 [이어 치기]로 들어오면 'jam'(함께) */
  initialMode?: UploadMode;
}

/** 함께 녹음 테이크: 음량 맞춘 모노 샘플(모든 8마디 프로젝트, 2026-11-16 사용자 결정) */
interface LayerTake {
  samples: Float32Array;
  sampleRate: number;
  peak: number;
}

async function decodeLayerTake(blob: Blob): Promise<LayerTake | null> {
  const ctx = createAudioContext();
  try {
    const buf = await ctx.decodeAudioData(await blob.arrayBuffer());
    const mono = mixToMono(Array.from({ length: buf.numberOfChannels }, (_, i) => buf.getChannelData(i)));
    const norm = normalizeTake(mono);
    if (!norm) return null;
    return { samples: norm.samples, sampleRate: buf.sampleRate, peak: peakLinear(norm.samples) };
  } finally {
    void ctx.close().catch(() => {});
  }
}

export default function TrackUploadPanel({
  user,
  projectId,
  trackOrder,
  onUploaded,
  bpm = 90,
  latestSection = 0,
  layerBackingUrls = [],
  orderedSectionUrls = [],
  jamBacking,
  initialMode = 'file',
}: Props) {
  const t = useT();
  const [uploadMode, setUploadMode] = useState<UploadMode>(initialMode);
  // 트랙 목록을 읽은 뒤에야 'jam'이 정해진다 — 그때 한 번 따라간다(사용자가 이미 고른 뒤엔 initialMode가 다시 안 바뀜)
  useEffect(() => {
    setUploadMode(initialMode);
  }, [initialMode]);
  const [file, setFile] = useState<File | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  // 함께 녹음: 음량 맞춘 테이크 + 두 음량(기존 합주·내 연주)
  const [layerTake, setLayerTake] = useState<LayerTake | null>(null);
  const [baseGain, setBaseGain] = useState(1);
  const [mineGain, setMineGain] = useState(1);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [instrument, setInstrument] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  /** 브라우저가 이 파일을 디코드하지 못하면 트리밍을 포기하고 원본을 그대로 올린다. */
  const [trimUnavailable, setTrimUnavailable] = useState(false);
  const trimRef = useRef<TrimHandle>(null);

  const handleDecodeFailed = useCallback(
    (message: string) => {
      setTrimUnavailable(true);
      // 편집도 못 하고 원본이 업로드 상한도 넘으면, 업로드 버튼을 누르기 전에 알려준다.
      setUploadError(
        file && file.size > MAX_UPLOAD_BYTES
          ? t('이 파일은 브라우저에서 편집할 수 없고 30MB가 넘어요. 8마디로 잘라서 올려주세요.')
          : message
      );
    },
    [file, t]
  );

  /** 파일 선택·드롭 공통 진입점. 확장자·용량을 즉시 검증한다. */
  const selectFile = (picked: File | null | undefined) => {
    if (!picked) return;

    const ext = picked.name.split('.').pop()?.toLowerCase() ?? '';
    if (!picked.type.startsWith('audio/') && !ALLOWED_EXTS.includes(ext)) {
      setFile(null);
      setUploadError(t('오디오 파일만 올릴 수 있습니다.'));
      return;
    }

    if (picked.size > MAX_SOURCE_BYTES) {
      setFile(null);
      setUploadError(t('파일 크기는 100MB 이하여야 합니다.'));
      return;
    }

    setTrimUnavailable(false);
    setFile(picked);
    setUploadError('');
  };

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  // JAM 녹음 모드(쌓기/이어붙이기) — onRecorded 시점에 확정, 업로드 section 계산에 사용
  const [jamMode, setJamMode] = useState<JamMode>('extend');

  // 새 트랙의 섹션 번호 계산: 트랙 없으면 1, 쌓기=최근섹션, 이어붙이기=최근섹션+1
  function sectionFor(m: JamMode): number {
    if (latestSection <= 0) return 1;
    return m === 'layer' ? latestSection : latestSection + 1;
  }

  // JAM 합주 미리듣기 (반주 + 방금 녹음 동시 재생)
  const [jamPreviewState, setJamPreviewState] = useState<'idle' | 'loading' | 'playing'>('idle');
  const jamCtxRef = useRef<AudioContext | null>(null);
  const jamHandleRef = useRef<EnsembleHandle | MixHandle | null>(null);
  const jamTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function stopJamPreview() {
    if (jamTimerRef.current) { clearTimeout(jamTimerRef.current); jamTimerRef.current = null; }
    jamHandleRef.current?.stop();
    jamHandleRef.current = null;
    if (jamCtxRef.current) { try { void jamCtxRef.current.close(); } catch { /* 무시 */ } jamCtxRef.current = null; }
    setJamPreviewState('idle');
  }

  async function toggleJamPreview() {
    if (jamPreviewState !== 'idle') { stopJamPreview(); return; }
    const myUrl = previewUrlRef.current;
    if (!myUrl) return;
    setJamPreviewState('loading');
    const ctx = createAudioContext();
    jamCtxRef.current = ctx;
    await resumeContext(ctx);

    // 함께 녹음: 내 연주는 음량 맞춘 샘플로, "기존"·"내 연주" 두 버스로 나눠 재생(슬라이더 즉시 반영)
    let mineBuf: AudioBuffer | null = null;
    if (layerTake) {
      mineBuf = ctx.createBuffer(1, layerTake.samples.length, layerTake.sampleRate);
      mineBuf.getChannelData(0).set(layerTake.samples);
    }
    const mix = mineBuf && layerTake ? layerMix(baseGain, mineGain, layerTake.peak) : null;
    const mixOpts = mineBuf && mix ? { mine: mineBuf, baseGain: mix.previewBase, mineGain: mix.previewMine } : null;

    let totalDur = 0;
    if (jamMode === 'layer') {
      // 쌓기: 최근 섹션 반주 + 내 트랙을 동시 재생
      const buffers = await loadTracks(mineBuf ? layerBackingUrls : [...layerBackingUrls, myUrl], ctx);
      if (mineBuf) buffers.push(mineBuf);
      const jam = jamBacking ? await jamBacking() : null;
      if (jam) buffers.unshift(jam);
      if (jamCtxRef.current !== ctx) return;
      if (buffers.length === 0) { stopJamPreview(); return; }
      jamHandleRef.current = mixOpts ? playSequence([buffers], ctx, ctx.currentTime + 0.1, mixOpts) : playEnsemble(buffers, ctx, ctx.currentTime + 0.1);
      totalDur = Math.max(...buffers.map((b) => b.duration));
    } else {
      // 이어붙이기: 기존 전곡(섹션 순서대로) 다음에 내 트랙을 이어 재생
      const flat = orderedSectionUrls.flat();
      const aligned = await loadTracksAligned(mineBuf ? flat : [...flat, myUrl], ctx);
      if (mineBuf) aligned.push(mineBuf);
      if (jamCtxRef.current !== ctx) return;
      // aligned 를 섹션 구조 + 마지막 내 트랙으로 재구성 (실패분 제외)
      let i = 0;
      const sections: AudioBuffer[][] = orderedSectionUrls.map((s) =>
        s.map(() => aligned[i++]).filter((b): b is AudioBuffer => !!b)
      );
      const mine = aligned[i];
      if (mine) sections.push([mine]);
      // 백킹 잼 프로젝트: 섹션마다 같은 8마디 반주
      const jam = jamBacking ? await jamBacking() : null;
      if (jam) sections.forEach((sec) => sec.unshift(jam));
      if (jamCtxRef.current !== ctx) return;
      const flatCount = sections.reduce((n, s) => n + s.length, 0);
      if (flatCount === 0) { stopJamPreview(); return; }
      jamHandleRef.current = mixOpts ? playSequence(sections, ctx, ctx.currentTime + 0.1, mixOpts) : playSequence(sections, ctx, ctx.currentTime + 0.1);
      totalDur = sections.reduce((sum, s) => sum + Math.max(0, ...s.map((b) => b.duration)), 0);
    }

    setJamPreviewState('playing');
    jamTimerRef.current = setTimeout(() => stopJamPreview(), (totalDur + 0.3) * 1000);
  }

  // unmount 시 합주 미리듣기 정리
  useEffect(() => () => stopJamPreview(), []);

  const userName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split('@')[0] ||
    '익명';

  function setPreview(url: string | null) {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = url;
    setPreviewUrl(url);
  }

  function switchMode(mode: UploadMode) {
    if (mode === uploadMode) return;
    if (isRecording) stopRecording();
    stopJamPreview();
    setFile(null);
    setRecordedBlob(null);
    setPreview(null);
    setYoutubeUrl('');
    setUploadError('');
    setUploadMode(mode);
  }

  async function startRecording() {
    setUploadError('');
    const mic = await acquireMic();
    if ('error' in mic) {
      setUploadError(mic.error);
      return;
    }
    try {
      const stream = mic.stream;
      streamRef.current = stream;
      audioChunksRef.current = [];
      setRecordedBlob(null);
      setPreview(null);

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : '';

      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mr;

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mr.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setRecordedBlob(blob);
        setPreview(URL.createObjectURL(blob));
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      };

      mr.start(250);
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((t) => t + 1);
      }, 1000);
    } catch {
      mic.stream.getTracks().forEach((t) => t.stop());
      setUploadError(t('녹음을 시작할 수 없어요. 브라우저가 이 형식의 녹음을 지원하는지 확인해주세요.'));
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  const youtubeId = extractYoutubeId(youtubeUrl);

  const canSubmit =
    uploadMode === 'file'
      ? !!file
      : uploadMode === 'record' || uploadMode === 'jam'
      ? !!recordedBlob
      : !!youtubeId;

  async function handleUpload() {
    if (!canSubmit || uploading) return;
    setUploadError('');
    setUploading(true);

    // JAM은 녹음 시 고른 모드, 그 외 업로드는 이어붙이기(새 섹션)로 곡 확장
    const section = sectionFor(uploadMode === 'jam' ? jamMode : 'extend');

    // start/complete를 쌍으로 남겨야 "업로드 시도했는데 실패한 비율"이 보인다.
    // 8마디는 파일이 크고 모바일 네트워크에서 자주 끊기므로 이 비율이 이탈의 주범.
    track('challenge_upload_start', { project_id: projectId, track_order: trackOrder, source: uploadMode });

    const trackUploaded = () => {
      track('challenge_upload_complete', {
        project_id: projectId,
        track_order: trackOrder,
        source: uploadMode,
        section,
        has_instrument: instrument.trim().length > 0,
      });
      incrementUserProperty('stem_track_count');
    };

    if (uploadMode === 'youtube') {
      const { data: inserted, error } = await supabase.from('stem_tracks').insert({
        project_id: projectId,
        user_id: user.id,
        user_name: userName,
        user_emoji: '🎬',
        file_url: null,
        youtube_url: `https://www.youtube.com/watch?v=${youtubeId}`,
        instrument: instrument.trim() || null,
        track_order: trackOrder,
        section,
        challenge_score: TRACK_UPLOAD_SCORE,
      }).select('id').single();

      if (error) {
        track('challenge_upload_fail', { project_id: projectId, source: uploadMode, reason: 'insert_error' });
        setUploadError(t('트랙 저장 실패: {message}', { message: error.message }));
        setUploading(false);
        return;
      }

      trackUploaded();
      requestPushNotify('track_reply', inserted.id);
      setYoutubeUrl('');
      setInstrument('');
      setUploading(false);
      onUploaded();
      return;
    }

    // 파일 모드에서는 선택한 8마디 구간만 WAV로 잘라 올린다.
    // 디코드 실패(브라우저가 못 여는 코덱)면 트리머가 뜨지 않으므로 원본을 그대로 보낸다.
    const trimmed = uploadMode === 'file' ? trimRef.current?.exportTrimmed() ?? null : null;

    let source: File | Blob;
    let ext: string;
    let contentType: string;

    if (uploadMode === 'file') {
      source = trimmed ?? file!;
      ext = trimmed ? 'wav' : file!.name.split('.').pop() ?? 'mp3';
      contentType = trimmed ? 'audio/wav' : file!.type;
    } else if (uploadMode === 'jam' && layerTake) {
      // 함께 녹음: 음량 맞춤 × (내 연주/기존) 비율을 곱한 16bit WAV — 미리듣기와 같은 균형
      const { ratio } = layerMix(baseGain, mineGain, layerTake.peak);
      const out = new Float32Array(layerTake.samples.length);
      for (let i = 0; i < out.length; i++) out[i] = layerTake.samples[i] * ratio;
      source = new Blob([encodeWavMono16(out, layerTake.sampleRate)], { type: 'audio/wav' });
      ext = 'wav';
      contentType = 'audio/wav';
    } else {
      source = recordedBlob!;
      ext = 'webm';
      contentType = 'audio/webm';
    }

    if (source.size > MAX_UPLOAD_BYTES) {
      track('challenge_upload_fail', { project_id: projectId, source: uploadMode, reason: 'size_limit' });
      setUploadError(t('파일 크기는 30MB 이하여야 합니다.'));
      setUploading(false);
      return;
    }

    const path = `${projectId}/${user.id}_${Date.now()}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from('stems')
      .upload(path, source, { contentType });

    if (uploadErr) {
      track('challenge_upload_fail', { project_id: projectId, source: uploadMode, reason: 'storage_error' });
      setUploadError(t('업로드 실패: {message}', { message: uploadErr.message }));
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from('stems').getPublicUrl(path);

    const { data: inserted, error: insertErr } = await supabase.from('stem_tracks').insert({
      project_id: projectId,
      user_id: user.id,
      user_name: userName,
      user_emoji: '🎵',
      file_url: urlData.publicUrl,
      youtube_url: null,
      instrument: instrument.trim() || null,
      track_order: trackOrder,
      section,
      challenge_score: TRACK_UPLOAD_SCORE,
    }).select('id').single();

    if (insertErr) {
      track('challenge_upload_fail', { project_id: projectId, source: uploadMode, reason: 'insert_error' });
      setUploadError(t('트랙 저장 실패: {message}', { message: insertErr.message }));
      setUploading(false);
      return;
    }

    trackUploaded();
    requestPushNotify('track_reply', inserted.id);
    setFile(null);
    setTrimUnavailable(false);
    setRecordedBlob(null);
    setLayerTake(null);
    setPreview(null);
    setInstrument('');
    setUploading(false);
    onUploaded();
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Mode toggle */}
      <div
        className="flex rounded-[12px] border-[2px] border-[#0A0A0A] overflow-hidden"
        style={{ boxShadow: '2px 2px 0 #0A0A0A' }}
      >
        {UPLOAD_MODES.map((mode) => (
          <button
            key={mode}
            onClick={() => switchMode(mode)}
            className={[
              'flex-1 flex items-center justify-center gap-1 py-2.5 text-[12px] font-bold transition-colors',
              uploadMode === mode
                ? 'bg-[#0A0A0A] text-white'
                : 'bg-white text-[#0A0A0A]/50 hover:bg-[#0A0A0A]/5',
            ].join(' ')}
            style={{ fontFamily: 'Pretendard, sans-serif' }}
          >
            {mode === 'jam' ? (
              <><Guitar className="w-3 h-3" /> {t('함께')}</>
            ) : mode === 'file' ? (
              <><Upload className="w-3 h-3" /> {t('파일')}</>
            ) : mode === 'record' ? (
              <><Mic className="w-3 h-3" /> {t('녹음')}</>
            ) : (
              <><Video className="w-3 h-3" /> {t('유튜브')}</>
            )}
          </button>
        ))}
      </div>

      {/* JAM MODE — 놀이형 동시 녹음 */}
      {uploadMode === 'jam' && (
        recordedBlob ? (
          <div className="flex flex-col items-center gap-3 p-5 bg-white rounded-[16px] border-[3px] border-dashed border-[#41C66B]">
            <div className="w-12 h-12 rounded-full bg-[#41C66B]/20 border-[3px] border-[#41C66B] flex items-center justify-center">
              <span className="text-[22px]">✅</span>
            </div>
            <p className="text-[12px] font-bold text-[#41C66B]" style={{ fontFamily: 'Pretendard, sans-serif' }}>
              {t('합주 녹음 완료!')}
            </p>

            {/* 결과 미리듣기 — 쌓기: 반주+내 연주 동시 / 이어붙이기: 전곡 다음에 내 연주 */}
            {(layerBackingUrls.length > 0 || orderedSectionUrls.some((s) => s.length > 0)) && (
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={toggleJamPreview}
                className={[
                  'w-full flex items-center justify-center gap-2 py-3 rounded-[12px] border-[2px] border-[#0A0A0A] text-[13px] font-bold',
                  jamPreviewState !== 'idle' ? 'bg-[#0A0A0A] text-white' : 'bg-[#41C66B] text-[#0A0A0A]',
                ].join(' ')}
                style={{ boxShadow: '3px 3px 0 #0A0A0A', fontFamily: 'Pretendard, sans-serif' }}
              >
                {jamPreviewState === 'loading' ? (
                  <><div className="w-4 h-4 border-[2px] border-white border-t-transparent rounded-full animate-spin" /> {t('불러오는 중')}</>
                ) : jamPreviewState === 'playing' ? (
                  <><Pause className="w-4 h-4" /> {t('정지')}</>
                ) : jamMode === 'layer' ? (
                  <><Play className="w-4 h-4 fill-[#0A0A0A]" /> {t('🎧 합주로 들어보기 (반주 + 내 연주)')}</>
                ) : (
                  <><Play className="w-4 h-4 fill-[#0A0A0A]" /> {t('🎧 이어서 들어보기 (전곡 → 내 연주)')}</>
                )}
              </motion.button>
            )}

            {/* 함께 녹음: 두 음량 — 듣는 중 바로 반영, 올리는 파일에도 같은 균형 */}
            {layerTake && (() => {
              const mix = layerMix(baseGain, mineGain, layerTake.peak);
              const apply = (b: number, m: number) => {
                setBaseGain(b);
                setMineGain(m);
                const h = jamHandleRef.current;
                if (h && 'setGains' in h) {
                  const nx = layerMix(b, m, layerTake.peak);
                  h.setGains(nx.previewBase, nx.previewMine);
                }
              };
              return (
                <div className="w-full space-y-2" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                  <div>
                    <label htmlFor="layer-base-gain" className="flex justify-between text-[12px] font-bold text-[#0A0A0A]">
                      <span>{t('기존 합주 음량')}</span>
                      <span>{Math.round(baseGain * 100)}%</span>
                    </label>
                    <input id="layer-base-gain" type="range" min={LAYER_BASE_MIN * 100} max={100} step={5} value={Math.round(baseGain * 100)} onChange={(e) => apply(Number(e.target.value) / 100, mineGain)} className="w-full h-11 accent-[#41C66B]" />
                  </div>
                  <div>
                    <label htmlFor="layer-mine-gain" className="flex justify-between text-[12px] font-bold text-[#0A0A0A]">
                      <span>{t('내 연주 음량')}</span>
                      <span>{Math.round(mineGain * 100)}%</span>
                    </label>
                    <input id="layer-mine-gain" type="range" min={0} max={200} step={5} value={Math.round(mineGain * 100)} onChange={(e) => apply(baseGain, Number(e.target.value) / 100)} className="w-full h-11 accent-[#41C66B]" />
                  </div>
                  {mix.capped && (
                    <p className="text-[12px] font-bold text-[#0A0A0A]/60 break-keep">{t('내 연주가 이미 가장 큰 소리예요. 더 키워도 소리가 깨지지 않게 여기서 멈춰요')}</p>
                  )}
                </div>
              );
            })()}

            {/* 단독 미리듣기 (내 마이크 소리만 담김) */}
            <div className="w-full">
              <p className="text-[12px] font-bold text-[#0A0A0A]/40 mb-1 text-center" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                {t('내 트랙 단독')}
              </p>
              {previewUrl && <audio src={previewUrl} controls className="w-full rounded-[10px]" />}
            </div>

            <button
              onClick={() => { stopJamPreview(); setRecordedBlob(null); setLayerTake(null); setPreview(null); setUploadError(''); }}
              className="text-[12px] font-bold text-[#0A0A0A]/40 underline"
              style={{ fontFamily: 'Pretendard, sans-serif' }}
            >
              {t('다시 녹음하기')}
            </button>
          </div>
        ) : (
          <JamRecorder
            projectId={projectId}
            bpm={bpm}
            layerBackingUrls={layerBackingUrls}
            hasPrevious={latestSection > 0}
            jamBacking={jamBacking}
            onRecorded={async (blob, m) => {
              setJamMode(m);
              setUploadError('');
              // 작게 녹음됐으면 −3dB까지 키우고, 거의 무음이면 다시 녹음하게
              try {
                const lt = await decodeLayerTake(blob);
                if (!lt) {
                  console.warn('[stems] 함께 녹음에 소리가 거의 없음 — 증폭하지 않음');
                  setUploadError(t('녹음된 소리가 거의 없어요. 마이크를 확인해 주세요'));
                  return;
                }
                setLayerTake(lt);
                setBaseGain(1);
                setMineGain(1);
                setRecordedBlob(blob);
                setPreview(URL.createObjectURL(new Blob([encodeWavMono16(lt.samples, lt.sampleRate)], { type: 'audio/wav' })));
              } catch (e) {
                console.error('[stems] 함께 녹음 디코딩 실패 — 원본 그대로', e);
                setLayerTake(null);
                setRecordedBlob(blob);
                setPreview(URL.createObjectURL(blob));
              }
            }}
          />
        )
      )}

      {/* FILE MODE */}
      {uploadMode === 'file' && (
        <>
        <label
          onDragOver={(e) => {
            if (!e.dataTransfer.types.includes('Files')) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
            setDragOver(true);
          }}
          onDragLeave={(e) => {
            if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
            setDragOver(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            selectFile(e.dataTransfer.files?.[0]);
          }}
          className={[
            'flex flex-col items-center justify-center p-6 rounded-[16px] border-[3px] border-dashed cursor-pointer transition-colors',
            dragOver
              ? 'border-[#FF3D77] bg-[#FF3D77]/10'
              : file
                ? 'border-[#41C66B] bg-[#41C66B]/10'
                : 'border-[#0A0A0A]/30 bg-white hover:border-[#FF3D77] hover:bg-[#FF3D77]/5',
          ].join(' ')}
        >
          <Upload
            className={`w-7 h-7 mb-2 ${
              dragOver ? 'text-[#FF3D77]' : file ? 'text-[#41C66B]' : 'text-[#0A0A0A]/30'
            }`}
          />
          <p
            className={`text-[12px] font-bold text-center whitespace-pre-line ${
              dragOver ? 'text-[#FF3D77]' : file ? 'text-[#41C66B]' : 'text-[#0A0A0A]/50'
            }`}
            style={{ fontFamily: 'Pretendard, sans-serif' }}
          >
            {dragOver
              ? t('여기에 놓으세요 🎵')
              : file
                ? `✅ ${file.name}`
                : t('오디오 파일 선택 또는 드래그해서 놓기\nMP3, WAV, OGG, M4A, FLAC (30MB 이하)')}
          </p>
          <input
            type="file"
            accept=".mp3,.wav,.ogg,.m4a,.aac,.flac,audio/*"
            className="hidden"
            onChange={(e) => selectFile(e.target.files?.[0])}
          />
        </label>

        {file && !trimUnavailable && (
          <AudioTrimmer
            key={file.name + file.size + file.lastModified}
            ref={trimRef}
            file={file}
            bpm={bpm}
            onDecodeFailed={handleDecodeFailed}
          />
        )}
        </>
      )}

      {/* RECORD MODE */}
      {uploadMode === 'record' && (
        <div className="flex flex-col items-center gap-4 p-5 bg-white rounded-[16px] border-[3px] border-dashed border-[#0A0A0A]/30">
          {!isRecording && !recordedBlob && (
            <>
              <div className="w-14 h-14 rounded-full bg-[#FF3D77]/10 border-[3px] border-[#FF3D77] flex items-center justify-center">
                <Mic className="w-6 h-6 text-[#FF3D77]" />
              </div>
              <p
                className="text-[12px] text-[#0A0A0A]/50 font-bold text-center"
                style={{ fontFamily: 'Pretendard, sans-serif' }}
              >
                {t('버튼을 눌러 녹음을 시작하세요')}
              </p>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={startRecording}
                className="px-5 py-2.5 bg-[#FF3D77] rounded-[12px] border-[2px] border-[#0A0A0A] text-white font-bold text-[12px] flex items-center gap-2"
                style={{ boxShadow: '3px 3px 0 #0A0A0A', fontFamily: 'Pretendard, sans-serif' }}
              >
                <Mic className="w-4 h-4" /> {t('녹음 시작 🎙️')}
              </motion.button>
            </>
          )}

          {isRecording && (
            <>
              <div className="relative flex items-center justify-center w-20 h-20">
                <motion.div
                  className="absolute inset-0 rounded-full bg-[#FF3D77]/20"
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
                />
                <motion.div
                  className="absolute w-14 h-14 rounded-full bg-[#FF3D77]/30"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1, repeat: Infinity, delay: 0.1, ease: 'easeInOut' }}
                />
                <div className="w-11 h-11 rounded-full bg-[#FF3D77] border-[3px] border-[#0A0A0A] flex items-center justify-center z-10">
                  <Mic className="w-5 h-5 text-white" />
                </div>
              </div>
              <p className="text-[22px] font-bold text-[#FF3D77]" style={{ fontFamily: 'Bungee, sans-serif' }}>
                {formatTime(recordingTime)}
              </p>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={stopRecording}
                className="px-5 py-2.5 bg-[#0A0A0A] rounded-[12px] border-[2px] border-[#0A0A0A] text-white font-bold text-[12px] flex items-center gap-2"
                style={{ boxShadow: '3px 3px 0 #0A0A0A', fontFamily: 'Pretendard, sans-serif' }}
              >
                <Square className="w-4 h-4 fill-white" /> {t('중지 ⏹')}
              </motion.button>
            </>
          )}

          {!isRecording && recordedBlob && (
            <>
              <div className="w-12 h-12 rounded-full bg-[#41C66B]/20 border-[3px] border-[#41C66B] flex items-center justify-center">
                <span className="text-[22px]">✅</span>
              </div>
              <p className="text-[12px] font-bold text-[#41C66B]" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                {t('녹음 완료!')}
              </p>
              {previewUrl && <audio src={previewUrl} controls className="w-full rounded-[10px]" />}
              <button
                onClick={() => { setRecordedBlob(null); setPreview(null); setUploadError(''); }}
                className="text-[12px] font-bold text-[#0A0A0A]/40 underline"
                style={{ fontFamily: 'Pretendard, sans-serif' }}
              >
                {t('다시 녹음하기')}
              </button>
            </>
          )}
        </div>
      )}

      {/* YOUTUBE MODE */}
      {uploadMode === 'youtube' && (
        <div className="flex flex-col gap-3 p-4 bg-white rounded-[16px] border-[3px] border-dashed border-[#0A0A0A]/30">
          <div className="flex items-center gap-2 mb-1">
            <Video className="w-5 h-5 text-[#FF3D77]" />
            <p className="text-[13px] font-bold text-[#0A0A0A]" style={{ fontFamily: 'Pretendard, sans-serif' }}>
              {t('유튜브 영상 링크 붙여넣기')}
            </p>
          </div>
          <p className="text-[12px] text-[#0A0A0A]/50 font-bold -mt-2" style={{ fontFamily: 'Pretendard, sans-serif' }}>
            {t('백킹 트랙을 틀어놓고 연주한 영상을 유튜브에 올린 뒤 링크를 공유하세요')}
          </p>
          <input
            type="url"
            value={youtubeUrl}
            onChange={(e) => { setYoutubeUrl(e.target.value); setUploadError(''); }}
            placeholder="https://youtube.com/watch?v=..."
            className="w-full px-3 py-2.5 bg-[#FFF8F0] rounded-[10px] border-[2px] border-[#0A0A0A] text-[12px] font-bold outline-none focus:border-[#FF3D77]"
            style={{ fontFamily: 'Pretendard, sans-serif' }}
          />

          {youtubeId && (
            <div className="relative w-full rounded-[12px] overflow-hidden border-[2px] border-[#0A0A0A]" style={{ paddingTop: '56.25%' }}>
              <iframe
                className="absolute inset-0 w-full h-full"
                src={`https://www.youtube.com/embed/${youtubeId}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}

          {youtubeUrl && !youtubeId && (
            <p className="text-[12px] font-bold text-[#FF3D77]" style={{ fontFamily: 'Pretendard, sans-serif' }}>
              {t('⚠️ 유효한 유튜브 URL을 입력해주세요')}
            </p>
          )}
        </div>
      )}

      {/* Instrument chips */}
      <div>
        <p className="text-[12px] font-bold text-[#0A0A0A]/50 mb-2" style={{ fontFamily: 'Pretendard, sans-serif' }}>
          {t('파트 (선택)')}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {INSTRUMENTS.map((inst) => (
            <button
              key={inst}
              onClick={() => setInstrument(instrument === inst ? '' : inst)}
              className={[
                'px-2.5 py-1 rounded-[8px] border-[2px] border-[#0A0A0A] text-[12px] font-bold transition-colors',
                instrument === inst ? 'bg-[#4FC3F7] text-[#0A0A0A]' : 'bg-white text-[#0A0A0A]',
              ].join(' ')}
              style={{ fontFamily: 'Pretendard, sans-serif' }}
            >
              {t(inst)}
            </button>
          ))}
        </div>
      </div>

      {uploadError && (
        <p className="text-[12px] font-bold text-[#FF3D77] whitespace-pre-line" style={{ fontFamily: 'Pretendard, sans-serif' }}>
          ⚠️ {uploadError}
        </p>
      )}

      <motion.button
        whileTap={{ scale: 0.96, y: 2 }}
        onClick={handleUpload}
        disabled={!canSubmit || uploading}
        className="w-full py-3.5 bg-[#FF3D77] rounded-[14px] border-[3px] border-[#0A0A0A] text-white font-bold text-[14px] disabled:opacity-50"
        style={{ boxShadow: '4px 4px 0 #0A0A0A', fontFamily: 'Bungee, sans-serif' }}
      >
        {uploading
          ? t('업로드 중...')
          : uploadMode === 'youtube'
          ? t('🎬 유튜브 트랙 등록!')
          : uploadMode === 'jam'
          ? t('🎸 합주 트랙 추가!')
          : t('🎵 트랙 추가!')}
      </motion.button>
    </div>
  );
}
