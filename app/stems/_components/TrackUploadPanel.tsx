'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Upload, Mic, Square, Video, Guitar, Play, Pause } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import JamRecorder, { type JamMode } from './JamRecorder';
import { acquireMic } from '@/lib/mic';
import { createAudioContext, resumeContext, loadTracks, loadTracksAligned, playEnsemble, playSequence, type EnsembleHandle } from '@/lib/ensemble-audio';

const INSTRUMENTS = ['보컬', '기타', '베이스', '드럼', '건반', '현악기', '관악기', '기타악기'];
const MAX_FILE_BYTES = 30 * 1024 * 1024;

type UploadMode = 'file' | 'record' | 'youtube' | 'jam';

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
}: Props) {
  const [uploadMode, setUploadMode] = useState<UploadMode>('file');
  const [file, setFile] = useState<File | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [instrument, setInstrument] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

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
  const jamHandleRef = useRef<EnsembleHandle | null>(null);
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

    let totalDur = 0;
    if (jamMode === 'layer') {
      // 쌓기: 최근 섹션 반주 + 내 트랙을 동시 재생
      const buffers = await loadTracks([...layerBackingUrls, myUrl], ctx);
      if (jamCtxRef.current !== ctx) return;
      if (buffers.length === 0) { stopJamPreview(); return; }
      jamHandleRef.current = playEnsemble(buffers, ctx, ctx.currentTime + 0.1);
      totalDur = Math.max(...buffers.map((b) => b.duration));
    } else {
      // 이어붙이기: 기존 전곡(섹션 순서대로) 다음에 내 트랙을 이어 재생
      const flat = orderedSectionUrls.flat();
      const aligned = await loadTracksAligned([...flat, myUrl], ctx);
      if (jamCtxRef.current !== ctx) return;
      // aligned 를 섹션 구조 + 마지막 내 트랙으로 재구성 (실패분 제외)
      let i = 0;
      const sections: AudioBuffer[][] = orderedSectionUrls.map((s) =>
        s.map(() => aligned[i++]).filter((b): b is AudioBuffer => !!b)
      );
      const mine = aligned[i];
      if (mine) sections.push([mine]);
      const flatCount = sections.reduce((n, s) => n + s.length, 0);
      if (flatCount === 0) { stopJamPreview(); return; }
      jamHandleRef.current = playSequence(sections, ctx, ctx.currentTime + 0.1);
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
      setUploadError('녹음을 시작할 수 없어요. 브라우저가 이 형식의 녹음을 지원하는지 확인해주세요.');
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

    if (uploadMode === 'youtube') {
      const { error } = await supabase.from('stem_tracks').insert({
        project_id: projectId,
        user_id: user.id,
        user_name: userName,
        user_emoji: '🎬',
        file_url: null,
        youtube_url: `https://www.youtube.com/watch?v=${youtubeId}`,
        instrument: instrument.trim() || null,
        track_order: trackOrder,
        section,
      });

      if (error) {
        setUploadError('트랙 저장 실패: ' + error.message);
        setUploading(false);
        return;
      }

      setYoutubeUrl('');
      setInstrument('');
      setUploading(false);
      onUploaded();
      return;
    }

    const source: File | Blob = uploadMode === 'file' ? file! : recordedBlob!;

    if (source.size > MAX_FILE_BYTES) {
      setUploadError('파일 크기는 30MB 이하여야 합니다.');
      setUploading(false);
      return;
    }

    const ext = uploadMode === 'file' ? ((file as File).name.split('.').pop() ?? 'mp3') : 'webm';
    const path = `${projectId}/${user.id}_${Date.now()}.${ext}`;
    const contentType = uploadMode === 'file' ? (file as File).type : 'audio/webm';

    const { error: uploadErr } = await supabase.storage
      .from('stems')
      .upload(path, source, { contentType });

    if (uploadErr) {
      setUploadError('업로드 실패: ' + uploadErr.message);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from('stems').getPublicUrl(path);

    const { error: insertErr } = await supabase.from('stem_tracks').insert({
      project_id: projectId,
      user_id: user.id,
      user_name: userName,
      user_emoji: '🎵',
      file_url: urlData.publicUrl,
      youtube_url: null,
      instrument: instrument.trim() || null,
      track_order: trackOrder,
      section,
    });

    if (insertErr) {
      setUploadError('트랙 저장 실패: ' + insertErr.message);
      setUploading(false);
      return;
    }

    setFile(null);
    setRecordedBlob(null);
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
        {(['jam', 'file', 'record', 'youtube'] as UploadMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => switchMode(mode)}
            className={[
              'flex-1 flex items-center justify-center gap-1 py-2.5 text-[11px] font-bold transition-colors',
              uploadMode === mode
                ? 'bg-[#0A0A0A] text-white'
                : 'bg-white text-[#0A0A0A]/50 hover:bg-[#0A0A0A]/5',
            ].join(' ')}
            style={{ fontFamily: 'Pretendard, sans-serif' }}
          >
            {mode === 'jam' ? (
              <><Guitar className="w-3 h-3" /> 함께</>
            ) : mode === 'file' ? (
              <><Upload className="w-3 h-3" /> 파일</>
            ) : mode === 'record' ? (
              <><Mic className="w-3 h-3" /> 녹음</>
            ) : (
              <><Video className="w-3 h-3" /> 유튜브</>
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
              합주 녹음 완료!
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
                  <><div className="w-4 h-4 border-[2px] border-white border-t-transparent rounded-full animate-spin" /> 불러오는 중</>
                ) : jamPreviewState === 'playing' ? (
                  <><Pause className="w-4 h-4" /> 정지</>
                ) : jamMode === 'layer' ? (
                  <><Play className="w-4 h-4 fill-[#0A0A0A]" /> 🎧 합주로 들어보기 (반주 + 내 연주)</>
                ) : (
                  <><Play className="w-4 h-4 fill-[#0A0A0A]" /> 🎧 이어서 들어보기 (전곡 → 내 연주)</>
                )}
              </motion.button>
            )}

            {/* 단독 미리듣기 (내 마이크 소리만 담김) */}
            <div className="w-full">
              <p className="text-[10px] font-bold text-[#0A0A0A]/40 mb-1 text-center" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                내 트랙 단독
              </p>
              {previewUrl && <audio src={previewUrl} controls className="w-full rounded-[10px]" />}
            </div>

            <button
              onClick={() => { stopJamPreview(); setRecordedBlob(null); setPreview(null); setUploadError(''); }}
              className="text-[11px] font-bold text-[#0A0A0A]/40 underline"
              style={{ fontFamily: 'Pretendard, sans-serif' }}
            >
              다시 녹음하기
            </button>
          </div>
        ) : (
          <JamRecorder
            projectId={projectId}
            bpm={bpm}
            layerBackingUrls={layerBackingUrls}
            hasPrevious={latestSection > 0}
            onRecorded={(blob, m) => {
              setJamMode(m);
              setRecordedBlob(blob);
              setPreview(URL.createObjectURL(blob));
              setUploadError('');
            }}
          />
        )
      )}

      {/* FILE MODE */}
      {uploadMode === 'file' && (
        <label
          className={[
            'flex flex-col items-center justify-center p-6 rounded-[16px] border-[3px] border-dashed cursor-pointer transition-colors',
            file
              ? 'border-[#41C66B] bg-[#41C66B]/10'
              : 'border-[#0A0A0A]/30 bg-white hover:border-[#FF3D77] hover:bg-[#FF3D77]/5',
          ].join(' ')}
        >
          <Upload className={`w-7 h-7 mb-2 ${file ? 'text-[#41C66B]' : 'text-[#0A0A0A]/30'}`} />
          <p
            className={`text-[12px] font-bold text-center whitespace-pre-line ${file ? 'text-[#41C66B]' : 'text-[#0A0A0A]/50'}`}
            style={{ fontFamily: 'Pretendard, sans-serif' }}
          >
            {file ? `✅ ${file.name}` : '오디오 파일 선택\nMP3, WAV, OGG, M4A, FLAC (30MB 이하)'}
          </p>
          <input
            type="file"
            accept=".mp3,.wav,.ogg,.m4a,.aac,.flac,audio/*"
            className="hidden"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setUploadError('');
            }}
          />
        </label>
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
                버튼을 눌러 녹음을 시작하세요
              </p>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={startRecording}
                className="px-5 py-2.5 bg-[#FF3D77] rounded-[12px] border-[2px] border-[#0A0A0A] text-white font-bold text-[12px] flex items-center gap-2"
                style={{ boxShadow: '3px 3px 0 #0A0A0A', fontFamily: 'Pretendard, sans-serif' }}
              >
                <Mic className="w-4 h-4" /> 녹음 시작 🎙️
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
                <Square className="w-4 h-4 fill-white" /> 중지 ⏹
              </motion.button>
            </>
          )}

          {!isRecording && recordedBlob && (
            <>
              <div className="w-12 h-12 rounded-full bg-[#41C66B]/20 border-[3px] border-[#41C66B] flex items-center justify-center">
                <span className="text-[22px]">✅</span>
              </div>
              <p className="text-[12px] font-bold text-[#41C66B]" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                녹음 완료!
              </p>
              {previewUrl && <audio src={previewUrl} controls className="w-full rounded-[10px]" />}
              <button
                onClick={() => { setRecordedBlob(null); setPreview(null); setUploadError(''); }}
                className="text-[11px] font-bold text-[#0A0A0A]/40 underline"
                style={{ fontFamily: 'Pretendard, sans-serif' }}
              >
                다시 녹음하기
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
              유튜브 영상 링크 붙여넣기
            </p>
          </div>
          <p className="text-[11px] text-[#0A0A0A]/50 font-bold -mt-2" style={{ fontFamily: 'Pretendard, sans-serif' }}>
            백킹 트랙을 틀어놓고 연주한 영상을 유튜브에 올린 뒤 링크를 공유하세요
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
            <p className="text-[11px] font-bold text-[#FF3D77]" style={{ fontFamily: 'Pretendard, sans-serif' }}>
              ⚠️ 유효한 유튜브 URL을 입력해주세요
            </p>
          )}
        </div>
      )}

      {/* Instrument chips */}
      <div>
        <p className="text-[11px] font-bold text-[#0A0A0A]/50 mb-2" style={{ fontFamily: 'Pretendard, sans-serif' }}>
          파트 (선택)
        </p>
        <div className="flex flex-wrap gap-1.5">
          {INSTRUMENTS.map((inst) => (
            <button
              key={inst}
              onClick={() => setInstrument(instrument === inst ? '' : inst)}
              className={[
                'px-2.5 py-1 rounded-[8px] border-[2px] border-[#0A0A0A] text-[11px] font-bold transition-colors',
                instrument === inst ? 'bg-[#4FC3F7] text-[#0A0A0A]' : 'bg-white text-[#0A0A0A]',
              ].join(' ')}
              style={{ fontFamily: 'Pretendard, sans-serif' }}
            >
              {inst}
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
          ? '업로드 중...'
          : uploadMode === 'youtube'
          ? '🎬 유튜브 트랙 등록!'
          : uploadMode === 'jam'
          ? '🎸 합주 트랙 추가!'
          : '🎵 트랙 추가!'}
      </motion.button>
    </div>
  );
}
