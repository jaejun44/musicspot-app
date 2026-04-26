'use client';

import { motion } from 'framer-motion';
import { Position } from '../_data/musicians';

const POSITIONS: { label: string; value: Position | 'all'; emoji: string; color: string }[] = [
  { label: '전체', value: 'all', emoji: '🎵', color: '#FF3D77' },
  { label: '보컬', value: '보컬', emoji: '🎤', color: '#4FC3F7' },
  { label: '기타', value: '기타', emoji: '🎸', color: '#FF3D77' },
  { label: '베이스', value: '베이스', emoji: '🎵', color: '#41C66B' },
  { label: '드럼', value: '드럼', emoji: '🥁', color: '#F5FF4F' },
  { label: '건반', value: '건반', emoji: '🎹', color: '#4FC3F7' },
];

interface Props {
  active: Position | 'all';
  onChange: (p: Position | 'all') => void;
}

export default function PositionFilter({ active, onChange }: Props) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
      {POSITIONS.map((pos) => {
        const isActive = active === pos.value;
        return (
          <motion.button
            key={pos.value}
            onClick={() => onChange(pos.value)}
            whileTap={{ scale: 0.93 }}
            className={[
              'flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-[12px] border-[2px] border-[#0A0A0A] font-bold text-[13px] transition-colors',
              isActive ? 'text-white' : 'bg-white text-[#0A0A0A]',
            ].join(' ')}
            style={{
              backgroundColor: isActive ? pos.color : undefined,
              boxShadow: isActive ? '3px 3px 0 #0A0A0A' : '2px 2px 0 #0A0A0A',
              fontFamily: 'Pretendard, sans-serif',
            }}
          >
            <span className="text-[14px]">{pos.emoji}</span>
            {pos.label}
          </motion.button>
        );
      })}
    </div>
  );
}
