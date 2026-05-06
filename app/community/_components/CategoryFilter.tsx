'use client';

import { motion } from 'framer-motion';
import { Category } from '../_data/posts';

export type FeedTab = Category | 'all' | '팔로잉';

const CATEGORIES: { label: string; value: FeedTab; emoji: string; color: string }[] = [
  { label: '팔로잉', value: '팔로잉', emoji: '❤️', color: '#FF3D77' },
  { label: '전체', value: 'all', emoji: '📝', color: '#4FC3F7' },
  { label: '후기', value: '후기', emoji: '⭐', color: '#41C66B' },
  { label: '구인', value: '구인', emoji: '🔍', color: '#FF3D77' },
  { label: '자유', value: '자유', emoji: '💬', color: '#F5FF4F' },
  { label: '질문', value: '질문', emoji: '❓', color: '#4FC3F7' },
];

interface Props {
  active: FeedTab;
  onChange: (c: FeedTab) => void;
}

export default function CategoryFilter({ active, onChange }: Props) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
      {CATEGORIES.map((cat) => {
        const isActive = active === cat.value;
        return (
          <motion.button
            key={cat.value}
            onClick={() => onChange(cat.value)}
            whileTap={{ scale: 0.93 }}
            className={[
              'flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-[12px] border-[2px] border-[#0A0A0A] font-bold text-[13px] transition-colors',
              isActive ? 'text-white' : 'bg-white text-[#0A0A0A]',
            ].join(' ')}
            style={{
              backgroundColor: isActive ? cat.color : undefined,
              boxShadow: isActive ? '3px 3px 0 #0A0A0A' : '2px 2px 0 #0A0A0A',
              fontFamily: 'Pretendard, sans-serif',
            }}
          >
            <span className="text-[14px]">{cat.emoji}</span>
            {cat.label}
          </motion.button>
        );
      })}
    </div>
  );
}
