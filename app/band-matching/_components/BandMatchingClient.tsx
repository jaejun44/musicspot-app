'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Navigation from '@/components/Navigation';
import PositionFilter from './PositionFilter';
import MusicianCard from './MusicianCard';
import ContactModal from './ContactModal';
import { MUSICIANS, Musician, Position } from '../_data/musicians';

export default function BandMatchingClient() {
  const [activePosition, setActivePosition] = useState<Position | 'all'>('all');
  const [contactTarget, setContactTarget] = useState<Musician | null>(null);

  const filtered =
    activePosition === 'all'
      ? MUSICIANS
      : MUSICIANS.filter((m) => m.position === activePosition);

  return (
    <div className="min-h-screen bg-[#FFF8F0]">
      <Navigation />

      {/* 헤더 */}
      <div className="px-4 pt-6 pb-3 max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        >
          <h1
            className="text-[28px] font-bold text-[#0A0A0A]"
            style={{ fontFamily: 'Bungee, sans-serif' }}
          >
            BAND MATCHING 🎸
          </h1>
          <p
            className="text-[13px] text-[#0A0A0A]/50 mt-1 font-bold"
            style={{ fontFamily: 'Pretendard, sans-serif' }}
          >
            함께 연주할 뮤지션을 찾아보세요
          </p>
        </motion.div>
      </div>

      {/* 필터 */}
      <div className="px-4 pb-4 max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <PositionFilter active={activePosition} onChange={setActivePosition} />
        </motion.div>
      </div>

      {/* 카운트 */}
      <div className="px-4 pb-3 max-w-2xl mx-auto">
        <motion.p
          key={activePosition}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-[12px] text-[#0A0A0A]/40 font-bold"
          style={{ fontFamily: 'Pretendard, sans-serif' }}
        >
          {filtered.length}명의 뮤지션
        </motion.p>
      </div>

      {/* 카드 그리드 */}
      <div className="px-4 pb-16 max-w-2xl mx-auto">
        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filtered.map((m, i) => (
              <MusicianCard
                key={m.id}
                musician={m}
                index={i}
                onContact={setContactTarget}
              />
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20"
          >
            <span className="text-[48px] mb-4">🔍</span>
            <p
              className="text-[16px] font-bold text-[#0A0A0A]/40 text-center"
              style={{ fontFamily: 'Bungee, sans-serif' }}
            >
              NO MUSICIANS FOUND
            </p>
          </motion.div>
        )}
      </div>

      {/* 프로필 등록 배너 */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#FFF8F0] border-t-[3px] border-[#0A0A0A] px-4 py-3">
        <div className="max-w-2xl mx-auto">
          <motion.button
            whileTap={{ scale: 0.96, y: 2 }}
            onClick={() => alert('프로필 등록 기능은 곧 오픈돼요! 🎸')}
            className="w-full py-4 bg-[#FFD600] rounded-[16px] border-[3px] border-[#0A0A0A] text-[#0A0A0A] font-bold text-[15px]"
            style={{ boxShadow: '4px 4px 0 #0A0A0A', fontFamily: 'Bungee, sans-serif' }}
          >
            🎵 내 프로필 등록하기
          </motion.button>
        </div>
      </div>

      <ContactModal musician={contactTarget} onClose={() => setContactTarget(null)} />
    </div>
  );
}
