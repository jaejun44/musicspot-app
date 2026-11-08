'use client';

import { Megaphone } from 'lucide-react';
import { motion } from 'framer-motion';
import { openAskMembers } from '@/lib/ask-members';

interface Props {
  /** wide: 문의 카드 안 보조 버튼 / icon: 이름 옆 동그란 버튼(공유·찜과 같은 줄) */
  variant: 'wide' | 'icon';
}

/** "멤버한테 물어보기" — 주 CTA(문의·예약)보다 눈에 덜 띄게. 시트는 AskMembersSheet가 연다 */
export default function AskMembersButton({ variant }: Props) {
  if (variant === 'icon') {
    return (
      <motion.button
        type="button"
        onClick={() => openAskMembers('info_card')}
        whileTap={{ scale: 0.88 }}
        // 보이는 크기는 옆 버튼들과 같은 36px, 누르는 영역은 44px
        className="relative w-9 h-9 flex items-center justify-center bg-white rounded-full border-[2px] border-[#0A0A0A] before:content-[''] before:absolute before:-inset-1"
        style={{ boxShadow: '2px 2px 0 #0A0A0A' }}
        aria-label="멤버한테 물어보기"
      >
        <Megaphone className="w-4 h-4 text-[#0A0A0A]" />
      </motion.button>
    );
  }

  return (
    <motion.button
      type="button"
      onClick={() => openAskMembers('booking_widget')}
      whileTap={{ scale: 0.97, y: 1 }}
      className="mt-3 w-full min-h-[44px] py-2.5 bg-white rounded-[14px] border-[2px] border-[#0A0A0A] text-[14px] font-bold text-[#0A0A0A]"
      style={{ fontFamily: 'Pretendard, sans-serif' }}
    >
      📣 멤버한테 물어보기
    </motion.button>
  );
}
