'use client';

import { motion } from 'framer-motion';

interface BookingServiceLinkCardProps {
  /** 예약 서비스 경로(/booking/...). rewrite라서 next/link가 아니라 <a>로 이동한다. */
  href: string;
  emoji: string;
  title: string;
  description: string;
}

/** 사이트 화면에서 실시간 예약 서비스(내 예약·예약관리)로 넘어가는 입구 카드. */
export default function BookingServiceLinkCard({
  href,
  emoji,
  title,
  description,
}: BookingServiceLinkCardProps) {
  return (
    <motion.a
      href={href}
      whileTap={{ scale: 0.97, x: 2, y: 2 }}
      className="flex items-center gap-4 w-full bg-white rounded-[20px] border-[3px] border-[#0A0A0A] p-4"
      style={{ boxShadow: '4px 4px 0 #FF3D77' }}
    >
      <span
        className="w-12 h-12 shrink-0 rounded-[14px] bg-[#F5FF4F] border-[2px] border-[#0A0A0A] flex items-center justify-center text-[22px]"
        aria-hidden="true"
      >
        {emoji}
      </span>
      <span className="flex-1 min-w-0 text-left">
        <span
          className="block text-[15px] font-bold text-[#0A0A0A]"
          style={{ fontFamily: 'Pretendard, sans-serif' }}
        >
          {title}
        </span>
        <span
          className="block text-[12px] font-bold text-[#0A0A0A]/50"
          style={{ fontFamily: 'Pretendard, sans-serif' }}
        >
          {description}
        </span>
      </span>
      <span className="text-[18px] font-bold text-[#0A0A0A]" aria-hidden="true">
        →
      </span>
    </motion.a>
  );
}
