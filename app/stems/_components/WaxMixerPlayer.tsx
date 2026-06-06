'use client';

import { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import WaxMixer from './WaxMixer';

const THEME_SONG_URL =
  'https://mwllqreadynmaoorymkn.supabase.co/storage/v1/object/public/stems/theme/musicspot_theme.mp3';

export default function WaxMixerPlayer() {
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
      {/* WaxMixer 일러스트 + 클릭 오버레이 */}
      <div className="group relative w-full">
        <WaxMixer spinSpeed={1.8} theme="white" paused={!playing} />

        {/* play 오버레이 — 멈춰있을 때만 보임 */}
        <div
          className="absolute inset-0 flex items-center justify-center bg-black/15 pointer-events-none transition-opacity duration-150"
          style={{ opacity: !playing ? 1 : 0 }}
        >
          <div
            className="rounded-full border-[3px] border-white flex items-center justify-center"
            style={{ width: 64, height: 64, background: 'rgba(0,0,0,0.55)' }}
          >
            <div
              className="ml-[4px]"
              style={{
                width: 0,
                height: 0,
                borderTop: '12px solid transparent',
                borderBottom: '12px solid transparent',
                borderLeft: '22px solid white',
              }}
            />
          </div>
        </div>

        {/* pause 오버레이 — 재생 중 hover 시 보임 */}
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-150 opacity-0 group-hover:opacity-100"
          style={{ opacity: playing ? undefined : 0 }}
        >
          <div className="flex gap-[6px]">
            <div className="w-[6px] h-[22px] bg-white rounded-[3px]" style={{ filter: 'drop-shadow(0 0 6px black)' }} />
            <div className="w-[6px] h-[22px] bg-white rounded-[3px]" style={{ filter: 'drop-shadow(0 0 6px black)' }} />
          </div>
        </div>

        {/* 투명 클릭 레이어 */}
        <button
          onClick={toggle}
          aria-label={playing ? '일시정지' : '재생'}
          className="absolute inset-0 focus:outline-none"
          style={{ WebkitTapHighlightColor: 'transparent' }}
        />
      </div>

      {/* 정보 바 */}
      <div className="flex items-center gap-3 px-5 py-3">
        <div className="flex-1 min-w-0">
          <p
            className="text-[11px] text-[#FF3D77] font-bold tracking-widest mb-1"
            style={{ fontFamily: 'Bungee, sans-serif' }}
          >
            OFFICIAL THEME
          </p>
          <p
            className="text-white text-[15px] font-bold leading-tight"
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
