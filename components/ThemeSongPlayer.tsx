'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';

const THEME_SONG_URL =
  'https://mwllqreadynmaoorymkn.supabase.co/storage/v1/object/public/stems/theme/musicspot_theme.mp3';

// ── GIF 실측: 1920 × 737 ─────────────────────────────────────────
// 원본 비닐 지름 ≈ H × 0.75 → rh=0.375, r=276px
// cx: 0.200/0.800 (WAX 완전 커버 — right left-edge=1260 > WAX x≈1257)
// 우측 끝: 0.800×1920 + 276 = 1812px < 1920 안전
const RECORDS = [
  { cx: 0.200, cy: 0.500, rh: 0.375 },  // 왼쪽 덱
  { cx: 0.800, cy: 0.500, rh: 0.375 },  // 오른쪽 덱
];

// 톤암 복원 — 팔 몸통만 좁게 (WAX 글씨 영역 포함 금지)
const TONEARMS = [
  { x: 548, y: 148, w: 72, h: 230 },    // 왼쪽 덱 톤암
  { x: 1300, y: 148, w: 72, h: 230 },   // 오른쪽 덱 톤암
];

const SPIN_SECS = 2.4;
const R_LABEL   = 0.285;   // 중앙 라벨 반지름 (r 대비)
const R_HOLE    = 0.038;   // 센터 홀 반지름
// ─────────────────────────────────────────────────────────────────

export default function ThemeSongPlayer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hiddenImg = useRef<HTMLImageElement | null>(null);
  const audioRef  = useRef<HTMLAudioElement | null>(null);
  const rafRef    = useRef<number>(0);
  const startRef  = useRef<number>(0);

  const [playing,  setPlaying]  = useState(false);
  const [progress, setProgress] = useState(0);
  const [ready,    setReady]    = useState(false);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
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
      canvas.width  = W;
      canvas.height = H;
    }

    // 1. GIF 원본 프레임
    ctx.drawImage(img, 0, 0, W, H);

    const elapsed = (performance.now() - startRef.current) / 1000;
    const angle   = ((elapsed % SPIN_SECS) / SPIN_SECS) * Math.PI * 2;

    // 2. 각 덱 비닐 교체
    for (const rec of RECORDS) {
      const cx = rec.cx * W;
      const cy = rec.cy * H;
      const r  = rec.rh * H;

      ctx.save();
      ctx.translate(cx, cy);

      // 검정 비닐 원
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fillStyle = '#0d0d0d';
      ctx.fill();

      // 홈 질감 — 동심원
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

      // 3. MUSIC SPOT 텍스트 — 회전
      ctx.rotate(angle);

      // 그루브 영역에 딱 맞는 폰트/위치
      // 그루브: R_LABEL*r ~ r, 중심: r*(R_LABEL + (1-R_LABEL)/2)
      const grooveCenter = r * (R_LABEL + (1 - R_LABEL) / 2);   // ≈ r*0.64
      const halfGroove   = r * (1 - R_LABEL) / 2;                // ≈ r*0.36
      const fs = halfGroove * 0.78;  // 폰트크기 = 반그루브 높이의 78%

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

      // 4. 중앙 라벨 (회전 없음)
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

    // 5. 톤암 복원 — 비닐이 덮은 톤암을 GIF 원본으로 덮어씌우기
    for (const t of TONEARMS) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(t.x, t.y, t.w, t.h);
      ctx.clip();
      ctx.drawImage(img, 0, 0, W, H);
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
    audio.loop    = true;
    audio.preload = 'none';
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
