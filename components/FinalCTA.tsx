'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

const rooms = [
  {
    emoji: '💬',
    title: '피드백',
    desc: '쓰고 싶은 말 다 해도 돼',
    href: '/feedback',
    bg: '#4FC3F7',
  },
  {
    emoji: '🏢',
    title: '등록신청',
    desc: '우리 연습실도 올려줘',
    href: '/register',
    bg: '#FF3D77',
  },
  {
    emoji: '🚨',
    title: '정보 제보',
    desc: '틀린 정보 발견했어',
    href: '/feedback?type=correction',
    bg: '#FFD600',
  },
];

export default function FinalCTA() {
  const [open, setOpen] = useState(false);

  return (
    <section className="relative overflow-hidden" style={{ minHeight: '420px' }}>
      {/* Full-bleed background image */}
      <img
        src="/ms_character/audition.png"
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
      />

      <div className="relative flex flex-col justify-end px-8 pb-0 pt-64">
        <div className="max-w-[1440px] mx-auto text-center">
          {/* CTA Button */}
          <motion.button
            onClick={() => setOpen((v) => !v)}
            whileHover={{ y: 5, boxShadow: '6px 6px 0 #0A0A0A', scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-10 py-4 bg-[#FFF8F0] text-[#0A0A0A] rounded-[16px] border-[3px] border-[#0A0A0A]"
            style={{
              boxShadow: '8px 8px 0 #0A0A0A',
              fontFamily: 'Bungee, sans-serif',
              fontSize: 'clamp(16px, 2.7vw, 21px)',
              transform: 'translateY(28px)',
            }}
          >
            {open ? '문 닫기 🚪' : '솔직히 말해줘'}
          </motion.button>

          {/* Expanded Options */}
          <AnimatePresence>
            {open && (
              <motion.div
                key="room"
                initial={{ opacity: 0, y: 40, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto"
              >
                {rooms.map((room, i) => (
                  <motion.div
                    key={room.title}
                    initial={{ opacity: 0, y: 30, rotate: 0 }}
                    animate={{ opacity: 1, y: 0, rotate: i === 0 ? -2 : i === 2 ? 2 : 0 }}
                    transition={{ delay: i * 0.08, type: 'spring', stiffness: 200 }}
                    whileHover={{ y: -6, rotate: 0, boxShadow: '10px 10px 0 #0A0A0A' }}
                    whileTap={{ scale: 0.95 }}
                    style={{ boxShadow: '6px 6px 0 #0A0A0A' }}
                    className="rounded-[20px] border-[3px] border-[#0A0A0A] overflow-hidden"
                  >
                    <Link href={room.href} className="block p-6 text-center" style={{ backgroundColor: room.bg }}>
                      <div className="text-5xl mb-3">{room.emoji}</div>
                      <h3
                        className="text-[20px] font-bold text-[#0A0A0A] mb-1"
                        style={{ fontFamily: 'Bungee, sans-serif' }}
                      >
                        {room.title}
                      </h3>
                      <p
                        className="text-[13px] font-bold text-[#0A0A0A]/70"
                        style={{ fontFamily: 'Pretendard, sans-serif' }}
                      >
                        {room.desc}
                      </p>
                    </Link>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
