'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';

const THEME_SONG_URL =
  'https://mwllqreadynmaoorymkn.supabase.co/storage/v1/object/public/stems/theme/musicspot_theme.mp3';

// ── 레코드 위치/크기 튜닝 (GIF 비율 기준, 0~1) ──────────────────
// cx/cy: 레코드 중심 (너비/높이 비율), rh: 반지름 (높이 비율)
const RECORDS = [
  { cx: 0.195, cy: 0.50, rh: 0.42 },   // 왼쪽 턴테이블
  { cx: 0.805, cy: 0.50, rh: 0.42 },   // 오른쪽 턴테이블
];
const SPIN_SECS = 2.4;   // GIF 회전 속도에 맞춤 (초/1회전)
// ────────────────────────────────────────────────────────────────

export default function ThemeSongPlayer() {
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const hiddenImg   = useRef<HTMLImageElement | null>(null);
  const audioRef    = useRef<HTMLAudioElement | null>(null);
  const rafRef      = useRef<number>(0);
  const startRef    = useRef<number>(0);

  const [playing,  setPlaying]  = useState(false);
  const [progress, setProgress] = useState(0);
  const [ready,    setReady]    = useState(false);

  // ── GIF 로드 (동일 출처 프록시, CORS 우회) ──
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

  // ── Canvas 드로우 루프 ──
  const drawLoop = useCallback(() => {
    const canvas = canvasRef.current;
    const img    = hiddenImg.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = img.naturalWidth;
    const H = img.naturalHeight;
    if (canvas.width !== W)  canvas.width  = W;
    if (canvas.height !== H) canvas.height = H;

    // 1. GIF 현재 프레임 그리기
    ctx.drawImage(img, 0, 0, W, H);

    // 2. 회전 각도 계산 (항상 회전, 오디오와 무관)
    const elapsed = (performance.now() - startRef.current) / 1000;
    const angle   = ((elapsed % SPIN_SECS) / SPIN_SECS) * Math.PI * 2;

    for (const rec of RECORDS) {
      const cx = rec.cx * W;
      const cy = rec.cy * H;
      const r  = rec.rh * H;   // 반지름 = 높이 비율

      ctx.save();
      ctx.translate(cx, cy);

      // 3. 검정 바이닐 원 (APPAREL WAX 덮기)
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(10, 10, 10, 0.92)';
      ctx.fill();

      // 4. 외곽 점선 링 (레코드 엣지 질감)
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth   = 2;
      ctx.beginPath();
      ctx.arc(0, 0, r - 4, 0, Math.PI * 2);
      ctx.stroke();

      // 5. 텍스트 회전
      ctx.rotate(angle);

      const fs = r * 0.21;
      ctx.font         = `bold ${fs}px Bungee, Arial, sans-serif`;
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle    = 'rgba(255,255,255,0.92)';
      ctx.shadowColor  = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur   = 4;

      ctx.fillText('MUSIC', 0, -fs * 0.75);
      ctx.fillText('SPOT',  0,  fs * 0.75);

      ctx.shadowBlur = 0;

      // 6. 중앙 홀
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.08, 0, Math.PI * 2);
      ctx.fillStyle = '#111';
      ctx.fill();

      ctx.restore();
    }

    rafRef.current = requestAnimationFrame(drawLoop);
  }, []);

  useEffect(() => {
    if (!ready) return;
    // 폰트 로드 기다렸다가 루프 시작
    document.fonts.load('bold 16px Bungee').finally(() => {
      rafRef.current = requestAnimationFrame(drawLoop);
    });
    return () => cancelAnimationFrame(rafRef.current);
  }, [ready, drawLoop]);

  // ── 오디오 ──
  useEffect(() => {
    const audio = new Audio(THEME_SONG_URL);
    audio.loop    = true;
    audio.preload = 'none';
    audioRef.current = audio;

    const onTime = () => {
      if (audio.duration) setProgress(audio.currentTime / audio.duration);
    };
    const onEnd = () => setPlaying(false);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('ended',      onEnd);
    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('ended',      onEnd);
    };
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
      {/* ── Canvas + 재생 오버레이 ── */}
      <button
        onClick={toggle}
        aria-label={playing ? '일시정지' : '재생'}
        className="group relative w-full block focus:outline-none"
        style={{ WebkitTapHighlightColor: 'transparent' }}
      >
        {/* 로딩 스켈레톤 */}
        {!ready && (
          <div
            className="w-full bg-[#1a1a1a] animate-pulse"
            style={{ aspectRatio: '3.2 / 1' }}
          />
        )}

        {/* Canvas — GIF + MUSIC SPOT 합성 */}
        <canvas
          ref={canvasRef}
          className="w-full block"
          style={{ display: ready ? 'block' : 'none' }}
        />

        {/* 정지 상태: play 버튼 */}
        {!playing && ready && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/25 pointer-events-none">
            <div
              className="rounded-full border-[3px] border-white flex items-center justify-center"
              style={{ width: 52, height: 52, background: 'rgba(0,0,0,0.55)' }}
            >
              <div
                className="ml-1"
                style={{
                  width: 0, height: 0,
                  borderTop:    '11px solid transparent',
                  borderBottom: '11px solid transparent',
                  borderLeft:   '20px solid white',
                }}
              />
            </div>
          </div>
        )}

        {/* 재생 중: 호버 pause 버튼 */}
        {playing && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            <div className="flex gap-[5px]">
              <div className="w-[7px] h-[26px] bg-white rounded-[3px]" style={{ filter: 'drop-shadow(0 0 6px black)' }} />
              <div className="w-[7px] h-[26px] bg-white rounded-[3px]" style={{ filter: 'drop-shadow(0 0 6px black)' }} />
            </div>
          </div>
        )}
      </button>

      {/* ── 정보 바 ── */}
      <div className="flex items-center gap-3 px-5 py-3">
        <div className="flex-1 min-w-0">
          <p
            className="text-[10px] text-[#FF3D77] font-bold tracking-widest"
            style={{ fontFamily: 'Bungee, sans-serif' }}
          >
            OFFICIAL THEME
          </p>
          <p
            className="text-white text-[13px] font-bold leading-tight"
            style={{ fontFamily: 'Bungee, sans-serif' }}
          >
            EIGHT BARS TO THE WORLD
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-[80px] h-[3px] bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#FF3D77] rounded-full transition-all duration-300"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <span
            className={`text-[10px] font-bold ${playing ? 'text-[#FF3D77]' : 'text-white/30'}`}
            style={{ fontFamily: 'Bungee, sans-serif' }}
          >
            {playing ? '▶ ON AIR' : '■ READY'}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
