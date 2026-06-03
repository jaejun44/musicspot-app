'use client';

import { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const THEME_SONG_URL =
  'https://mwllqreadynmaoorymkn.supabase.co/storage/v1/object/public/stems/theme/musicspot_theme.mp3';

const RECORD_GIF =
  'https://www.apparelmusic.com/wp-content/uploads/2022/04/wax-mixer-copia-2.gif';

// ── GIF 내 레코드 위치 튜닝 (퍼센트, GIF 너비/높이 기준) ──
const LEFT_RECORD  = { x: '19.5%', y: '50%' };
const RIGHT_RECORD = { x: '80.5%', y: '50%' };
const RECORD_DIAM  = '19%';   // 각 레코드 지름 (GIF 너비 %)
const SPIN_SECS    = 2.4;     // GIF 레코드 회전 속도에 맞춤 (초/바퀴)

// ─────────────────────────────────────────────────────────────

interface OverlayProps {
  x: string;
  y: string;
  playing: boolean;
}

function RecordOverlay({ x, y, playing }: OverlayProps) {
  return (
    <motion.div
      className="absolute pointer-events-none flex items-center justify-center"
      style={{
        left: x,
        top: y,
        width: RECORD_DIAM,
        aspectRatio: '1 / 1',
        transform: 'translate(-50%, -50%)',
        borderRadius: '50%',
        background: 'rgba(6, 6, 6, 0.83)',
      }}
      animate={{ rotate: playing ? 360 : 0 }}
      transition={
        playing
          ? { repeat: Infinity, duration: SPIN_SECS, ease: 'linear' }
          : { duration: 0 }
      }
    >
      {/* MUSIC */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-[2%]">
        <span
          className="text-white leading-none tracking-widest"
          style={{
            fontFamily: 'Bungee, sans-serif',
            fontSize: `calc(${RECORD_DIAM} * 0.19)`,
            textShadow: '0 1px 4px rgba(0,0,0,0.9)',
            transform: 'rotate(-10deg)',
          }}
        >
          MUSIC
        </span>
        <span
          className="text-white leading-none tracking-[0.2em]"
          style={{
            fontFamily: 'Bungee, sans-serif',
            fontSize: `calc(${RECORD_DIAM} * 0.19)`,
            textShadow: '0 1px 4px rgba(0,0,0,0.9)',
            transform: 'rotate(-10deg)',
          }}
        >
          SPOT
        </span>
      </div>

      {/* 중앙 홀 */}
      <div
        className="absolute rounded-full bg-[#1a1a1a]"
        style={{ width: '18%', height: '18%' }}
      />
    </motion.div>
  );
}

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

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05, type: 'spring', stiffness: 260, damping: 22 }}
      className="mx-4 mb-4 max-w-2xl md:mx-auto rounded-[20px] border-[3px] border-[#0A0A0A] overflow-hidden"
      style={{ background: '#0A0A0A', boxShadow: '6px 6px 0 #FF3D77' }}
    >
      {/* ── GIF + 레코드 오버레이 ── */}
      <button
        onClick={toggle}
        aria-label={playing ? '일시정지' : '재생'}
        className="relative w-full block focus:outline-none"
        style={{ WebkitTapHighlightColor: 'transparent' }}
      >
        <img
          src={RECORD_GIF}
          alt="turntables"
          className="w-full block"
          draggable={false}
        />

        {/* 왼쪽 레코드 MUSIC SPOT */}
        <RecordOverlay {...LEFT_RECORD} playing={playing} />

        {/* 오른쪽 레코드 MUSIC SPOT */}
        <RecordOverlay {...RIGHT_RECORD} playing={playing} />

        {/* 재생/정지 힌트 오버레이 (GIF 전체) */}
        <div
          className="absolute inset-0 flex items-center justify-center transition-opacity duration-200"
          style={{ background: playing ? 'transparent' : 'rgba(0,0,0,0.28)' }}
        >
          {!playing && (
            <div
              className="rounded-full border-[3px] border-white flex items-center justify-center"
              style={{ width: 48, height: 48, background: 'rgba(0,0,0,0.55)' }}
            >
              <div
                className="ml-1"
                style={{
                  width: 0, height: 0,
                  borderTop: '10px solid transparent',
                  borderBottom: '10px solid transparent',
                  borderLeft: '18px solid white',
                }}
              />
            </div>
          )}
          {playing && (
            <div className="flex gap-2 opacity-0 hover:opacity-100 transition-opacity">
              <div className="w-[6px] h-[22px] bg-white rounded-[3px]" style={{ filter: 'drop-shadow(0 0 4px black)' }} />
              <div className="w-[6px] h-[22px] bg-white rounded-[3px]" style={{ filter: 'drop-shadow(0 0 4px black)' }} />
            </div>
          )}
        </div>
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

        {/* 프로그레스 + 상태 */}
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
