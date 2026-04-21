'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Navigation from '@/components/Navigation';

interface BookingData {
  studioName: string;
  studioAddress: string;
  roomType: 'T' | 'M' | null;
  date: string;
  time: string;
  duration: number;
  persons: number;
  bandName: string;
  purpose: string;
  totalPrice: number | null;
  priceInfo: string | null;
}

export default function CompleteClient() {
  const router = useRouter();
  const [booking, setBooking] = useState<BookingData | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem('musicspot_booking');
    if (!raw) return;
    try {
      setBooking(JSON.parse(raw));
      sessionStorage.removeItem('musicspot_booking');
    } catch {
      // ignore
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#FFF8F0] flex flex-col">
      <Navigation />

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-10">
        {/* 성공 애니메이션 */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
          className="relative mb-6"
        >
          <div
            className="w-24 h-24 rounded-full bg-[#FF3D77] border-[4px] border-[#0A0A0A] flex items-center justify-center"
            style={{ boxShadow: '6px 6px 0 #0A0A0A' }}
          >
            <motion.svg
              viewBox="0 0 52 52"
              className="w-12 h-12"
              fill="none"
            >
              <motion.path
                d="M12 27l10 10L40 15"
                stroke="white"
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.5, delay: 0.4, ease: 'easeOut' }}
              />
            </motion.svg>
          </div>

          {/* 주변 장식 */}
          {[0, 60, 120, 180, 240, 300].map((deg, i) => (
            <motion.div
              key={i}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.6 + i * 0.05, type: 'spring' }}
              className="absolute w-3 h-3 rounded-full border-[2px] border-[#0A0A0A]"
              style={{
                backgroundColor: ['#FFD600', '#4FC3F7', '#FF3D77', '#00D26A', '#FFD600', '#4FC3F7'][i],
                top: `${50 + 55 * Math.sin((deg * Math.PI) / 180)}%`,
                left: `${50 + 55 * Math.cos((deg * Math.PI) / 180)}%`,
                transform: 'translate(-50%, -50%)',
              }}
            />
          ))}
        </motion.div>

        {/* 타이틀 */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-[32px] font-bold text-[#0A0A0A] mb-1 text-center"
          style={{ fontFamily: 'Bungee, sans-serif' }}
        >
          BOOKED! 🎸
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65 }}
          className="text-[14px] text-[#0A0A0A]/60 font-bold mb-8 text-center"
          style={{ fontFamily: 'Pretendard, sans-serif' }}
        >
          예약이 완료되었어요!
        </motion.p>

        {/* 예약 요약 카드 */}
        {booking && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="w-full max-w-sm bg-white rounded-[20px] border-[3px] border-[#0A0A0A] p-5 mb-5"
            style={{ boxShadow: '6px 6px 0 #0A0A0A' }}
          >
            <div className="flex items-center justify-between mb-3">
              <span
                className="text-[14px] font-bold text-[#0A0A0A]"
                style={{ fontFamily: 'Pretendard, sans-serif' }}
              >
                {booking.studioName}
              </span>
              {booking.roomType && (
                <span
                  className="px-2 py-0.5 bg-[#FF3D77] border-[2px] border-[#0A0A0A] text-white text-[11px] font-bold rounded-[6px]"
                  style={{ boxShadow: '2px 2px 0 #0A0A0A', fontFamily: 'Pretendard, sans-serif' }}
                >
                  {booking.roomType}룸
                </span>
              )}
            </div>

            <div className="space-y-1.5">
              <InfoRow emoji="📅" value={booking.date} />
              <InfoRow emoji="🕐" value={`${booking.time} (+${booking.duration}h)`} />
              <InfoRow emoji="👥" value={`${booking.persons}명 · ${booking.bandName}`} />
              <InfoRow emoji="🎯" value={booking.purpose} />
            </div>

            {booking.totalPrice ? (
              <div
                className="mt-4 pt-3 border-t-[2px] border-dashed border-[#0A0A0A]/20 flex justify-between items-center"
              >
                <span
                  className="text-[12px] font-bold text-[#0A0A0A]/50"
                  style={{ fontFamily: 'Pretendard, sans-serif' }}
                >
                  결제 금액
                </span>
                <span
                  className="text-[20px] font-bold text-[#FF3D77]"
                  style={{ fontFamily: 'Bungee, sans-serif' }}
                >
                  ₩{booking.totalPrice.toLocaleString()}
                </span>
              </div>
            ) : null}
          </motion.div>
        )}

        {/* QR 플레이스홀더 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.85 }}
          className="w-full max-w-sm bg-white rounded-[20px] border-[3px] border-[#0A0A0A] p-5 mb-8"
          style={{ boxShadow: '4px 4px 0 #0A0A0A' }}
        >
          <p
            className="text-[12px] font-bold text-[#0A0A0A]/40 text-center mb-3"
            style={{ fontFamily: 'Pretendard, sans-serif' }}
          >
            입장 QR 코드
          </p>
          <div className="w-28 h-28 mx-auto rounded-[12px] border-[2px] border-[#0A0A0A] overflow-hidden bg-[#0A0A0A]/5 flex items-center justify-center">
            <QrPlaceholder />
          </div>
          <p
            className="text-[11px] font-bold text-[#0A0A0A]/30 text-center mt-2"
            style={{ fontFamily: 'Pretendard, sans-serif' }}
          >
            연습실 입장 시 제시해주세요
          </p>
        </motion.div>

        {/* 버튼 */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.95 }}
          className="w-full max-w-sm flex flex-col gap-3"
        >
          <motion.button
            onClick={() => router.push('/my-bookings')}
            whileTap={{ scale: 0.96, y: 2 }}
            className="w-full py-4 bg-[#FF3D77] rounded-[16px] border-[3px] border-[#0A0A0A] text-white font-bold text-[15px]"
            style={{ boxShadow: '4px 4px 0 #0A0A0A', fontFamily: 'Bungee, sans-serif' }}
          >
            📋 내 예약 보기
          </motion.button>
          <motion.button
            onClick={() => router.push('/')}
            whileTap={{ scale: 0.96, y: 2 }}
            className="w-full py-4 bg-[#FFD600] rounded-[16px] border-[3px] border-[#0A0A0A] text-[#0A0A0A] font-bold text-[15px]"
            style={{ boxShadow: '4px 4px 0 #0A0A0A', fontFamily: 'Bungee, sans-serif' }}
          >
            🏠 홈으로
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
}

function InfoRow({ emoji, value }: { emoji: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[13px] flex-shrink-0">{emoji}</span>
      <span
        className="text-[13px] text-[#0A0A0A]/70 font-bold"
        style={{ fontFamily: 'Pretendard, sans-serif' }}
      >
        {value}
      </span>
    </div>
  );
}

function QrPlaceholder() {
  const cells = Array.from({ length: 7 }, (_, r) =>
    Array.from({ length: 7 }, (_, c) => {
      const corner =
        (r < 2 && c < 2) || (r < 2 && c > 4) || (r > 4 && c < 2);
      const inner =
        (r === 1 && c === 1) || (r === 1 && c === 5) || (r === 5 && c === 1);
      const fill = corner || inner || ((r + c) % 3 === 0 && r > 1 && c > 1);
      return fill;
    })
  );

  return (
    <div className="grid gap-0.5 p-1" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
      {cells.flat().map((filled, i) => (
        <div
          key={i}
          className={`w-2.5 h-2.5 rounded-[1px] ${filled ? 'bg-[#0A0A0A]' : 'bg-transparent'}`}
        />
      ))}
    </div>
  );
}
