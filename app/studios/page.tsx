'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Studio, StudioFilters } from '@/types/studio';
import StudioCard from '@/components/StudioCard';
import StudioFilter from '@/components/StudioFilter';
import { expandRegion } from '@/lib/region-alias';
import { sortByDistanceAndQuality, sortByQuality } from '@/lib/sort';

const PAGE_SIZE = 20;

export default function StudiosPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-brand-red border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <StudiosContent />
    </Suspense>
  );
}

function StudiosContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const lat = searchParams.get('lat') ? Number(searchParams.get('lat')) : undefined;
  const lng = searchParams.get('lng') ? Number(searchParams.get('lng')) : undefined;
  const region = searchParams.get('region') ?? '';
  const quickFilter = searchParams.get('filter');

  const [studios, setStudios] = useState<Studio[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<StudioFilters>(() => {
    const initial: StudioFilters = {
      radius: searchParams.get('radius') ? Number(searchParams.get('radius')) : 3,
    };
    if (quickFilter === 'drum') initial.has_drum = true;
    if (quickFilter === 'troom') initial.room_type = 'T';
    return initial;
  });
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState(region);

  const fetchStudios = useCallback(async (pageNum: number, reset = false) => {
    setLoading(true);

    let query = supabase
      .from('studios')
      .select('*')
      .eq('is_published', true)
      .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

    if (filters.room_type) {
      query = query.or(`room_type.eq.${filters.room_type},room_type.eq.both`);
    }
    if (filters.has_drum) {
      query = query.eq('has_drum', true);
    }
    if (filters.max_price) {
      query = query.lte('price_per_hour', filters.max_price);
    }
    // 텍스트 검색: region 파라미터 또는 GPS 검색의 region 폴백
    const searchRegion = region || '';
    if (searchRegion) {
      const terms = expandRegion(searchRegion);
      const orConditions = terms
        .flatMap((t) => [`address.ilike.%${t}%`, `region.ilike.%${t}%`, `name.ilike.%${t}%`])
        .join(',');
      query = query.or(orConditions);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Fetch error:', error);
      setLoading(false);
      return;
    }

    let results = (data ?? []) as Studio[];

    // 정렬: GPS 검색은 거리구간+완성도, 텍스트 검색은 완성도순
    if (lat && lng) {
      const withCoords = results.filter((s) => s.lat != null && s.lng != null);
      if (withCoords.length > 0) {
        const radius = filters.radius ?? 3;
        const sorted = sortByDistanceAndQuality(withCoords, lat, lng);
        results = sorted.filter((s) => s.distance <= radius);
      }
    } else {
      results = sortByQuality(results);
    }

    setHasMore(results.length === PAGE_SIZE);

    if (reset) {
      setStudios(results);
    } else {
      setStudios((prev) => [...prev, ...results]);
    }
    setLoading(false);
  }, [lat, lng, region, filters]);

  useEffect(() => {
    setPage(0);
    fetchStudios(0, true);
  }, [fetchStudios]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/studios?region=${encodeURIComponent(searchQuery.trim())}`);
    }
  }

  return (
    <div className="min-h-screen pb-4">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-brand-bg/95 backdrop-blur border-b border-brand-border px-4 py-3 space-y-3">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/')} className="text-brand-muted">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <form onSubmit={handleSearch} className="flex-1 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="지역 검색"
              className="w-full px-3 py-2 bg-brand-card border border-brand-border rounded-lg text-sm placeholder:text-brand-muted focus:outline-none focus:border-brand-red"
            />
          </form>
        </div>

        <div className="flex items-center justify-between">
          <StudioFilter filters={filters} onChange={setFilters} />
          <span className="text-xs text-brand-muted">
            {studios.length}개 연습실
          </span>
        </div>
      </div>

      {/* List */}
      <div className="px-4 mt-4">
        {loading && studios.length === 0 ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-brand-red border-t-transparent rounded-full animate-spin" />
          </div>
        ) : studios.length === 0 ? (
          <div className="text-center py-20 text-brand-muted">
            <p className="text-lg">검색 결과가 없습니다</p>
            <p className="text-sm mt-1">다른 지역이나 필터를 시도해보세요</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              {studios.map((studio) => (
                <StudioCard
                  key={studio.id}
                  studio={studio}
                  userLat={lat}
                  userLng={lng}
                />
              ))}
            </div>

            {hasMore && (
              <button
                onClick={() => {
                  const next = page + 1;
                  setPage(next);
                  fetchStudios(next);
                }}
                disabled={loading}
                className="w-full mt-4 py-3 text-sm text-brand-muted border border-brand-border rounded-xl disabled:opacity-50"
              >
                {loading ? '로딩 중...' : '더 보기'}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
