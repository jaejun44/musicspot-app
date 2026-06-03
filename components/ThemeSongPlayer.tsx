'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';

const THEME_SONG_URL =
  'https://mwllqreadynmaoorymkn.supabase.co/storage/v1/object/public/stems/theme/musicspot_theme.mp3';

const SPIN_SECS = 2.4;
const R_LABEL   = 0.285;
const R_HOLE    = 0.038;

interface VinylSpec { cx: number; cy: number; rh: number; }

// 픽셀 스캔으로 비닐 위치·크기 자동 측정
function measureVinyls(img: HTMLImageElement): VinylSpec[] {
  const W = img.naturalWidth;
  const H = img.naturalHeight;

  const tmp = document.createElement('canvas');
  tmp.width = W; tmp.height = H;
  const ctx = tmp.getContext('2d')!;
  ctx.drawImage(img, 0, 0);

  // y=H/2 수평 스캔 (비닐 지름이 최대인 위치)
  const { data } = ctx.getImageData(0, Math.floor(H / 2), W, 1);
  const dark = (x: number) =>
    (data[x * 4] + data[x * 4 + 1] + data[x * 4 + 2]) / 3 < 50;

  // 왼쪽 비닐: 왼쪽에서 오른쪽으로 스캔 → 첫 dark & 마지막 dark (W/2 이전)
  let lS = -1, lE = -1;
  for (let x = 0; x < Math.floor(W / 2); x++) {
    if (dark(x)) { if (lS < 0) lS = x; lE = x; }
  }

  // 오른쪽 비닐: 오른쪽에서 왼쪽으로 스캔 → 마지막 dark & 첫 dark (W/2 이후)
  let rS = -1, rE = -1;
  for (let x = W - 1; x >= Math.floor(W / 2); x--) {
    if (dark(x)) { if (rE < 0) rE = x; rS = x; }
  }

  if (lS >= 0 && lE > lS + 100 && rS >= 0 && rE > rS + 100) {
    const lCx = (lS + lE) / 2;
    const lR  = (lE - lS) / 2;
    const rCx = (rS + rE) / 2;
    const rR  = (rE - rS) / 2;
    const r   = (lR + rR) / 2;   // 좌우 평균 반지름

    console.log(`[VinylMeasure] L cx=${lCx.toFixed(0)} r=${lR.toFixed(0)} | R cx=${rCx.toFixed(0)} r=${rR.toFixed(0)} | H=${H}`);

    return [
      { cx: lCx / W, cy: 0.5, rh: r / H },
      { cx: rCx / W, cy: 0.5, rh: r / H },
    ];
  }

  // 측정 실패 시 폴백
  console.warn('[VinylMeasure] fallback — 측정 실패');
  return [
    { cx: 0.200, cy: 0.5, rh: 0.375 },
    { cx: 0.800, cy: 0.5, rh: 0.375 },
  ];
}

export default function ThemeSongPlayer() {
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const hiddenImg   = useRef<HTMLImageElement | null>(null);
  const audioRef    = useRef<HTMLAudioElement | null>(null);
  const rafRef      = useRef<number>(0);
  const startRef    = useRef<number>(0);
  const vinyls      = useRef<VinylSpec[]>([]);   // 자동 측정값

  const [playing,  setPlaying]  = useState(false);
  const [progress, setProgress] = useState(0);
  const [ready,    setReady]    = useState(false);

  // GIF 로드 + 픽셀 측정
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      vinyls.current  = measureVinyls(img);   // ← 실측
      hiddenImg.current = img;
      startRef.current  = performance.now();
      setReady(true);
    };
    img.src = '/api/gif-proxy';
  }, []);

  const drawLoop = useCallback(() => {
    const canvas = canvasRef.current;
    const img    = hiddenImg.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = img.naturalWidth;
    const H = img.naturalHeight;
    if (canvas.width !== W || canvas.height !== H) {
      canvas.width = W; canvas.height = H;
    }

    ctx.drawImage(img, 0, 0, W, H);

    const elapsed = (performance.now() - startRef.current) / 1000;
    const angle   = ((elapsed % SPIN_SECS) / SPIN_SECS) * Math.PI * 2;

    for (const rec of vinyls.current) {
      const cx = rec.cx * W;
      const cy = rec.cy * H;
      const r  = rec.rh * H;

      ctx.save();
      ctx.translate(cx, cy);

      // 검정 비닐
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fillStyle = '#0d0d0d';
      ctx.fill();

      // 홈 질감
      for (let ri = 0.32; ri < 0.97; ri += 0.03) {
        ctx.beginPath();
        ctx.arc(0, 0, r * ri, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255,255,255,${ri < 0.50 ? 0.04 : 0.025})`;
        ctx.lineWidth = 0.9;
        ctx.stroke();
      }

      // 외곽 링
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.982, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // MUSIC SPOT 텍스트 (회전)
      ctx.rotate(angle);

      const halfGroove   = r * (1 - R_LABEL) / 2;
      const grooveCenter = r * (R_LABEL + (1 - R_LABEL) / 2);
      const fs = halfGroove * 0.78;

      ctx.font         = `bold ${fs}px Bungee, Arial Black, sans-serif`;
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle    = 'rgba(255,255,255,0.92)';
      ctx.shadowColor  = 'rgba(0,0,0,0.95)';
      ctx.shadowBlur   = fs * 0.12;
      ctx.fillText('MUSIC', 0, -grooveCenter);
      ctx.fillText('SPOT',  0, +grooveCenter);
      ctx.shadowBlur = 0;

      ctx.restore();

      // 중앙 라벨 (고정)
      ctx.save();
      ctx.translate(cx, cy);
      ctx.beginPath();
      ctx.arc(0, 0, r * R_LABEL, 0, Math.PI * 2);
      ctx.fillStyle = '#dcdcdc';
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.2)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, r * R_HOLE, 0, Math.PI * 2);
      ctx.fillStyle = '#0d0d0d';
      ctx.fill();
      ctx.restore();
    }

    rafRef.current = requestAnimationFrame(drawLoop);
  }, []);

  useEffect(() => {
    if (!ready) return;
    document.fonts.load('bold 16px Bungee').finally(() => {
      rafRef.current = requestAnimationFrame(drawLoop);
    });
    return () => cancelAnimationFrame(rafRef.current);
  }, [ready, drawLoop]);

  useEffect(() => {
    const audio = new Audio(THEME_SONG_URL);
    audio.loop = true; audio.preload = 'none';
    audioRef.current = audio;
    const onTime = () => { if (audio.duration) setProgress(audio.currentTime / audio.duration); };
    const onEnd  = () => setPlaying(false);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('ended', onEnd);
    return () => { audio.pause(); audio.removeEventListener('timeupdate', onTime); audio.removeEventListener('ended', onEnd); };
  }, []);

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) { audio.pause(); setPlaying(false); }
    else { audio.play().then(() => setPlaying(true)).catch(() => {}); }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05, type: 'spring', stiffness: 260, damping: 22 }}
      className="mx-4 mb-4 max-w-2xl md:mx-auto rounded-[20px] border-[3px] border-[#0A0A0A] overflow-hidden"
      style={{ background: '#0A0A0A', boxShadow: '6px 6px 0 #FF3D77' }}
    >
      <button
        onClick={toggle}
        aria-label={playing ? '일시정지' : '재생'}
        className="group relative w-full block focus:outline-none"
        style={{ WebkitTapHighlightColor: 'transparent' }}
      >
        {!ready && (
          <div className="w-full bg-[#1a1a1a] animate-pulse" style={{ aspectRatio: '2.6 / 1' }} />
        )}
        <canvas ref={canvasRef} className="w-full block" style={{ display: ready ? 'block' : 'none' }} />

        {!playing && ready && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
            <div className="rounded-full border-[3px] border-white flex items-center justify-center"
              style={{ width: 52, height: 52, background: 'rgba(0,0,0,0.55)' }}>
              <div className="ml-1" style={{ width: 0, height: 0,
                borderTop: '11px solid transparent', borderBottom: '11px solid transparent',
                borderLeft: '20px solid white' }} />
            </div>
          </div>
        )}
        {playing && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            <div className="flex gap-[5px]">
              <div className="w-[7px] h-[26px] bg-white rounded-[3px]" style={{ filter: 'drop-shadow(0 0 6px black)' }} />
              <div className="w-[7px] h-[26px] bg-white rounded-[3px]" style={{ filter: 'drop-shadow(0 0 6px black)' }} />
            </div>
          </div>
        )}
      </button>

      <div className="flex items-center gap-3 px-5 py-3">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-[#FF3D77] font-bold tracking-widest" style={{ fontFamily: 'Bungee, sans-serif' }}>
            OFFICIAL THEME
          </p>
          <p className="text-white text-[13px] font-bold leading-tight" style={{ fontFamily: 'Bungee, sans-serif' }}>
            EIGHT BARS TO THE WORLD
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-[80px] h-[3px] bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-[#FF3D77] rounded-full transition-all duration-300" style={{ width: `${progress * 100}%` }} />
          </div>
          <span className={`text-[10px] font-bold ${playing ? 'text-[#FF3D77]' : 'text-white/30'}`}
            style={{ fontFamily: 'Bungee, sans-serif' }}>
            {playing ? '▶ ON AIR' : '■ READY'}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
