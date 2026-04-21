'use client';

import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Studio, StudioFilters } from '@/types/studio';
import { sortByDistanceAndQuality } from '@/lib/sort';
import { expandRegion } from '@/lib/region-alias';

const PAGE_SIZE = 20;
const BATCH_SIZE = 1000;

interface UseStudiosOptions {
  lat?: number;
  lng?: number;
  region?: string;
  filters?: StudioFilters;
}

interface UseStudiosReturn {
  studios: Studio[];
  loading: boolean;
  hasMore: boolean;
  totalCount: number;
  search: (opts: UseStudiosOptions) => Promise<void>;
  loadMore: () => void;
}

export function useStudios(): UseStudiosReturn {
  const [studios, setStudios] = useState<Studio[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  // GPS 모드일 때 전체 결과를 캐싱해 클라이언트 페이지네이션에 활용
  const gpsResultsRef = useRef<Studio[]>([]);
  const pageRef = useRef(0);
  const modeRef = useRef<'gps' | 'text'>('text');
  const lastOptsRef = useRef<UseStudiosOptions>({});

  /** Supabase 쿼리에 공통 필터 적용 */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function applyFilters(query: any, filters?: StudioFilters) {
    if (!filters) return query;
    if (filters.room_type) {
      query = query.or(`room_type.eq.${filters.room_type},room_type.eq.both`);
    }
    if (filters.has_drum) {
      query = query.eq('has_drum', true);
    }
    if (filters.max_price) {
      query = query.lte('price_per_hour', filters.max_price);
    }
    return query;
  }

  /** GPS 모드: 전체 배치 fetch → 거리 정렬 → 반경 필터 → 클라이언트 페이지네이션 */
  const fetchGps = useCallback(async (opts: UseStudiosOptions) => {
    const { lat, lng, filters } = opts;
    if (!lat || !lng) return;

    setLoading(true);
    const all: Studio[] = [];
    let offset = 0;

    while (true) {
      let query = supabase
        .from('studios')
        .select('*')
        .eq('is_published', true)
        .range(offset, offset + BATCH_SIZE - 1);

      query = applyFilters(query, filters);

      const { data, error } = await query;
      if (error || !data) break;

      all.push(...(data as Studio[]));
      if (data.length < BATCH_SIZE) break;
      offset += BATCH_SIZE;
    }

    const withCoords = all.filter((s) => s.lat != null && s.lng != null);
    const radius = filters?.radius ?? 3;
    const sorted = sortByDistanceAndQuality(withCoords, lat, lng);
    const inRadius = sorted.filter((s) => (s as any).distance <= radius);

    gpsResultsRef.current = inRadius;
    pageRef.current = 0;

    const firstPage = inRadius.slice(0, PAGE_SIZE);
    setStudios(firstPage);
    setTotalCount(inRadius.length);
    setHasMore(inRadius.length > PAGE_SIZE);
    setLoading(false);
  }, []);

  /** 텍스트 모드: 서버사이드 페이지네이션 */
  const fetchText = useCallback(async (opts: UseStudiosOptions, pageNum: number, append = false) => {
    const { region, filters } = opts;
    setLoading(true);

    let query = supabase
      .from('studios')
      .select('*')
      .eq('is_published', true)
      .order('data_quality_score', { ascending: false })
      .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

    query = applyFilters(query, filters);

    if (region) {
      const terms = expandRegion(region);
      const orConditions = terms
        .flatMap((t) => [
          `address.ilike.%${t}%`,
          `region.ilike.%${t}%`,
          `name.ilike.%${t}%`,
        ])
        .join(',');
      query = query.or(orConditions);
    }

    const { data, error } = await query;
    if (error || !data) {
      setLoading(false);
      return;
    }

    const results = data as Studio[];
    setHasMore(results.length === PAGE_SIZE);

    if (append) {
      setStudios((prev) => [...prev, ...results]);
    } else {
      setStudios(results);
      setTotalCount(results.length); // 텍스트 모드는 정확한 total 없이 누적
    }
    setLoading(false);
  }, []);

  const search = useCallback(
    async (opts: UseStudiosOptions) => {
      lastOptsRef.current = opts;
      pageRef.current = 0;

      if (opts.lat && opts.lng) {
        modeRef.current = 'gps';
        await fetchGps(opts);
      } else {
        modeRef.current = 'text';
        await fetchText(opts, 0, false);
      }
    },
    [fetchGps, fetchText]
  );

  const loadMore = useCallback(() => {
    const nextPage = pageRef.current + 1;
    pageRef.current = nextPage;

    if (modeRef.current === 'gps') {
      const end = (nextPage + 1) * PAGE_SIZE;
      setStudios(gpsResultsRef.current.slice(0, end));
      setHasMore(end < gpsResultsRef.current.length);
    } else {
      fetchText(lastOptsRef.current, nextPage, true);
    }
  }, [fetchText]);

  return { studios, loading, hasMore, totalCount, search, loadMore };
}
