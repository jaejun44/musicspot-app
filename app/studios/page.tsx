'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Studio, StudioFilters } from '@/types/studio';
import StudioCard from '@/components/StudioCard';
import StudioFilter from '@/components/StudioFilter';
import { expandRegion } from '@/lib/region-alias';
import { sortByDistanceAndQuality } from '@/lib/sort';
import QuickPresets from '@/components/QuickPresets';

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
  const qRoomType = searchParams.get('room_type') as 'T' | 'M' | null;
  const qHasDrum = searchParams.get('has_drum') === 'true';
  const quickFilter = searchParams.get('filter');

  const [studios, setStudios] = useState<Studio[]>([]);
  const [allGpsResults, setAllGpsResults] = useState<Studio[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<StudioFilters>(() => {
    const initial: StudioFilters = {
      radius: searchParams.get('radius') ? Number(searchParams.get('radius')) : 3,
    };
    // URL 쿼리 파라미터에서 필터 초기값 설정
    if (qRoomType) initial.room_type = qRoomType;
    if (qHasDrum) initial.has_drum = true;
    // 레거시 filter 파라미터 호환
    if (quickFilter === 'drum') initial.has_drum = true;
    if (quickFilter === 'troom') initial.room_type = 'T';
    return initial;
  });
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState(region);

  const isGpsSearch = !!(lat && lng);

  // GPS 검색: 반경 내 전체를 한번에 가져와서 프론트 정렬 후 slice
  const fetchGpsStudios = useCallback(async () => {
    setLoading(true);

    // Supabase 1,000건 제한 우회: 배치로 전체 fetch
    const all: Studio[] = [];
    let offset = 0;
    const BATCH = 1000;
    while (true) {
      let query = supabase
        .from('studios')
        .select('*')
        .eq('is_published', true)
        .range(offset, offset + BATCH - 1);

      if (filters.room_type) {
        query = query.or(`room_type.eq.${filters.room_type},room_type.eq.both`);
      }
      if (filters.has_drum) {
        query = query.eq('has_drum', true);
      }
      if (filters.max_price) {
        query = query.lte('price_per_hour', filters.max_price);
      }

      const { data, error } = await query;
      if (error) {
        console.error('Fetch error:', error);
        break;
      }
      all.push(...((data ?? []) as Studio[]));
      if ((data ?? []).length < BATCH) break;
      offset += BATCH;
    }

    if (all.length === 0) {
      setLoading(false);
      return;
    }
    const withCoords = all.filter((s) => s.lat != null && s.lng != null);
    const radius = filters.radius ?? 3;
    const sorted = sortByDistanceAndQuality(withCoords, lat!, lng!);
    const filtered = sorted.filter((s) => s.distance <= radius);

    setAllGpsResults(filtered);
    setStudios(filtered.slice(0, PAGE_SIZE));
    setHasMore(filtered.length > PAGE_SIZE);
    setPage(0);
    setLoading(false);
  }, [lat, lng, filters]);

  // 텍스트 검색: 서버에서 완성도순 정렬 + 페이지네이션
  const fetchTextStudios = useCallback(async (pageNum: number, reset = false) => {
    setLoading(true);

    let query = supabase
      .from('studios')
      .select('*')
      .eq('is_published', true)
      .order('data_quality_score', { ascending: false })
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

    const results = (data ?? []) as Studio[];
    setHasMore(results.length === PAGE_SIZE);

    if (reset) {
      setStudios(results);
    } else {
      setStudios((prev) => [...prev, ...results]);
    }
    setLoading(false);
  }, [region, filters]);

  useEffect(() => {
    if (isGpsSearch) {
      fetchGpsStudios();
    } else {
      setPage(0);
      fetchTextStudios(0, true);
    }
  }, [isGpsSearch, fetchGpsStudios, fetchTextStudios]);

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

        <QuickPresets showActive />

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
                  if (isGpsSearch) {
                    // GPS: 이미 정렬된 전체 배열에서 slice
                    const end = (next + 1) * PAGE_SIZE;
                    setStudios(allGpsResults.slice(0, end));
                    setHasMore(end < allGpsResults.length);
                  } else {
                    // 텍스트: 서버 페이지네이션
                    fetchTextStudios(next);
                  }
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
