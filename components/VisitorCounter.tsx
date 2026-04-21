'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';

export default function VisitorCounter() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    async function recordAndFetch() {
      await supabase.from('page_views').insert({ path: '/' });

      const { count: total } = await supabase
        .from('page_views')
        .select('*', { count: 'exact', head: true });

      if (total !== null) setCount(total);
    }
    recordAndFetch();
  }, []);

  if (count === null) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.8 }}
      className="inline-flex items-center gap-2 px-4 py-2 bg-white border-[2px] border-[#0A0A0A] rounded-[12px]"
      style={{ boxShadow: '3px 3px 0 #0A0A0A', fontFamily: 'Pretendard, sans-serif' }}
    >
      <span className="text-base">🎸</span>
      <span className="text-[13px] font-bold text-[#0A0A0A]/60">지금까지</span>
      <motion.span
        key={count}
        initial={{ scale: 1.3, color: '#FF3D77' }}
        animate={{ scale: 1, color: '#0A0A0A' }}
        transition={{ duration: 0.4 }}
        className="text-[15px] font-bold"
        style={{ fontFamily: 'Bungee, sans-serif' }}
      >
        {count.toLocaleString()}
      </motion.span>
      <span className="text-[13px] font-bold text-[#0A0A0A]/60">명 방문</span>
    </motion.div>
  );
}
