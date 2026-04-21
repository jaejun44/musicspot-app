'use client';

import { Studio } from '@/types/studio';

interface Props {
  studio: Studio;
  roomType: 'T' | 'M' | null;
  duration: number;
}

export default function BookingStudioCard({ studio, roomType, duration }: Props) {
  const priceLabel = studio.price_per_hour
    ? `₩${studio.price_per_hour.toLocaleString()}/h`
    : studio.price_info ?? '가격 문의';

  const totalPrice = studio.price_per_hour ? studio.price_per_hour * duration : null;

  return (
    <div
      className="bg-white rounded-[20px] border-[3px] border-[#0A0A0A] p-5"
      style={{ boxShadow: '6px 6px 0 #0A0A0A' }}
    >
      <h2
        className="text-[15px] font-bold mb-3 text-[#0A0A0A]"
        style={{ fontFamily: 'Pretendard, sans-serif' }}
      >
        🎸 예약 연습실
      </h2>

      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <span
            className="text-[16px] font-bold text-[#0A0A0A] leading-tight"
            style={{ fontFamily: 'Pretendard, sans-serif' }}
          >
            {studio.name}
          </span>
          {roomType && (
            <span
              className="flex-shrink-0 px-2 py-0.5 bg-[#FF3D77] border-[2px] border-[#0A0A0A] text-white text-[11px] font-bold rounded-[6px]"
              style={{ boxShadow: '2px 2px 0 #0A0A0A', fontFamily: 'Pretendard, sans-serif' }}
            >
              {roomType}룸
            </span>
          )}
        </div>

        {studio.address && (
          <p
            className="text-[12px] text-[#0A0A0A]/60"
            style={{ fontFamily: 'Pretendard, sans-serif' }}
          >
            📍 {studio.address}
          </p>
        )}

        <div className="mt-3 pt-3 border-t-[2px] border-dashed border-[#0A0A0A]/20 flex items-center justify-between">
          <span
            className="text-[12px] font-bold text-[#0A0A0A]/50"
            style={{ fontFamily: 'Pretendard, sans-serif' }}
          >
            {priceLabel}
          </span>
          {totalPrice ? (
            <span
              className="text-[20px] font-bold text-[#FF3D77]"
              style={{ fontFamily: 'Bungee, sans-serif' }}
            >
              ₩{totalPrice.toLocaleString()}
            </span>
          ) : (
            <span
              className="text-[14px] font-bold text-[#0A0A0A]/40"
              style={{ fontFamily: 'Pretendard, sans-serif' }}
            >
              가격 문의
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
