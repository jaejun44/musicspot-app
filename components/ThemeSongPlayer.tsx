'use client';

import { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const THEME_SONG_URL =
  'https://mwllqreadynmaoorymkn.supabase.co/storage/v1/object/public/stems/theme/musicspot_theme.mp3';

const RECORD_GIF =
  'https://www.apparelmusic.com/wp-content/uploads/2022/04/wax-mixer-copia-2.gif';

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
      <div className="flex items-stretch gap-0">

        {/* 레코드 GIF 영역 */}
        <button
          onClick={toggle}
          aria-label={playing ? '일시정지' : '재생'}
          className="group relative flex-shrink-0 w-[140px] h-[140px] overflow-hidden focus:outline-none"
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          {/* GIF */}
          <img
            src={RECORD_GIF}
            alt="record player"
            className="w-full h-full object-cover"
            draggable={false}
          />

          {/* MUSIC SPOT 라벨 — 레코드 중앙 */}
          <div
            className="absolute flex flex-col items-center justify-center pointer-events-none"
            style={{
              /* 레코드 플래터 중앙 위치 — GIF 기준 대략 중앙 */
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -52%)',
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: 'rgba(255,61,119,0.92)',
              border: '2px solid rgba(0,0,0,0.6)',
            }}
          >
            <span
              className="text-white leading-none text-center"
              style={{
                fontFamily: 'Bungee, sans-serif',
                fontSize: 7,
                letterSpacing: 0.3,
                textShadow: '0 1px 2px rgba(0,0,0,0.7)',
              }}
            >
              MUSIC{'\n'}SPOT
            </span>
          </div>

          {/* 재생 상태 오버레이 */}
          <div
            className="absolute inset-0 flex items-center justify-center transition-all duration-200"
            style={{
              background: playing
                ? 'rgba(0,0,0,0)'
                : 'rgba(0,0,0,0.45)',
            }}
          >
            {/* 정지 상태: play 아이콘 항상 표시 */}
            {!playing && (
              <div
                className="w-0 h-0"
                style={{
                  marginLeft: 4,
                  borderTop: '10px solid transparent',
                  borderBottom: '10px solid transparent',
                  borderLeft: '18px solid white',
                  filter: 'drop-shadow(0 0 4px rgba(0,0,0,0.8))',
                }}
              />
            )}
            {/* 재생 중: hover 시 pause 아이콘 */}
            {playing && (
              <div className="flex gap-[4px] opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-[5px] h-[18px] bg-white rounded-[2px]" style={{ filter: 'drop-shadow(0 0 4px rgba(0,0,0,0.8))' }} />
                <div className="w-[5px] h-[18px] bg-white rounded-[2px]" style={{ filter: 'drop-shadow(0 0 4px rgba(0,0,0,0.8))' }} />
              </div>
            )}
          </div>
        </button>

        {/* 텍스트 정보 */}
        <div className="flex-1 min-w-0 flex flex-col justify-center px-5 py-4">
          <p
            className="text-[10px] text-[#FF3D77] font-bold tracking-widest mb-1"
            style={{ fontFamily: 'Bungee, sans-serif' }}
          >
            OFFICIAL THEME
          </p>
          <p
            className="text-white text-[15px] font-bold leading-snug"
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

          {/* 프로그레스 */}
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
              {playing ? '▶ ON AIR' : '■ READY'}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
