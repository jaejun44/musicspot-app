'use client';

import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Studio, StudioFilters } from '@/types/studio';
import { sortByDistanceAndQuality } from '@/lib/sort';
import { expandRegion, regionCity } from '@/lib/region-alias';

const PAGE_SIZE = 20;
const BATCH_SIZE = 1000;
interface UseStudiosOptions {
  lat?: number;
  lng?: number;
  region?: string;
  filters?: StudioFilters;
}

// 검색어의 PostgREST OR 구문 문자를 제거해 잘못된 쿼리를 방지한다.
function searchTerms(value: string) {
  return expandRegion(value.replace(/[,().%_*\\"']/g, ' ').trim()).filter(Boolean);
}

export function useStudios() {
  const [studios, setStudios] = useState<Studio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const generation = useRef(0);
  const busy = useRef(false);
  const cached = useRef<Studio[]>([]);
  const page = useRef(0);
  const lastOpts = useRef<UseStudiosOptions>({});

  const fetchPage = useCallback(async (opts: UseStudiosOptions, pageNum: number, request: number) => {
    busy.current = true;
    setLoading(true);
    setError(null);
    const gps = Number.isFinite(opts.lat) && Number.isFinite(opts.lng);
    try {
      const makeQuery = () => {
        let query = supabase.from('studios').select('*', { count: 'exact' }).eq('is_published', true)
          .or('category.ilike.%악기%,category.ilike.%보컬%,category.ilike.%녹음%,category.ilike.%합주%,category.ilike.%개인연습실%');
        const f = opts.filters;
        if (f?.room_type) query = query.or(`room_type.eq.${f.room_type},room_type.eq.both`);
        if (f?.has_drum) query = query.eq('has_drum', true);
        if (f?.max_price) query = query.lte('price_per_hour', f.max_price);
        for (const [value, includeName] of [[f?.region, false], [opts.region, true]] as const) {
          if (!value) continue;
          const terms = searchTerms(value);
          const city = regionCity(value);
          if (city) query = query.or(`address.ilike.%${city}%,region.ilike.%${city}%`);
          if (terms.length) query = query.or(terms.flatMap(t => [
            `address.ilike.%${t}%`, `region.ilike.%${t}%`, ...(includeName ? [`name.ilike.%${t}%`] : []),
          ]).join(','));
        }
        if (f?.sort_by === 'price') query = query.order('price_per_hour', { ascending: true, nullsFirst: false });
        else query = query.order('data_quality_score', { ascending: false }).order('review_avg', { ascending: false, nullsFirst: false });
        return query.order('id', { ascending: true });
      };

      if (gps) {
        // 모든 필터를 적용한 전체 배치를 거리 정렬. RPC의 200개 상한/필터 누락 방지.
        const all: Studio[] = [];
        for (let offset = 0; ; offset += BATCH_SIZE) {
          const { data, error: failure } = await makeQuery().range(offset, offset + BATCH_SIZE - 1);
          if (request !== generation.current) return;
          if (failure) throw failure;
          all.push(...(data ?? []) as Studio[]);
          if (!data || data.length < BATCH_SIZE) break;
        }
        let results = sortByDistanceAndQuality(all.filter(s => s.lat != null && s.lng != null), opts.lat!, opts.lng!)
          .filter(s => s.distance <= (opts.filters?.radius ?? 3));
        if (opts.filters?.sort_by === 'price') results = results.sort((a, b) => (a.price_per_hour ?? Infinity) - (b.price_per_hour ?? Infinity));
        cached.current = results;
        setStudios(results.slice(0, PAGE_SIZE));
        setTotalCount(results.length);
        setHasMore(results.length > PAGE_SIZE);
      } else {
        const { data, count, error: failure } = await makeQuery().range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);
        if (request !== generation.current) return;
        if (failure) throw failure;
        const results = (data ?? []) as Studio[];
        setStudios(prev => pageNum === 0 ? results : [...prev, ...results]);
        setTotalCount(count ?? results.length);
        setHasMore((pageNum + 1) * PAGE_SIZE < (count ?? 0));
      }
      page.current = pageNum;
    } catch {
      if (request === generation.current) setError('연습실 정보를 불러오지 못했어요. 연결을 확인하고 다시 시도해 주세요.');
    } finally {
      if (request === generation.current) {
        busy.current = false;
        setLoading(false);
      }
    }
  }, []);

  const search = useCallback(async (opts: UseStudiosOptions) => {
    lastOpts.current = opts;
    page.current = 0;
    cached.current = [];
    setStudios([]);
    setTotalCount(0);
    setHasMore(false);
    await fetchPage(opts, 0, ++generation.current);
  }, [fetchPage]);

  const loadMore = useCallback(() => {
    if (busy.current) return;
    const next = page.current + 1;
    if (Number.isFinite(lastOpts.current.lat) && Number.isFinite(lastOpts.current.lng)) {
      page.current = next;
      setStudios(cached.current.slice(0, (next + 1) * PAGE_SIZE));
      setHasMore((next + 1) * PAGE_SIZE < cached.current.length);
    } else void fetchPage(lastOpts.current, next, generation.current);
  }, [fetchPage]);

  const retry = useCallback(() => {
    if (!busy.current) void fetchPage(lastOpts.current, studios.length ? page.current + 1 : 0, generation.current);
  }, [fetchPage, studios.length]);

  return { studios, loading, error, retry, hasMore, totalCount, search, loadMore };
}
