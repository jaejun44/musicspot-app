'use client';

// 8마디 놀이형 동시 녹음.
// [녹음 시작] → 마이크 → 카운트인(메트로놈) → 끝나는 순간 이전 트랙 합주 재생 + 마이크 녹음 동시 시작
// → 8마디 길이 지나면 자동 정지 → 녹음된 단독 webm blob 을 onRecorded 로 전달(기존 업로드 경로 재사용).
// 레벨 A: 레이턴시 보정 없음. 단순 동시 start.

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Mic, Square } from 'lucide-react';
import { createAudioContext, resumeContext, loadTracks, playEnsemble, type EnsembleHandle } from '@/lib/ensemble-audio';
import { scheduleCountIn, eightBarsDuration, type CountInHandle } from '@/lib/metronome';
import { acquireMic } from '@/lib/mic';

type Phase = 'idle' | 'preparing' | 'countin' | 'recording' | 'done' | 'error';

interface Props {
  projectId: string;
  bpm: number;
  /** 이전 트랙들(이전 마디 전부)의 오디오 URL. 비어 있으면 첫 주자(합주 없이 카운트인+녹음만). */
  trackUrls: string[];
  onRecorded: (blob: Blob) => void;
}

const BARS = 8;
const BEATS_PER_BAR = 4;
const COUNT_IN_BEATS = 4;

export default function JamRecorder({ projectId, bpm, trackUrls, onRecorded }: Props) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [countNumber, setCountNumber] = useState(0);
  const [currentBar, setCurrentBar] = useState(0);
  const [error, setError] = useState('');

  // 정리 대상 refs
  const ctxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const ensembleRef = useRef<EnsembleHandle | null>(null);
  const countInRef = useRef<CountInHandle | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalSec = eightBarsDuration(bpm, BARS, BEATS_PER_BAR);
  const isFirstRunner = trackUrls.length === 0;

  const cleanup = useCallback((closeCtx: boolean) => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    countInRef.current?.cancel();
    countInRef.current = null;
    ensembleRef.current?.stop();
    ensembleRef.current = null;
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      try {
        recorderRef.current.stop();
      } catch {
        /* 무시 */
      }
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (closeCtx && ctxRef.current) {
      try {
        void ctxRef.current.close();
      } catch {
        /* 무시 */
      }
      ctxRef.current = null;
    }
  }, []);

  // unmount 시 마이크·컨텍스트 확실히 정리
  useEffect(() => {
    return () => cleanup(true);
  }, [cleanup]);

  async function handleStart() {
    if (phase === 'preparing' || phase === 'countin' || phase === 'recording') return;
    setError('');
    setCurrentBar(0);
    setCountNumber(0);
    setPhase('preparing');

    // 1) 마이크 (secure context 체크 + 원인별 메시지는 공통 유틸에서)
    const mic = await acquireMic();
    if ('error' in mic) {
      setError(mic.error);
      setPhase('error');
      return;
    }
    const stream = mic.stream;
    streamRef.current = stream;

    // 2) AudioContext (사용자 제스처 내부 — 클릭 핸들러 호출 스택)
    const ctx = createAudioContext();
    ctxRef.current = ctx;
    await resumeContext(ctx);

    // 3) 이전 트랙 로드 (있을 때만)
    let buffers: AudioBuffer[] = [];
    if (trackUrls.length > 0) {
      buffers = await loadTracks(trackUrls, ctx);
    }

    // 마이크 준비 중 unmount/중단됐는지 확인
    if (ctxRef.current !== ctx) return;

    // 4) MediaRecorder 준비
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/webm')
      ? 'audio/webm'
      : '';
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    recorderRef.current = recorder;
    chunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      ensembleRef.current?.stop();
      ensembleRef.current = null;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setPhase('done');
      onRecorded(blob);
    };

    // 5) 카운트인 예약 → endTime(ctx 시간) 확보
    setPhase('countin');
    const countIn = scheduleCountIn(ctx, bpm, COUNT_IN_BEATS, (remaining) => setCountNumber(remaining));
    countInRef.current = countIn;
    const startAt = countIn.endTime;
    const startDelayMs = (startAt - ctx.currentTime) * 1000;

    // 6) 카운트인 끝나는 순간: 합주 재생(ctx 시간 정밀) + 녹음 시작(setTimeout 근사)
    if (buffers.length > 0) {
      ensembleRef.current = playEnsemble(buffers, ctx, startAt);
    }
    timersRef.current.push(
      setTimeout(() => {
        if (recorderRef.current && recorderRef.current.state === 'inactive') {
          recorderRef.current.start();
        }
        setPhase('recording');
        setCurrentBar(1);
        // 마디 진행바 갱신
        const barMs = (60 / Math.max(bpm, 1)) * BEATS_PER_BAR * 1000;
        intervalRef.current = setInterval(() => {
          setCurrentBar((b) => Math.min(BARS, b + 1));
        }, barMs);
      }, Math.max(0, startDelayMs))
    );

    // 7) 8마디 길이 후 자동 정지
    timersRef.current.push(
      setTimeout(() => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        if (recorderRef.current && recorderRef.current.state !== 'inactive') {
          recorderRef.current.stop(); // onstop → onRecorded
        }
      }, Math.max(0, startDelayMs + totalSec * 1000))
    );
  }

  function handleCancel() {
    cleanup(false);
    setPhase('idle');
    setCountNumber(0);
    setCurrentBar(0);
  }

  // ---- UI ----
  return (
    <div className="flex flex-col items-center gap-4 p-5 bg-white rounded-[16px] border-[3px] border-dashed border-[#0A0A0A]/30">
      {phase === 'idle' || phase === 'done' || phase === 'error' ? (
        <>
          <div className="w-14 h-14 rounded-full bg-[#FFB627]/15 border-[3px] border-[#FFB627] flex items-center justify-center">
            <span className="text-[26px]">🎸</span>
          </div>
          <p
            className="text-[12px] text-[#0A0A0A]/60 font-bold text-center leading-relaxed"
            style={{ fontFamily: 'Pretendard, sans-serif' }}
          >
            {isFirstRunner ? (
              <>
                첫 주자예요! 카운트인 4박 뒤 바로 녹음돼요.
                <br />
                메트로놈에 맞춰 8마디를 연주하세요 🥁
              </>
            ) : (
              <>
                카운트인 끝나면 이전 트랙이 깔리고
                <br />
                동시에 내 연주가 녹음돼요. 같이 맞춰봐요! 🎶
              </>
            )}
          </p>
          {phase === 'done' && (
            <p className="text-[12px] font-bold text-[#41C66B]" style={{ fontFamily: 'Pretendard, sans-serif' }}>
              ✅ 녹음 완료! 아래에서 등록하거나 다시 녹음하세요
            </p>
          )}
          {phase === 'error' && error && (
            <p className="text-[12px] font-bold text-[#FF3D77] text-center" style={{ fontFamily: 'Pretendard, sans-serif' }}>
              ⚠️ {error}
            </p>
          )}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleStart}
            className="px-6 py-3 bg-[#FFB627] rounded-[12px] border-[2px] border-[#0A0A0A] text-[#0A0A0A] font-bold text-[13px] flex items-center gap-2"
            style={{ boxShadow: '3px 3px 0 #0A0A0A', fontFamily: 'Pretendard, sans-serif' }}
          >
            <Mic className="w-4 h-4" /> {phase === 'done' ? '다시 함께 연주' : '함께 연주 시작'} 🎙️
          </motion.button>
          <p className="text-[10px] text-[#0A0A0A]/40 font-bold" style={{ fontFamily: 'Pretendard, sans-serif' }}>
            ♩ {bpm} BPM · {BARS}마디 (약 {Math.round(totalSec)}초) · 헤드폰 권장 🎧
          </p>
        </>
      ) : phase === 'preparing' ? (
        <p className="text-[14px] font-bold text-[#0A0A0A]/60 py-6" style={{ fontFamily: 'Pretendard, sans-serif' }}>
          준비 중... 🎚️
        </p>
      ) : phase === 'countin' ? (
        <div className="flex flex-col items-center gap-3 py-4">
          <motion.div
            key={countNumber}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-[72px] font-bold text-[#FF3D77] leading-none"
            style={{ fontFamily: 'Bungee, sans-serif' }}
          >
            {countNumber || COUNT_IN_BEATS}
          </motion.div>
          <p className="text-[12px] font-bold text-[#0A0A0A]/50" style={{ fontFamily: 'Pretendard, sans-serif' }}>
            카운트인... 준비하세요!
          </p>
        </div>
      ) : (
        // recording
        <div className="flex flex-col items-center gap-4 w-full py-2">
          <div className="relative flex items-center justify-center w-20 h-20">
            <motion.div
              className="absolute inset-0 rounded-full bg-[#FF3D77]/20"
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 60 / Math.max(bpm, 1), repeat: Infinity, ease: 'easeInOut' }}
            />
            <div className="w-12 h-12 rounded-full bg-[#FF3D77] border-[3px] border-[#0A0A0A] flex items-center justify-center z-10">
              <Mic className="w-5 h-5 text-white" />
            </div>
          </div>
          <p className="text-[15px] font-bold text-[#FF3D77]" style={{ fontFamily: 'Bungee, sans-serif' }}>
            REC · {currentBar} / {BARS}마디
          </p>
          {/* 마디 진행바 */}
          <div className="flex gap-1 w-full">
            {Array.from({ length: BARS }).map((_, i) => (
              <div
                key={i}
                className="flex-1 h-2.5 rounded-full border-[1.5px] border-[#0A0A0A] transition-colors"
                style={{ backgroundColor: i < currentBar ? '#FF3D77' : '#FFF' }}
              />
            ))}
          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleCancel}
            className="px-5 py-2.5 bg-[#0A0A0A] rounded-[12px] border-[2px] border-[#0A0A0A] text-white font-bold text-[12px] flex items-center gap-2"
            style={{ boxShadow: '3px 3px 0 #0A0A0A', fontFamily: 'Pretendard, sans-serif' }}
          >
            <Square className="w-4 h-4 fill-white" /> 중단
          </motion.button>
        </div>
      )}
    </div>
  );
}
