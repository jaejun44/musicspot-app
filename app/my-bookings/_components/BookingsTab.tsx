'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

export default function BookingsTab() {
  const router = useRouter();

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      className="flex flex-col items-center justify-center py-16 px-4"
    >
      <div
        className="w-20 h-20 rounded-full bg-[#FFD600] border-[3px] border-[#0A0A0A] flex items-center justify-center mb-5"
        style={{ boxShadow: '4px 4px 0 #0A0A0A' }}
      >
        <span className="text-[32px]">📋</span>
      </div>
      <p
        className="text-[18px] font-bold text-[#0A0A0A] mb-2 text-center"
        style={{ fontFamily: 'Bungee, sans-serif' }}
      >
        COMING SOON
      </p>
      <p
        className="text-[13px] text-[#0A0A0A]/50 font-bold text-center mb-6"
        style={{ fontFamily: 'Pretendard, sans-serif' }}
      >
        예약 내역 기능은 곧 오픈돼요!<br />지금은 직접 연습실을 찾아 예약해보세요 🎸
      </p>
      <motion.button
        onClick={() => router.push('/search')}
        whileTap={{ scale: 0.95, y: 2 }}
        className="px-6 py-3 bg-[#FF3D77] rounded-[14px] border-[3px] border-[#0A0A0A] text-white font-bold text-[14px]"
        style={{ boxShadow: '3px 3px 0 #0A0A0A', fontFamily: 'Bungee, sans-serif' }}
      >
        🔍 연습실 찾기
      </motion.button>
    </motion.div>
  );
}
