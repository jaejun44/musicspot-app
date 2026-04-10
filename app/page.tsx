'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { trackSearch } from '@/lib/analytics';
import FavoriteSection from '@/components/FavoriteSection';
import QuickPresets from '@/components/QuickPresets';
import RecentlyViewedSection from '@/components/RecentlyViewedSection';

export default function HomePage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [visitCount, setVisitCount] = useState<number | null>(null);

  useEffect(() => {
    async function recordAndCount() {
      // 방문 기록
      const { error: insertErr } = await supabase
        .from('page_views')
        .insert({ path: '/' });
      if (insertErr) console.error('page_views insert:', insertErr.message);

      // 카운트 조회 (insert 실패해도 시도)
      const { count, error: countErr } = await supabase
        .from('page_views')
        .select('*', { count: 'exact', head: true });
      if (countErr) console.error('page_views count:', countErr.message);
      if (count !== null) setVisitCount(count);
    }
    recordAndCount();
  }, []);

  async function handleGPS() {
    setLoading(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        })
      );
      trackSearch('gps');
      router.push(
        `/studios?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}&radius=3`
      );
    } catch {
      alert('위치 정보를 가져올 수 없습니다. 위치 권한을 확인해주세요.');
    } finally {
      setLoading(false);
    }
  }

  async function handleTextSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const res = await fetch(
        `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}`,
        {
          headers: { Authorization: `KakaoAK ${process.env.NEXT_PUBLIC_KAKAO_MAP_KEY}` },
        }
      );
      const data = await res.json();

      if (data.documents?.length > 0) {
        const { y: lat, x: lng } = data.documents[0];
        trackSearch('text', query);
        router.push(
          `/studios?lat=${lat}&lng=${lng}&region=${encodeURIComponent(query)}&radius=3`
        );
      } else {
        router.push(`/studios?region=${encodeURIComponent(query)}`);
      }
    } catch {
      router.push(`/studios?region=${encodeURIComponent(query)}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-end px-6 pb-16 overflow-hidden">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-[center_top_30%] bg-no-repeat"
        style={{ backgroundImage: "url('/hero-bg.png')" }}
      />
      {/* Subtle gradient overlay — only at the very bottom for search area */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />

      {/* Content — sits above the background */}
      <div className="relative z-10 w-full max-w-md flex flex-col items-center">
        {/* Tagline — logo is already in the background image */}
        <p className="text-white/70 text-sm mb-6">
          내 밴드에 맞는 연습실, 지금 바로 찾기
        </p>

        {/* Search */}
        <form onSubmit={handleTextSearch} className="w-full space-y-3">
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="검색 (예: 지역, 상호)"
              className="w-full px-4 py-3.5 bg-brand-card/80 backdrop-blur border border-brand-border rounded-xl text-sm placeholder:text-brand-muted focus:outline-none focus:border-brand-red"
            />
            <button
              type="submit"
              disabled={loading}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-brand-red text-white text-xs rounded-lg font-semibold disabled:opacity-50"
            >
              검색
            </button>
          </div>

          <button
            type="button"
            onClick={handleGPS}
            disabled={loading}
            className="w-full py-3.5 bg-brand-card/60 backdrop-blur border border-brand-border rounded-xl text-sm font-medium flex items-center justify-center gap-2 hover:border-brand-red/50 transition-colors disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            {loading ? '위치 확인 중...' : '현재 위치로 찾기'}
          </button>
        </form>

        {/* Quick Presets */}
        <div className="w-full mt-5">
          <QuickPresets />
        </div>

        {/* Recently Viewed */}
        <RecentlyViewedSection />

        {/* Favorites */}
        <FavoriteSection />

        {/* Visit counter + Feedback link */}
        <div className="mt-8 text-center space-y-3">
          <Link
            href="/feedback"
            className="text-sm text-[#E84040] hover:text-[#ff6060] underline underline-offset-4 transition-colors"
          >
            건의사항 남기기 →
          </Link>
          {visitCount !== null && (
            <p className="text-sm text-white">
              지금까지 {visitCount.toLocaleString()}명이 방문했어요 🎸
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
