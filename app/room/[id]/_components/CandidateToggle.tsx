'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useCandidates } from '@/hooks/useCandidates';
import { MAX_CANDIDATES } from '@/lib/candidates';

interface Props {
  studioId: string;
}

/** "후보 담기" 토글. 가득 차면 잠깐 "최대 5곳"을 보여 준다 */
export default function CandidateToggle({ studioId }: Props) {
  const { has, toggle } = useCandidates();
  const [fullNotice, setFullNotice] = useState(false);
  const on = has(studioId);

  useEffect(() => {
    if (!fullNotice) return;
    const t = setTimeout(() => setFullNotice(false), 1800);
    return () => clearTimeout(t);
  }, [fullNotice]);

  return (
    <motion.button
      type="button"
      onClick={() => setFullNotice(toggle(studioId).full)}
      whileTap={{ scale: 0.92 }}
      aria-pressed={on}
      className={`h-9 px-3 flex items-center justify-center whitespace-nowrap rounded-full border-[2px] border-[#0A0A0A] text-[13px] font-bold ${
        on ? 'bg-[#F5FF4F] text-[#0A0A0A]' : 'bg-white text-[#0A0A0A]'
      }`}
      style={{ boxShadow: '2px 2px 0 #0A0A0A', fontFamily: 'Pretendard, sans-serif' }}
    >
      {fullNotice ? `최대 ${MAX_CANDIDATES}곳` : on ? '✓ 후보' : '+ 후보'}
    </motion.button>
  );
}
