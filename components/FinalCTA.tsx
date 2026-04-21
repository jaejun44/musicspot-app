'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

const trioImage = '/ms_character/Leonardo_Anime_XL_three_cute_chibi_rockstar_kids_standing_toge_1_3418649b-25bc-4055-a8f1-4ad72f27c7a6.jpg';

const rooms = [
  {
    emoji: '💬',
    title: '피드백',
    desc: '쓰고 싶은 말 다 해도 돼',
    href: '/feedback',
    bg: '#4FC3F7',
    shadow: '#0A0A0A',
  },
  {
    emoji: '🏢',
    title: '등록신청',
    desc: '우리 연습실도 올려줘',
    href: '/register',
    bg: '#FF3D77',
    shadow: '#0A0A0A',
  },
  {
    emoji: '🚨',
    title: '정보 제보',
    desc: '틀린 정보 발견했어',
    href: '/feedback?type=correction',
    bg: '#FFD600',
    shadow: '#0A0A0A',
  },
];

export default function FinalCTA() {
  const [open, setOpen] = useState(false);

  return (
    <section className="relative py-32 px-8 bg-[#FFD600] overflow-hidden">
      {/* Radial Speed Lines Background */}
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden opacity-30">
        {Array.from({ length: 24 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-1 bg-[#0A0A0A]"
            style={{
              height: '150%',
              transform: `rotate(${i * 15}deg)`,
              transformOrigin: 'center',
            }}
          />
        ))}
      </div>

      {/* Watermark Trio Image */}
      <div className="absolute inset-0 flex items-center justify-center opacity-10">
        <img src={trioImage} alt="" className="w-[600px] h-auto" />
      </div>

      <div className="relative max-w-[1440px] mx-auto text-center">
        {/* Main CTA Text */}
        <motion.h2
          initial={{ scale: 0.8, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true }}
          className="mb-12"
          style={{
            fontFamily: 'Bungee, sans-serif',
            fontSize: 'clamp(40px, 8vw, 60px)',
            color: '#0A0A0A',
            textShadow: '6px 6px 0 rgba(0,0,0,0.2)',
          }}
        >
          해 줘~!!! 💥
        </motion.h2>

        {/* Big CTA Button */}
        <div className="relative inline-block">
          <motion.button
            onClick={() => setOpen((v) => !v)}
            whileHover={{ y: 5, boxShadow: '6px 6px 0 #0A0A0A', scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-16 py-6 bg-[#FF3D77] text-white rounded-[24px] border-[5px] border-[#0A0A0A]"
            style={{
              boxShadow: '12px 12px 0 #0A0A0A',
              fontFamily: 'Bungee, sans-serif',
              fontSize: 'clamp(24px, 4vw, 32px)',
            }}
          >
            {open ? '문 닫기 🚪' : '진실의 방으로 →'}
          </motion.button>

          {/* POW! Sticker Overlay */}
          <motion.div
            initial={{ rotate: 0, scale: 0 }}
            whileInView={{ rotate: 15, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
            className="absolute -top-8 -right-8 px-5 py-3 bg-[#4FC3F7] border-[4px] border-[#0A0A0A] rounded-2xl"
            style={{
              boxShadow: '6px 6px 0 #0A0A0A',
              fontFamily: 'Bungee, sans-serif',
              fontSize: '28px',
              color: '#FFFFFF',
            }}
          >
            POW!
          </motion.div>
        </div>

        {/* 진실의 방 — 3 Options */}
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

        {/* Decorative Explosions */}
        <motion.div
          animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          className="absolute top-10 left-20 text-6xl"
        >
          💥
        </motion.div>
        <motion.div
          animate={{ scale: [1, 1.3, 1], rotate: [0, -180, -360] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: 'linear' }}
          className="absolute bottom-10 right-20 text-6xl"
        >
          💥
        </motion.div>
        <motion.div
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-1/2 left-10 text-5xl"
        >
          ⚡
        </motion.div>
        <motion.div
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-1/2 right-10 text-5xl"
        >
          ⚡
        </motion.div>
      </div>
    </section>
  );
}
