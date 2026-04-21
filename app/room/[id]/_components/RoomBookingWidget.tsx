'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Studio } from '@/types/studio';

interface RoomBookingWidgetProps {
  studio: Studio;
}

type SelectedRoom = 'T' | 'M' | null;

export default function RoomBookingWidget({ studio }: RoomBookingWidgetProps) {
  const router = useRouter();

  // 룸 타입 선택 (both면 두 옵션, T/M 단독이면 고정)
  const [selectedRoom, setSelectedRoom] = useState<SelectedRoom>(
    studio.room_type === 'T' ? 'T' : studio.room_type === 'M' ? 'M' : null
  );
  const [persons, setPersons] = useState(2);

  const showRoomSelector = studio.room_type === 'both';
  const priceLabel = studio.price_per_hour
    ? `₩${studio.price_per_hour.toLocaleString()}/h`
    : studio.price_info ?? '가격 문의';

  function handleBooking() {
    const params = new URLSearchParams({ roomId: studio.id });
    if (selectedRoom) params.set('room_type', selectedRoom);
    params.set('persons', String(persons));
    router.push(`/booking?${params.toString()}`);
  }

  return (
    <div
      className="bg-white rounded-[20px] border-[3px] border-[#0A0A0A] p-5"
      style={{ boxShadow: '6px 6px 0 #0A0A0A' }}
    >
      <h2
        className="text-[16px] font-bold mb-4 text-[#0A0A0A]"
        style={{ fontFamily: 'Pretendard, sans-serif' }}
      >
        🎸 예약하기
      </h2>

      {/* 가격 */}
      <div
        className="bg-[#FFD600] rounded-[14px] border-[2px] border-[#0A0A0A] px-4 py-3 mb-4 flex items-center justify-between"
        style={{ boxShadow: '3px 3px 0 #FF3D77' }}
      >
        <span className="text-[12px] font-bold text-[#0A0A0A]/60" style={{ fontFamily: 'Pretendard, sans-serif' }}>
          이용 요금
        </span>
        <span
          className="text-[20px] font-bold text-[#0A0A0A]"
          style={{ fontFamily: 'Bungee, sans-serif' }}
        >
          {priceLabel}
        </span>
      </div>

      {/* 룸 선택 (T/M both일 때만) */}
      {showRoomSelector && (
        <div className="mb-4">
          <p className="text-[12px] font-bold text-[#0A0A0A]/50 mb-2" style={{ fontFamily: 'Pretendard, sans-serif' }}>
            룸 타입
          </p>
          <div className="flex gap-2">
            {(['T', 'M'] as const).map((r) => (
              <motion.button
                key={r}
                onClick={() => setSelectedRoom(r)}
                whileTap={{ scale: 0.95 }}
                className={[
                  'flex-1 py-3 rounded-[12px] border-[2px] border-[#0A0A0A] font-bold text-[14px] transition-colors',
                  selectedRoom === r
                    ? 'bg-[#FF3D77] text-white'
                    : 'bg-[#FFF8F0] text-[#0A0A0A]',
                ].join(' ')}
                style={{
                  boxShadow: selectedRoom === r ? '3px 3px 0 #0A0A0A' : '2px 2px 0 #0A0A0A',
                  fontFamily: 'Pretendard, sans-serif',
                }}
              >
                {r}룸
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* 인원 선택 */}
      <div className="mb-5">
        <p className="text-[12px] font-bold text-[#0A0A0A]/50 mb-2" style={{ fontFamily: 'Pretendard, sans-serif' }}>
          인원
        </p>
        <div className="flex items-center gap-3">
          <motion.button
            onClick={() => setPersons((p) => Math.max(1, p - 1))}
            whileTap={{ scale: 0.88 }}
            className="w-10 h-10 rounded-[10px] border-[2px] border-[#0A0A0A] bg-[#FFF8F0] font-bold text-[18px] flex items-center justify-center"
            style={{ boxShadow: '2px 2px 0 #0A0A0A' }}
          >
            −
          </motion.button>
          <span
            className="text-[20px] font-bold w-8 text-center"
            style={{ fontFamily: 'Bungee, sans-serif' }}
          >
            {persons}
          </span>
          <motion.button
            onClick={() => setPersons((p) => Math.min(20, p + 1))}
            whileTap={{ scale: 0.88 }}
            className="w-10 h-10 rounded-[10px] border-[2px] border-[#0A0A0A] bg-[#FFF8F0] font-bold text-[18px] flex items-center justify-center"
            style={{ boxShadow: '2px 2px 0 #0A0A0A' }}
          >
            +
          </motion.button>
          <span className="text-[13px] text-[#0A0A0A]/50 ml-1" style={{ fontFamily: 'Pretendard, sans-serif' }}>
            명
          </span>
        </div>
      </div>

      {/* CTA — 예약 준비중 */}
      <div
        className="w-full py-4 bg-[#0A0A0A]/20 rounded-[16px] border-[3px] border-[#0A0A0A]/30 text-[#0A0A0A]/40 font-bold text-[16px] text-center cursor-not-allowed select-none"
        style={{ fontFamily: 'Bungee, sans-serif' }}
      >
        🔥 지금 예약하기 (준비중)
      </div>
    </div>
  );
}
