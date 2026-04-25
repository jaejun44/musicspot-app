'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import VisitorCounter from '@/components/VisitorCounter';

const trioImage = '/ms_character/starbeat.png';

export default function HeroSection() {
  return (
    <section className="relative min-h-[500px] md:min-h-[720px] overflow-hidden">
      {/* Halftone Pattern Background */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: 'radial-gradient(circle, #FFD600 2px, transparent 2px)',
          backgroundSize: '20px 20px',
        }}
      />

      {/* Radial Speed Lines */}
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
        {Array.from({ length: 16 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-1 bg-[#FFD600] opacity-20"
            style={{
              height: '150%',
              transform: `rotate(${i * 22.5}deg)`,
              transformOrigin: 'center',
            }}
          />
        ))}
      </div>

      <div className="relative max-w-[1440px] mx-auto px-4 md:px-8 py-10 md:py-20 flex flex-col md:flex-row items-center gap-8 md:gap-12">
        {/* Left Side */}
        <div className="flex-1 space-y-8">
          {/* Badge */}
          {/* Hero Headline */}
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="space-y-4"
          >
            <h1
              className="uppercase leading-tight"
              style={{
                fontFamily: 'Bungee, sans-serif',
                fontSize: 'clamp(48px, 8vw, 72px)',
                color: '#0A0A0A',
                WebkitTextStroke: '3px #0A0A0A',
                paintOrder: 'stroke fill',
                textShadow: '8px 8px 0 #FFD600',
              }}
            >
              연습실부터<br />
              <span className="relative inline-block">
                무대까지!
                <span className="absolute inset-0 bg-[#FF3D77] -z-10 -left-2 -right-2 top-1 bottom-1" />
              </span>
              <br />🎸 POW!
            </h1>
            <p
              className="text-xl"
              style={{
                fontFamily: 'Pretendard, sans-serif',
                fontWeight: 700,
              }}
            >
              내 주변 연습실, 밴드 메이트, 공연까지 한 방에
            </p>
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-4"
          >
            <Link href="/search" className="w-full sm:w-auto">
              <motion.button
                whileHover={{ y: 5, boxShadow: '3px 3px 0 #0A0A0A' }}
                whileTap={{ scale: 0.95 }}
                className="w-full sm:w-auto px-6 md:px-8 py-4 bg-[#FF3D77] text-white rounded-[20px] border-[4px] border-[#0A0A0A]"
                style={{
                  boxShadow: '8px 8px 0 #0A0A0A',
                  fontFamily: 'Bungee, sans-serif',
                  fontSize: '18px',
                  transform: 'rotate(2deg)',
                  whiteSpace: 'nowrap',
                }}
              >
                🔥 연습실 찾기
              </motion.button>
            </Link>
            <Link href="/band-matching" className="w-full sm:w-auto">
              <motion.button
                whileHover={{ y: 5, boxShadow: '3px 3px 0 #0A0A0A' }}
                whileTap={{ scale: 0.95 }}
                className="w-full sm:w-auto px-6 md:px-8 py-4 bg-[#FFD600] text-[#0A0A0A] rounded-[20px] border-[4px] border-[#0A0A0A]"
                style={{
                  boxShadow: '8px 8px 0 #0A0A0A',
                  fontFamily: 'Bungee, sans-serif',
                  fontSize: '18px',
                  transform: 'rotate(-2deg)',
                  whiteSpace: 'nowrap',
                }}
              >
                🎤 밴드 찾기
              </motion.button>
            </Link>
          </motion.div>

          {/* Visitor Counter */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.7 }}
          >
            <VisitorCounter />
          </motion.div>
        </div>

        {/* Right Side - TRIO Image */}
        <motion.div
          initial={{ rotate: 0, scale: 0.8, opacity: 0 }}
          animate={{ rotate: 3, scale: 1, opacity: 1 }}
          transition={{ delay: 0.5, type: 'spring', stiffness: 100 }}
          className="relative"
        >
          <div className="relative">
            <img
              src={trioImage}
              alt="Rock Band Chibi Characters"
              className="w-full max-w-[320px] sm:max-w-[480px] md:max-w-[1000px] h-auto border-[6px] border-[#0A0A0A] rounded-3xl"
              style={{ boxShadow: '12px 12px 0 #0A0A0A' }}
            />
          </div>
        </motion.div>
      </div>

      {/* Decorative Stars */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        className="hidden sm:block absolute top-20 left-20 text-6xl opacity-30"
        style={{ color: '#FF3D77' }}
      >
        ★
      </motion.div>
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
        className="hidden sm:block absolute bottom-40 right-40 text-5xl"
        style={{ color: '#4FC3F7' }}
      >
        ★
      </motion.div>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
        className="hidden sm:block absolute top-40 right-20 text-7xl opacity-30"
        style={{ color: '#FF3D77' }}
      >
        ★
      </motion.div>

      {/* Lightning Bolts */}
      <motion.div
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        className="hidden md:block absolute top-60 left-40 text-5xl"
      >
        ⚡
      </motion.div>
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        className="hidden md:block absolute bottom-60 right-60 text-4xl"
      >
        ⚡
      </motion.div>

      {/* Music Notes */}
      <motion.div
        animate={{ y: [0, -15, 0], rotate: [0, 10, -10, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        className="hidden md:block absolute top-32 right-60 text-4xl"
      >
        ♪
      </motion.div>
      <motion.div
        animate={{ y: [0, 15, 0], rotate: [0, -10, 10, 0] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
        className="hidden md:block absolute bottom-32 left-60 text-3xl"
      >
        ♬
      </motion.div>
    </section>
  );
}
