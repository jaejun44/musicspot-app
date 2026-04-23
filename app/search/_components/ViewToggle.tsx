'use client';

import { motion } from 'framer-motion';
import { List, Map } from 'lucide-react';
import { trackViewToggle } from '@/lib/analytics';

interface ViewToggleProps {
  view: 'list' | 'map';
  onChange: (v: 'list' | 'map') => void;
}

export default function ViewToggle({ view, onChange }: ViewToggleProps) {
  return (
    <div
      className="flex gap-1 bg-white rounded-[14px] border-[2px] border-[#0A0A0A] p-1"
      style={{ boxShadow: '3px 3px 0 #0A0A0A' }}
    >
      {(['list', 'map'] as const).map((v) => (
        <motion.button
          key={v}
          onClick={() => { trackViewToggle(v); onChange(v); }}
          whileTap={{ scale: 0.93 }}
          className={[
            'flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-[13px] font-bold transition-colors',
            view === v
              ? 'bg-[#FF3D77] text-white'
              : 'text-[#0A0A0A]/60 hover:text-[#0A0A0A]',
          ].join(' ')}
          style={{ fontFamily: 'Pretendard, sans-serif' }}
        >
          {v === 'list' ? <List className="w-4 h-4" /> : <Map className="w-4 h-4" />}
          {v === 'list' ? '목록' : '지도'}
        </motion.button>
      ))}
    </div>
  );
}
