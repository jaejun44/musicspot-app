'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { trackSearch } from '@/lib/analytics';

export default function SearchBar() {
  const router = useRouter();
  const [location, setLocation] = useState('');
  const [drum, setDrum] = useState(false);
  const [maxPrice, setMaxPrice] = useState('');
  const inputClass = 'w-full px-4 py-3 border-[3px] border-[#0A0A0A] rounded-xl bg-[#FFF8F0]';

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (location.trim()) params.set('q', location.trim());
    if (drum) params.set('has_drum', '1');
    if (maxPrice) params.set('max_price', maxPrice);
    trackSearch('text', location.trim());
    router.push(`/search?${params.toString()}`);
  }

  return (
    <section id="search-bar" className="relative z-30 px-4 md:px-8 py-12" aria-labelledby="studio-search-title">
      <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        className="max-w-[1200px] mx-auto bg-white p-5 md:p-8 rounded-[24px] border-[4px] border-[#0A0A0A]"
        style={{ boxShadow: '8px 8px 0 #0A0A0A' }}>
        <h2 id="studio-search-title" className="text-2xl font-bold mb-2">이번 합주, 어디서 할까요?</h2>
        <p className="mb-6 text-sm">가입 없이 지역·가격·드럼 여부로 찾고, 연습실에 바로 문의하세요.</p>
        <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="min-w-0">
            <label htmlFor="home-location" className="block mb-2 font-bold">지역 또는 연습실 이름</label>
            <input id="home-location" value={location} onChange={e => setLocation(e.target.value)}
              placeholder="예: 홍대, 사당, 강남" maxLength={100} className={inputClass} />
          </div>
          <div>
            <label htmlFor="home-price" className="block mb-2 font-bold">시간당 예산</label>
            <select id="home-price" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} className={inputClass}>
              <option value="">전체 가격</option>
              <option value="10000">1만 원 이하</option>
              <option value="20000">2만 원 이하</option>
              <option value="30000">3만 원 이하</option>
            </select>
          </div>
          <label className={`${inputClass} flex items-center gap-3 cursor-pointer`}>
            <input type="checkbox" checked={drum} onChange={e => setDrum(e.target.checked)} className="w-5 h-5" />
            드럼 있는 곳만
          </label>
          <motion.button type="submit" whileTap={{ scale: 0.95 }}
            className="px-6 py-3 bg-[#FF3D77] text-white rounded-xl border-[3px] border-[#0A0A0A] font-bold text-lg"
            style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>연습실 찾기 →</motion.button>
        </form>
        <p className="text-xs mt-4 text-[#0A0A0A]/60">가격이 등록된 곳에 예산 필터가 적용됩니다. 예약 가능 시간과 최종 가격은 업체에 확인해 주세요.</p>
        <div className="flex flex-wrap gap-3 mt-5 text-sm font-bold">
          {[['hongdae', '홍대'], ['gangnam', '강남'], ['sadang', '사당']].map(([slug, label]) => (
            <Link key={slug} href={`/region/${slug}`} className="underline underline-offset-4">{label} 연습실</Link>
          ))}
          <Link href="/region" className="underline underline-offset-4">전체 지역 →</Link>
        </div>
      </motion.div>
    </section>
  );
}
