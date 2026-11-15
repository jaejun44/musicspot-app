'use client';

// 8마디 녹음 공통 로직 — 8마디 JamRecorder(/stems)와 백킹 잼 테이크(/jam)가 같이 쓴다.
// 마이크 → 카운트인(4박) → 끝나는 순간 반주 재생(ctx 시간 정밀) + 녹음 시작(setTimeout 근사) → 8마디 뒤 자동 정지 → webm blob.
// 레벨 A: 레이턴시 보정 없음(백킹 잼은 미리듣기에서 손으로 싱크를 맞춘다).

import { useCallback, useEffect, useRef, useState } from 'react';
import { createAudioContext, resumeContext, playEnsemble, type EnsembleHandle } from '@/lib/ensemble-audio';
import { scheduleCountIn, eightBarsDuration, type CountInHandle } from '@/lib/metronome';
import { acquireMic } from '@/lib/mic';

export type TakePhase = 'idle' | 'preparing' | 'countin' | 'recording' | 'done' | 'error';

export const TAKE_BARS = 8;
export const TAKE_BEATS_PER_BAR = 4;
export const TAKE_COUNT_IN_BEATS = 4;

export interface StartOptions {
  /** 카운트인 끝에 함께 틀 반주(없으면 빈 배열). ctx는 녹음용 컨텍스트 */
  loadBacking: (ctx: AudioContext) => Promise<AudioBuffer[]>;
  /** 녹음이 끝나면(자동 정지) 호출 */
  onRecorded: (blob: Blob) => void;
  /** 마이크를 열기 직전(사용자 탭과 같은 흐름) — 백킹 잼의 iOS 오디오 세션 전환용 */
  beforeMic?: () => void;
  /** 녹음이 끝나거나 취소·오류로 정리될 때 — beforeMic에서 바꾼 것을 되돌린다 */
  afterStop?: () => void;
}

export function useTakeRecorder(bpm: number) {
  const [phase, setPhase] = useState<TakePhase>('idle');
  const [countNumber, setCountNumber] = useState(0);
  const [currentBar, setCurrentBar] = useState(0);
  const [error, setError] = useState('');

  const ctxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const ensembleRef = useRef<EnsembleHandle | null>(null);
  const countInRef = useRef<CountInHandle | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const afterStopRef = useRef<(() => void) | null>(null);

  const totalSec = eightBarsDuration(bpm, TAKE_BARS, TAKE_BEATS_PER_BAR);

  const runAfterStop = useCallback(() => {
    const fn = afterStopRef.current;
    afterStopRef.current = null;
    fn?.();
  }, []);

  const cleanup = useCallback(
    (closeCtx: boolean) => {
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
      runAfterStop();
    },
    [runAfterStop],
  );

  // unmount 시 마이크·컨텍스트 확실히 정리
  useEffect(() => {
    return () => cleanup(true);
  }, [cleanup]);

  const start = useCallback(
    async (opts: StartOptions) => {
      if (phase === 'preparing' || phase === 'countin' || phase === 'recording') return;
      setError('');
      setCurrentBar(0);
      setCountNumber(0);
      setPhase('preparing');

      // 0) 탭과 같은 흐름에서(await 전에)
      if (opts.beforeMic) {
        opts.beforeMic();
        afterStopRef.current = opts.afterStop ?? null;
      }

      // 1) 마이크 (secure context 체크 + 원인별 메시지는 공통 유틸에서)
      const mic = await acquireMic();
      if ('error' in mic) {
        setError(mic.error);
        setPhase('error');
        runAfterStop();
        return;
      }
      const stream = mic.stream;
      streamRef.current = stream;

      // 2) AudioContext (사용자 제스처 내부 — 클릭 핸들러 호출 스택)
      const ctx = createAudioContext();
      ctxRef.current = ctx;
      await resumeContext(ctx);

      // 3) 반주
      let buffers: AudioBuffer[] = [];
      try {
        buffers = await opts.loadBacking(ctx);
      } catch (e) {
        console.error('[take] 반주 준비 실패 — 반주 없이 녹음', e);
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
        runAfterStop();
        setPhase('done');
        opts.onRecorded(blob);
      };

      // 5) 카운트인 예약 → endTime(ctx 시간) 확보
      setPhase('countin');
      const countIn = scheduleCountIn(ctx, bpm, TAKE_COUNT_IN_BEATS, (remaining) => setCountNumber(remaining));
      countInRef.current = countIn;
      const startAt = countIn.endTime;
      const startDelayMs = (startAt - ctx.currentTime) * 1000;

      // 6) 카운트인 끝나는 순간: 반주 재생(ctx 시간 정밀) + 녹음 시작(setTimeout 근사)
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
          const barMs = (60 / Math.max(bpm, 1)) * TAKE_BEATS_PER_BAR * 1000;
          intervalRef.current = setInterval(() => {
            setCurrentBar((b) => Math.min(TAKE_BARS, b + 1));
          }, barMs);
        }, Math.max(0, startDelayMs)),
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
        }, Math.max(0, startDelayMs + totalSec * 1000)),
      );
    },
    [bpm, phase, totalSec, runAfterStop],
  );

  /**
   * 녹음 도중 중단. discard=false(8마디 JamRecorder 기존 동작)는 정지된 녹음분도 onRecorded로 넘어간다.
   * 백킹 잼은 discard=true — 중단한 테이크는 버린다
   */
  const cancel = useCallback((discard = false) => {
    if (discard && recorderRef.current) recorderRef.current.onstop = null;
    cleanup(false);
    setPhase('idle');
    setCountNumber(0);
    setCurrentBar(0);
  }, [cleanup]);

  return { phase, countNumber, currentBar, error, totalSec, start, cancel };
}
