'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useT } from '@/lib/i18n';

export default function VisitorCounter() {
  const t = useT();
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    async function recordAndFetch() {
      // 같은 브라우저에서 24시간 내 재방문이면 카운트 중복 적립 안 함.
      // (IP 기준 중복 제거는 서버에서 요청 IP를 읽어야 해서 별도 API가 필요함.
      //  방문자 수는 정확한 지표가 아니라 보여주기용 카운터라 브라우저 기준으로 충분함.)
      const STORAGE_KEY = 'ms_visit_counted_at';
      const ONE_DAY_MS = 24 * 60 * 60 * 1000;
      const lastCounted = Number(localStorage.getItem(STORAGE_KEY) ?? 0);
      const isNewVisit = Date.now() - lastCounted > ONE_DAY_MS;

      if (isNewVisit) {
        await supabase.from('page_views').insert({ path: '/' });
        localStorage.setItem(STORAGE_KEY, String(Date.now()));
      }

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
      <span className="text-[13px] font-bold text-[#0A0A0A]/60">{t('지금까지')}</span>
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
      <span className="text-[13px] font-bold text-[#0A0A0A]/60">{t('명 방문')}</span>
    </motion.div>
  );
}
