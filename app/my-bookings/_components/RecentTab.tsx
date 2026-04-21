'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { getRecentStudioIds } from '@/lib/recentlyViewed';
import { supabase } from '@/lib/supabase';
import { Studio } from '@/types/studio';
import StudioMiniCard from './StudioMiniCard';

export default function RecentTab() {
  const router = useRouter();
  const [studios, setStudios] = useState<Studio[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ids = getRecentStudioIds();
    if (ids.length === 0) { setLoading(false); return; }

    supabase
      .from('studios')
      .select('*')
      .in('id', ids)
      .eq('is_published', true)
      .then(({ data }) => {
        if (data) {
          // 최근 본 순서 유지
          const map = new Map((data as Studio[]).map((s) => [s.id, s]));
          setStudios(ids.map((id) => map.get(id)).filter(Boolean) as Studio[]);
        }
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 0.9, ease: 'linear' }}
          className="w-8 h-8 rounded-full border-[3px] border-[#FF3D77] border-t-transparent"
        />
      </div>
    );
  }

  if (studios.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-16 px-4"
      >
        <div
          className="w-20 h-20 rounded-full bg-[#4FC3F7] border-[3px] border-[#0A0A0A] flex items-center justify-center mb-5"
          style={{ boxShadow: '4px 4px 0 #0A0A0A' }}
        >
          <span className="text-[32px]">👀</span>
        </div>
        <p
          className="text-[18px] font-bold text-[#0A0A0A] mb-2 text-center"
          style={{ fontFamily: 'Bungee, sans-serif' }}
        >
          NO HISTORY YET
        </p>
        <p
          className="text-[13px] text-[#0A0A0A]/50 font-bold text-center mb-6"
          style={{ fontFamily: 'Pretendard, sans-serif' }}
        >
          최근 본 연습실이 여기 나타나요 🎵
        </p>
        <motion.button
          onClick={() => router.push('/search')}
          whileTap={{ scale: 0.95, y: 2 }}
          className="px-6 py-3 bg-[#4FC3F7] rounded-[14px] border-[3px] border-[#0A0A0A] text-[#0A0A0A] font-bold text-[14px]"
          style={{ boxShadow: '3px 3px 0 #0A0A0A', fontFamily: 'Bungee, sans-serif' }}
        >
          🔍 연습실 둘러보기
        </motion.button>
      </motion.div>
    );
  }

  return (
    <div>
      <p
        className="text-[12px] text-[#0A0A0A]/40 font-bold mb-3"
        style={{ fontFamily: 'Pretendard, sans-serif' }}
      >
        최근 본 {studios.length}개
      </p>
      <div className="grid grid-cols-2 gap-3">
        {studios.map((studio, i) => (
          <StudioMiniCard key={studio.id} studio={studio} index={i} />
        ))}
      </div>
    </div>
  );
}
