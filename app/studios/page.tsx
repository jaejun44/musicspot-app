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
        <div className="min-h-screen bg-comic-cream flex items-center justify-center">
          <div
            className="bg-comic-yellow border-[3px] border-comic-black font-bungee text-sm px-6 py-3"
            style={{ boxShadow: '4px 4px 0 #0A0A0A' }}
          >
            로딩 중...
          </div>
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
    if (qRoomType) initial.room_type = qRoomType;
    if (qHasDrum) initial.has_drum = true;
    if (quickFilter === 'drum') initial.has_drum = true;
    if (quickFilter === 'troom') initial.room_type = 'T';
    return initial;
  });
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState(region);

  const isGpsSearch = !!(lat && lng);

  const fetchGpsStudios = useCallback(async () => {
    setLoading(true);

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
    <div className="min-h-screen bg-comic-cream pb-4">
      {/* ── Header ── */}
      <div className="sticky top-0 z-20 bg-comic-cream border-b-[3px] border-comic-black px-4 py-3 space-y-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/')}
            className="w-8 h-8 flex items-center justify-center border-[2px] border-comic-black bg-white hover:bg-comic-yellow transition-colors"
            style={{ boxShadow: '2px 2px 0 #0A0A0A' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="지역명 또는 상호명 검색"
              className="flex-1 px-3 py-2 bg-white border-[2px] border-comic-black text-sm font-medium placeholder:text-comic-black/40 focus:outline-none focus:border-comic-pink"
              style={{ boxShadow: '2px 2px 0 #0A0A0A' }}
            />
            <button
              type="submit"
              className="px-3 py-2 bg-comic-pink border-[2px] border-comic-black text-white text-xs font-bold"
              style={{ boxShadow: '2px 2px 0 #0A0A0A' }}
            >
              검색
            </button>
          </form>
        </div>

        <QuickPresets showActive />

        <div className="flex items-center justify-between">
          <StudioFilter filters={filters} onChange={setFilters} />
          <span
            className="text-xs font-bold bg-comic-black text-comic-yellow px-2 py-1"
            style={{ boxShadow: '2px 2px 0 #FF3D77' }}
          >
            {studios.length}개
          </span>
        </div>
      </div>

      {/* ── List ── */}
      <div className="px-4 mt-4">
        {loading && studios.length === 0 ? (
          <div className="flex justify-center py-20">
            <div
              className="bg-comic-yellow border-[3px] border-comic-black font-bold text-sm px-6 py-3 animate-pulse"
              style={{ boxShadow: '4px 4px 0 #0A0A0A' }}
            >
              🎵 연습실 찾는 중...
            </div>
          </div>
        ) : studios.length === 0 ? (
          <div className="text-center py-20">
            <div
              className="inline-block bg-white border-[3px] border-comic-black px-8 py-6"
              style={{ boxShadow: '6px 6px 0 #0A0A0A' }}
            >
              <p className="font-bungee text-2xl text-comic-pink mb-2">Hmm...</p>
              <p className="text-sm font-bold">검색 결과가 없습니다</p>
              <p className="text-xs text-comic-black/50 mt-1">다른 지역이나 필터를 시도해보세요</p>
            </div>
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
                    const end = (next + 1) * PAGE_SIZE;
                    setStudios(allGpsResults.slice(0, end));
                    setHasMore(end < allGpsResults.length);
                  } else {
                    fetchTextStudios(next);
                  }
                }}
                disabled={loading}
                className="w-full mt-4 py-3 font-bold text-sm border-[3px] border-comic-black bg-white hover:bg-comic-yellow transition-colors disabled:opacity-50"
                style={{ boxShadow: '4px 4px 0 #0A0A0A' }}
              >
                {loading ? '로딩 중...' : '더 보기 ↓'}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
