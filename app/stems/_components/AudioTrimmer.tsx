'use client';

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Play, Square, Scissors } from 'lucide-react';
import { barDuration, eightBarsDuration, scheduleClicks } from '@/lib/metronome';
import { resumeContext } from '@/lib/ensemble-audio';
import {
  computePeaks,
  decodeAudioFile,
  encodeWav,
  formatSeconds,
  getTrimAudioContext,
  sliceAudioBuffer,
  type WaveformPeaks,
} from '@/lib/audio-trim';
import { useT } from '@/lib/i18n';

/** 마디선에 자석처럼 붙는 거리(px). */
const SNAP_PX = 8;
const WAVE_HEIGHT = 80;
/** 길이가 8마디와 이만큼 이내로 차이나면 "정확히 8마디"로 본다. */
const EIGHT_BARS_TOLERANCE_SEC = 0.01;

export interface TrimRange {
  start: number;
  end: number;
}

export interface TrimHandle {
  /** 현재 선택 구간을 WAV Blob으로 인코딩. 디코드 전이면 null. */
  exportTrimmed: () => Blob | null;
  getRange: () => TrimRange | null;
}

interface Props {
  file: File;
  bpm: number;
  /** 디코드 실패 시 호출 — 부모는 원본 그대로 업로드하도록 폴백한다. */
  onDecodeFailed: (message: string) => void;
}

type DragMode = 'start' | 'end' | 'move';

const AudioTrimmer = forwardRef<TrimHandle, Props>(function AudioTrimmer(
  { file, bpm, onDecodeFailed },
  ref
) {
  const t = useT();
  const barSec = barDuration(bpm);
  const eightBarsSec = eightBarsDuration(bpm);

  const ctxRef = useRef<AudioContext | null>(null);
  const bufferRef = useRef<AudioBuffer | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const cancelClicksRef = useRef<(() => void) | null>(null);
  const rafRef = useRef<number | null>(null);

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const playheadRef = useRef<HTMLDivElement | null>(null);

  const [duration, setDuration] = useState(0);
  const [peaks, setPeaks] = useState<WaveformPeaks | null>(null);
  const [width, setWidth] = useState(0);
  const [range, setRange] = useState<TrimRange>({ start: 0, end: 0 });
  const [playing, setPlaying] = useState(false);
  const [clickOn, setClickOn] = useState(true);
  const [decoding, setDecoding] = useState(true);

  // 드래그 중에는 최신 range를 ref로 읽는다(window 리스너가 stale state를 잡지 않도록).
  const rangeRef = useRef(range);
  rangeRef.current = range;
  const dragRef = useRef<{ mode: DragMode; startX: number; origin: TrimRange } | null>(null);

  const stopPlayback = useCallback(() => {
    if (sourceRef.current) {
      sourceRef.current.onended = null;
      try {
        sourceRef.current.stop();
      } catch {
        /* 이미 종료 */
      }
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    cancelClicksRef.current?.();
    cancelClicksRef.current = null;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (playheadRef.current) playheadRef.current.style.opacity = '0';
    setPlaying(false);
  }, []);

  // 파일 디코드 → 피크 계산 → 초기 구간을 8마디로 설정
  useEffect(() => {
    let cancelled = false;
    setDecoding(true);
    setPeaks(null);

    // 공유 컨텍스트 확보. 브라우저 한도 초과 등으로 실패하면 폴백(원본 업로드).
    let ctx: AudioContext;
    try {
      ctx = getTrimAudioContext();
      ctxRef.current = ctx;
    } catch {
      setDecoding(false);
      onDecodeFailed(t('이 파일은 브라우저에서 편집할 수 없어 원본 그대로 올라갑니다.'));
      return;
    }

    decodeAudioFile(file, ctx)
      .then((buffer) => {
        if (cancelled) return;
        bufferRef.current = buffer;
        setDuration(buffer.duration);
        setRange({ start: 0, end: Math.min(buffer.duration, eightBarsSec) });
        setDecoding(false);
      })
      .catch(() => {
        if (cancelled) return;
        setDecoding(false);
        onDecodeFailed(t('이 파일은 브라우저에서 편집할 수 없어 원본 그대로 올라갑니다.'));
      });

    return () => {
      cancelled = true;
      stopPlayback();
    };
    // eightBarsSec은 bpm에서 파생 — bpm이 바뀌면 초기 구간을 다시 잡는다.
  }, [file, eightBarsSec, onDecodeFailed, stopPlayback, t]);

  // 컨테이너 폭 추적 → 폭 기준으로 피크 버킷 재계산.
  // 디코딩 중에는 파형 컨테이너가 렌더되지 않으므로 decoding이 풀린 뒤 다시 붙여야 한다.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    // 첫 폭은 직접 측정한다. ResizeObserver의 최초 콜백은 프레임에 묶여 있어
    // (백그라운드 탭 등) 지연될 수 있고, 그동안 파형이 비어 보인다.
    const measure = () => {
      const w = Math.floor(el.getBoundingClientRect().width);
      if (w > 0) setWidth(w);
    };
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [decoding]);

  useEffect(() => {
    if (!bufferRef.current || width <= 0 || decoding) return;
    setPeaks(computePeaks(bufferRef.current, width));
  }, [width, decoding]);

  // 파형 + 마디 눈금 그리기
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !peaks || width <= 0 || duration <= 0) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = WAVE_HEIGHT * dpr;
    const g = canvas.getContext('2d');
    if (!g) return;

    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, width, WAVE_HEIGHT);

    const mid = WAVE_HEIGHT / 2;
    const secToPx = width / duration;
    const startPx = range.start * secToPx;
    const endPx = range.end * secToPx;

    for (let x = 0; x < width; x++) {
      const inRange = x >= startPx && x <= endPx;
      const top = mid - peaks.max[x] * mid;
      const bottom = mid - peaks.min[x] * mid;
      g.fillStyle = inRange ? '#FF3D77' : '#0A0A0A26';
      g.fillRect(x, top, 1, Math.max(1, bottom - top));
    }

    // 선택 구간 시작점 기준 마디선
    g.strokeStyle = '#0A0A0A40';
    g.lineWidth = 1;
    g.setLineDash([3, 3]);
    for (let bar = 1; range.start + bar * barSec < range.end; bar++) {
      const x = Math.round((range.start + bar * barSec) * secToPx) + 0.5;
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x, WAVE_HEIGHT);
      g.stroke();
    }
    g.setLineDash([]);
  }, [peaks, width, duration, range, barSec]);

  const pxToSec = useCallback(
    (clientX: number) => {
      const el = wrapRef.current;
      if (!el || duration <= 0) return 0;
      const rect = el.getBoundingClientRect();
      const ratio = (clientX - rect.left) / rect.width;
      return Math.min(duration, Math.max(0, ratio * duration));
    },
    [duration]
  );

  /** 구간 시작 기준 마디선에 가까우면 붙인다. */
  const snapToBar = useCallback(
    (sec: number, anchor: number) => {
      if (duration <= 0 || width <= 0) return sec;
      const bars = Math.round((sec - anchor) / barSec);
      const snapped = anchor + bars * barSec;
      const deltaPx = Math.abs(snapped - sec) * (width / duration);
      return deltaPx <= SNAP_PX && snapped > anchor && snapped <= duration ? snapped : sec;
    },
    [barSec, duration, width]
  );

  useEffect(() => {
    function onMove(e: PointerEvent) {
      const drag = dragRef.current;
      if (!drag) return;
      const minLen = Math.min(barSec, duration);
      const sec = pxToSec(e.clientX);

      if (drag.mode === 'start') {
        const next = Math.min(sec, drag.origin.end - minLen);
        setRange({ start: Math.max(0, next), end: drag.origin.end });
      } else if (drag.mode === 'end') {
        const snapped = snapToBar(sec, drag.origin.start);
        const next = Math.max(snapped, drag.origin.start + minLen);
        setRange({ start: drag.origin.start, end: Math.min(duration, next) });
      } else {
        const deltaSec = (e.clientX - drag.startX) * (duration / Math.max(1, width));
        const len = drag.origin.end - drag.origin.start;
        let start = drag.origin.start + deltaSec;
        start = Math.min(Math.max(0, start), duration - len);
        setRange({ start, end: start + len });
      }
    }

    function onUp() {
      dragRef.current = null;
    }

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [barSec, duration, pxToSec, snapToBar, width]);

  function beginDrag(mode: DragMode, e: React.PointerEvent) {
    e.preventDefault();
    e.stopPropagation();
    stopPlayback();
    dragRef.current = { mode, startX: e.clientX, origin: rangeRef.current };
  }

  async function togglePlay() {
    if (playing) {
      stopPlayback();
      return;
    }
    const ctx = ctxRef.current;
    const buffer = bufferRef.current;
    if (!ctx || !buffer) return;

    await resumeContext(ctx);

    const { start, end } = rangeRef.current;
    const length = end - start;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);

    const startAt = ctx.currentTime + 0.08;
    source.start(startAt, start, length);
    source.onended = () => stopPlayback();
    sourceRef.current = source;

    if (clickOn) cancelClicksRef.current = scheduleClicks(ctx, bpm, startAt, length);

    setPlaying(true);

    const head = playheadRef.current;
    if (head) head.style.opacity = '1';

    const tick = () => {
      const elapsed = ctx.currentTime - startAt;
      if (head && elapsed >= 0 && duration > 0) {
        const ratio = (start + Math.min(elapsed, length)) / duration;
        head.style.left = `${ratio * 100}%`;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }

  function fitToEightBars() {
    stopPlayback();
    const start = Math.min(rangeRef.current.start, Math.max(0, duration - eightBarsSec));
    setRange({ start, end: Math.min(duration, start + eightBarsSec) });
  }

  useImperativeHandle(
    ref,
    () => ({
      exportTrimmed: () => {
        const ctx = ctxRef.current;
        const buffer = bufferRef.current;
        if (!ctx || !buffer) return null;
        const { start, end } = rangeRef.current;
        return encodeWav(sliceAudioBuffer(buffer, start, end, ctx));
      },
      getRange: () => (bufferRef.current ? { ...rangeRef.current } : null),
    }),
    []
  );

  const length = range.end - range.start;
  const bars = barSec > 0 ? length / barSec : 0;
  const isEightBars = Math.abs(length - eightBarsSec) < EIGHT_BARS_TOLERANCE_SEC;
  const tooShort = duration > 0 && duration < eightBarsSec;
  const leftPct = duration > 0 ? (range.start / duration) * 100 : 0;
  const widthPct = duration > 0 ? (length / duration) * 100 : 0;

  if (decoding) {
    return (
      <div
        className="rounded-[16px] border-[3px] border-[#0A0A0A] bg-white p-4 text-center"
        style={{ boxShadow: '2px 2px 0 #0A0A0A' }}
      >
        <p
          className="text-[12px] font-bold text-[#0A0A0A]/50"
          style={{ fontFamily: 'Pretendard, sans-serif' }}
        >
          {t('파형을 분석하는 중…')}
        </p>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col gap-2 rounded-[16px] border-[3px] border-[#0A0A0A] bg-white p-3"
      style={{ boxShadow: '2px 2px 0 #0A0A0A' }}
    >
      <div
        ref={wrapRef}
        className="relative w-full touch-none select-none overflow-hidden rounded-[10px] bg-[#FFF8F0]"
        style={{ height: WAVE_HEIGHT }}
      >
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

        {/* 선택 구간 밖 흐리게 */}
        <div className="absolute inset-y-0 left-0 bg-white/60" style={{ width: `${leftPct}%` }} />
        <div
          className="absolute inset-y-0 right-0 bg-white/60"
          style={{ width: `${Math.max(0, 100 - leftPct - widthPct)}%` }}
        />

        {/* 선택 윈도우 (몸통 드래그 = 통째 이동) */}
        <div
          className="absolute inset-y-0 cursor-grab border-x-[3px] border-[#FF3D77] active:cursor-grabbing"
          style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
          onPointerDown={(e) => beginDrag('move', e)}
        >
          <div
            className="absolute inset-y-0 -left-[10px] w-[20px] cursor-ew-resize"
            onPointerDown={(e) => beginDrag('start', e)}
          >
            <div className="absolute left-[7px] top-1/2 h-[26px] w-[6px] -translate-y-1/2 rounded-full border-[2px] border-[#0A0A0A] bg-[#FF3D77]" />
          </div>
          <div
            className="absolute inset-y-0 -right-[10px] w-[20px] cursor-ew-resize"
            onPointerDown={(e) => beginDrag('end', e)}
          >
            <div className="absolute right-[7px] top-1/2 h-[26px] w-[6px] -translate-y-1/2 rounded-full border-[2px] border-[#0A0A0A] bg-[#FF3D77]" />
          </div>
        </div>

        <div
          ref={playheadRef}
          className="pointer-events-none absolute inset-y-0 w-[2px] bg-[#0A0A0A] opacity-0"
        />
      </div>

      {/* 구간 정보 */}
      <div
        className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold"
        style={{ fontFamily: 'Pretendard, sans-serif' }}
      >
        <span className="text-[#0A0A0A]/60">
          {formatSeconds(range.start)} → {formatSeconds(range.end)} ({length.toFixed(1)}
          {t('초')})
        </span>
        {tooShort ? (
          <span className="text-[#0A0A0A]/50">{t('8마디보다 짧은 파일이에요')}</span>
        ) : isEightBars ? (
          <span className="text-[#41C66B]">{t('✓ 정확히 8마디')}</span>
        ) : (
          <span className="text-[#0A0A0A]/50">
            {t('{bars}마디 — 8마디가 아니에요', { bars: bars.toFixed(1) })}
          </span>
        )}
      </div>

      {/* 컨트롤 */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={togglePlay}
          className="flex items-center gap-1 rounded-[10px] border-[2px] border-[#0A0A0A] bg-white px-3 py-1.5 text-[11px] font-bold"
          style={{ boxShadow: '2px 2px 0 #0A0A0A', fontFamily: 'Pretendard, sans-serif' }}
        >
          {playing ? <Square className="h-3 w-3" /> : <Play className="h-3 w-3" />}
          {playing ? t('정지') : t('선택 구간 재생')}
        </button>

        <button
          type="button"
          onClick={fitToEightBars}
          disabled={tooShort}
          className="flex items-center gap-1 rounded-[10px] border-[2px] border-[#0A0A0A] bg-[#FF3D77] px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-40"
          style={{ boxShadow: '2px 2px 0 #0A0A0A', fontFamily: 'Pretendard, sans-serif' }}
        >
          <Scissors className="h-3 w-3" />
          {t('8마디로 맞춤')}
        </button>

        <label
          className="flex cursor-pointer items-center gap-1.5 text-[11px] font-bold text-[#0A0A0A]/60"
          style={{ fontFamily: 'Pretendard, sans-serif' }}
        >
          <input
            type="checkbox"
            checked={clickOn}
            onChange={(e) => setClickOn(e.target.checked)}
            className="h-3.5 w-3.5 accent-[#FF3D77]"
          />
          {t('클릭음')}
        </label>

        <span
          className="ml-auto text-[11px] font-bold text-[#0A0A0A]/40"
          style={{ fontFamily: 'Pretendard, sans-serif' }}
        >
          BPM {bpm} · 4/4
        </span>
      </div>
    </div>
  );
});

export default AudioTrimmer;
