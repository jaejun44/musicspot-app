'use client';

import { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';

// 테마송 URL — 나중에 여기만 교체
const THEME_SONG_URL =
  'https://mwllqreadynmaoorymkn.supabase.co/storage/v1/object/public/stems/theme/musicspot_theme.mp3';

export default function ThemeSongPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const audio = new Audio(THEME_SONG_URL);
    audio.loop = true;
    audio.preload = 'none';
    audioRef.current = audio;

    const onTimeUpdate = () => {
      if (audio.duration) setProgress(audio.currentTime / audio.duration);
    };
    const onEnded = () => setPlaying(false);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play().then(() => setPlaying(true)).catch(() => {});
    }
  }

  const circumference = 2 * Math.PI * 44;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05, type: 'spring', stiffness: 260, damping: 22 }}
      className="mx-4 mb-4 max-w-2xl md:mx-auto rounded-[20px] border-[3px] border-[#0A0A0A] overflow-hidden"
      style={{ background: '#0A0A0A', boxShadow: '6px 6px 0 #FF3D77' }}
    >
      <div className="flex items-center gap-5 px-5 py-5">
        {/* 레코드 */}
        <button
          onClick={toggle}
          aria-label={playing ? '일시정지' : '재생'}
          className="relative flex-shrink-0 w-[96px] h-[96px] rounded-full focus:outline-none"
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          {/* 회전 원판 */}
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              background:
                'conic-gradient(from 0deg, #1a1a1a 0%, #2a2a2a 25%, #111 50%, #222 75%, #1a1a1a 100%)',
              border: '3px solid #333',
            }}
            animate={{ rotate: playing ? 360 : 0 }}
            transition={
              playing
                ? { repeat: Infinity, duration: 3, ease: 'linear' }
                : { duration: 0 }
            }
          >
            {/* 레코드 홈 링 */}
            {[28, 36, 44].map((r) => (
              <div
                key={r}
                className="absolute rounded-full border border-white/5"
                style={{
                  inset: `${(96 - r * 2) / 2}px`,
                }}
              />
            ))}
            {/* 중앙 라벨 */}
            <div
              className="absolute rounded-full flex items-center justify-center"
              style={{
                inset: '28px',
                background: '#FF3D77',
                border: '2px solid #0A0A0A',
              }}
            >
              <div className="w-2 h-2 rounded-full bg-[#0A0A0A]" />
            </div>
          </motion.div>

          {/* 진행도 링 */}
          <svg
            className="absolute inset-0 w-full h-full -rotate-90"
            viewBox="0 0 96 96"
          >
            <circle
              cx="48"
              cy="48"
              r="44"
              fill="none"
              stroke="#FF3D77"
              strokeWidth="3"
              strokeOpacity="0.25"
            />
            <circle
              cx="48"
              cy="48"
              r="44"
              fill="none"
              stroke="#FF3D77"
              strokeWidth="3"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - progress)}
              strokeLinecap="round"
            />
          </svg>

          {/* play/pause 오버레이 */}
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 hover:bg-black/30 transition-colors">
            {playing ? (
              /* pause 아이콘 */
              <div className="flex gap-[3px]">
                <div className="w-[4px] h-[14px] bg-white rounded-[2px]" />
                <div className="w-[4px] h-[14px] bg-white rounded-[2px]" />
              </div>
            ) : (
              /* play 아이콘 */
              <div
                className="w-0 h-0 ml-1"
                style={{
                  borderTop: '8px solid transparent',
                  borderBottom: '8px solid transparent',
                  borderLeft: '14px solid white',
                }}
              />
            )}
          </div>
        </button>

        {/* 텍스트 */}
        <div className="flex-1 min-w-0">
          <p
            className="text-[11px] text-[#FF3D77] font-bold tracking-widest mb-1"
            style={{ fontFamily: 'Bungee, sans-serif' }}
          >
            OFFICIAL THEME
          </p>
          <p
            className="text-white text-[16px] font-bold leading-tight truncate"
            style={{ fontFamily: 'Bungee, sans-serif' }}
          >
            EIGHT BARS TO
            <br />
            THE WORLD
          </p>
          <p
            className="text-white/40 text-[11px] font-bold mt-1"
            style={{ fontFamily: 'Pretendard, sans-serif' }}
          >
            Music Spot Official Theme
          </p>
          <div className="mt-3 flex items-center gap-2">
            <div className="flex-1 h-[3px] bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#FF3D77] rounded-full transition-all duration-300"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            <span
              className={`text-[10px] font-bold ${playing ? 'text-[#FF3D77]' : 'text-white/30'}`}
              style={{ fontFamily: 'Bungee, sans-serif' }}
            >
              {playing ? '▶ PLAYING' : '■ READY'}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
