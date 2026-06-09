'use client';

import { useRef, useState, useEffect, memo } from 'react';
import { motion } from 'framer-motion';
import WaxMixerBase from '@/app/stems/_components/WaxMixer';

const WaxMixer = memo(WaxMixerBase);

const BASE = 'https://mwllqreadynmaoorymkn.supabase.co/storage/v1/object/public/stems/theme/';

const TRACKS = [
  { title: 'EIGHT BARS TO THE WORLD', file: 'musicspot_theme.mp3' },
  { title: 'IIIiiiiiIIIIIIIIIII!!!!', file: 'IIIiiiiiIIIIIIIIIII!!!!.mp3' },
  { title: 'BACKING TRACK', file: 'Backing Track.mp3' },
];

export default function ThemeSongPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTrack, setCurrentTrack] = useState(0);

  useEffect(() => {
    const audio = new Audio(BASE + TRACKS[0].file);
    audio.loop = true;
    audio.preload = 'none';
    audioRef.current = audio;
    const onTime = () => { if (audio.duration) setProgress(audio.currentTime / audio.duration); };
    const onEnd  = () => setPlaying(false);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('ended', onEnd);
    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('ended', onEnd);
    };
  }, []);

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) { audio.pause(); setPlaying(false); }
    else { audio.play().then(() => setPlaying(true)).catch(() => {}); }
  }

  function selectTrack(index: number) {
    if (index === currentTrack) { toggle(); return; }
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.src = BASE + TRACKS[index].file;
    setCurrentTrack(index);
    setProgress(0);
    setPlaying(false);
    audio.play().then(() => setPlaying(true)).catch(() => {});
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05, type: 'spring', stiffness: 260, damping: 22 }}
      className={`relative z-20 wax-player mx-4 mb-4 max-w-2xl md:mx-auto rounded-[20px] border-[3px] border-[#0A0A0A] overflow-hidden${!playing ? ' paused' : ''}`}
      style={{ background: '#0A0A0A', boxShadow: '6px 6px 0 #FF3D77' }}
    >
      {/* WaxMixer 일러스트 + 클릭 */}
      <div
        className="group relative w-full cursor-pointer"
        onClick={toggle}
        role="button"
        tabIndex={0}
        aria-label={playing ? '일시정지' : '재생'}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggle(); }}
        style={{ WebkitTapHighlightColor: 'transparent' }}
      >
        <WaxMixer spinSpeed={1.8} theme="white" />

        {/* play overlay */}
        <div
          className="absolute inset-0 flex items-center justify-center bg-black/15 pointer-events-none transition-opacity duration-150"
          style={{ opacity: !playing ? 1 : 0 }}
        >
          <div
            className="rounded-full border-[3px] border-white flex items-center justify-center"
            style={{ width: 64, height: 64, background: 'rgba(0,0,0,0.55)' }}
          >
            <div className="ml-[4px]" style={{ width: 0, height: 0, borderTop: '12px solid transparent', borderBottom: '12px solid transparent', borderLeft: '22px solid white' }} />
          </div>
        </div>

        {/* pause overlay — playing 중 hover 시 */}
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-150 opacity-0 group-hover:opacity-100"
          style={{ opacity: playing ? undefined : 0 }}
        >
          <div className="flex gap-[6px]">
            <div className="w-[6px] h-[22px] bg-white rounded-[3px]" style={{ filter: 'drop-shadow(0 0 6px black)' }} />
            <div className="w-[6px] h-[22px] bg-white rounded-[3px]" style={{ filter: 'drop-shadow(0 0 6px black)' }} />
          </div>
        </div>
      </div>

      {/* 현재 곡 정보 바 */}
      <div className="flex items-center gap-3 px-5 py-3">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-[#FF3D77] font-bold tracking-widest mb-1" style={{ fontFamily: 'Bungee, sans-serif' }}>
            OFFICIAL THEME
          </p>
          <p className="text-white text-[15px] font-bold leading-tight truncate" style={{ fontFamily: 'Bungee, sans-serif' }}>
            {TRACKS[currentTrack].title}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-[80px] h-[3px] bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-[#FF3D77] rounded-full transition-all duration-300" style={{ width: `${progress * 100}%` }} />
          </div>
          <span className={`text-[10px] font-bold ${playing ? 'text-[#FF3D77]' : 'text-white/30'}`} style={{ fontFamily: 'Bungee, sans-serif' }}>
            {playing ? '▶ ON AIR' : '■ READY'}
          </span>
        </div>
      </div>

      {/* 플레이리스트 */}
      <div className="border-t border-white/10 relative z-[1]">
        {TRACKS.map((track, i) => (
          <button
            key={i}
            onClick={() => selectTrack(i)}
            className={`w-full flex items-center gap-3 px-5 py-[10px] text-left transition-colors cursor-pointer ${i === currentTrack ? 'bg-white/5' : 'hover:bg-white/5'}`}
          >
            <span
              className={`text-[10px] font-bold w-4 flex-shrink-0 ${i === currentTrack ? 'text-[#FF3D77]' : 'text-white/30'}`}
              style={{ fontFamily: 'Bungee, sans-serif' }}
            >
              {i === currentTrack && playing ? '▶' : `0${i + 1}`}
            </span>
            <span
              className={`text-[13px] font-bold truncate ${i === currentTrack ? 'text-white' : 'text-white/50'}`}
              style={{ fontFamily: 'Bungee, sans-serif' }}
            >
              {track.title}
            </span>
          </button>
        ))}
      </div>
    </motion.div>
  );
}
