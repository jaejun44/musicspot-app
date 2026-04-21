'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';

const LOGIN_METHODS = [
  {
    id: 'kakao',
    label: '카카오로 시작하기',
    emoji: '💛',
    bg: '#FFD600',
    text: '#0A0A0A',
  },
  {
    id: 'google',
    label: 'Google로 시작하기',
    emoji: '🔵',
    bg: '#FFFFFF',
    text: '#0A0A0A',
  },
  {
    id: 'email',
    label: '이메일로 시작하기',
    emoji: '✉️',
    bg: '#FF3D77',
    text: '#FFFFFF',
  },
];

export default function LoginClient() {
  const router = useRouter();

  function handleLogin(method: string) {
    // Phase 2에서 Supabase Auth 연동 예정
    alert(`${method} 로그인은 준비 중이에요! 🎸`);
  }

  return (
    <div className="min-h-screen bg-[#FFF8F0] flex flex-col">
      <Navigation />

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-10">
        {/* 로고/아이콘 */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          className="mb-8"
        >
          <div
            className="w-24 h-24 rounded-full bg-[#FF3D77] border-[4px] border-[#0A0A0A] flex items-center justify-center"
            style={{ boxShadow: '6px 6px 0 #0A0A0A' }}
          >
            <span className="text-[40px]">🎸</span>
          </div>
        </motion.div>

        {/* 타이틀 */}
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-[32px] font-bold text-[#0A0A0A] mb-2 text-center"
          style={{ fontFamily: 'Bungee, sans-serif' }}
        >
          MUSIC SPOT
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-[14px] text-[#0A0A0A]/50 font-bold mb-10 text-center"
          style={{ fontFamily: 'Pretendard, sans-serif' }}
        >
          뮤지션을 위한 합주/연습실 플랫폼
        </motion.p>

        {/* 로그인 버튼들 */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="w-full max-w-sm flex flex-col gap-3"
        >
          {LOGIN_METHODS.map((method, i) => (
            <motion.button
              key={method.id}
              onClick={() => handleLogin(method.label)}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.45 + i * 0.08, type: 'spring' }}
              whileTap={{ scale: 0.96, y: 2 }}
              className="w-full py-4 rounded-[16px] border-[3px] border-[#0A0A0A] font-bold text-[15px] flex items-center justify-center gap-3"
              style={{
                backgroundColor: method.bg,
                color: method.text,
                boxShadow: '4px 4px 0 #0A0A0A',
                fontFamily: 'Pretendard, sans-serif',
              }}
            >
              <span className="text-[20px]">{method.emoji}</span>
              {method.label}
            </motion.button>
          ))}
        </motion.div>

        {/* 구분선 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="w-full max-w-sm flex items-center gap-3 my-6"
        >
          <div className="flex-1 h-[2px] bg-[#0A0A0A]/10 rounded-full" />
          <span
            className="text-[12px] text-[#0A0A0A]/30 font-bold"
            style={{ fontFamily: 'Pretendard, sans-serif' }}
          >
            또는
          </span>
          <div className="flex-1 h-[2px] bg-[#0A0A0A]/10 rounded-full" />
        </motion.div>

        {/* 비회원 계속 */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.75 }}
          onClick={() => router.push('/search')}
          whileTap={{ scale: 0.97 }}
          className="w-full max-w-sm py-3.5 bg-white rounded-[16px] border-[3px] border-[#0A0A0A] font-bold text-[14px] text-[#0A0A0A]/60"
          style={{ boxShadow: '4px 4px 0 #0A0A0A', fontFamily: 'Pretendard, sans-serif' }}
        >
          비회원으로 둘러보기 →
        </motion.button>

        {/* 약관 */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.85 }}
          className="text-[11px] text-[#0A0A0A]/30 font-bold mt-6 text-center"
          style={{ fontFamily: 'Pretendard, sans-serif' }}
        >
          로그인 시 이용약관 및 개인정보 처리방침에 동의하게 됩니다.
        </motion.p>
      </div>
    </div>
  );
}
