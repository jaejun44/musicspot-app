'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useStudios } from '@/hooks/useStudios';
import { StudioFilters } from '@/types/studio';

interface UseRoomSearchReturn {
  studios: ReturnType<typeof useStudios>['studios'];
  loading: boolean;
  hasMore: boolean;
  totalCount: number;
  query: string;
  userLat: number | null;
  userLng: number | null;
  filters: StudioFilters;
  loadMore: () => void;
  onFilterChange: (next: StudioFilters) => void;
  onQueryChange: (q: string) => void;
  onSubmit: () => void;
  onGps: () => void;
}

export function useRoomSearch(): UseRoomSearchReturn {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { studios, loading, hasMore, totalCount, search, loadMore } = useStudios();

  // Parse URL params
  const query = searchParams.get('q') ?? '';
  const urlLat = searchParams.get('lat');
  const urlLng = searchParams.get('lng');
  const userLat = urlLat ? parseFloat(urlLat) : null;
  const userLng = urlLng ? parseFloat(urlLng) : null;

  // Parse filter params from URL
  const filterRoomType = searchParams.get('room_type') as StudioFilters['room_type'] | null;
  const filterDrum = searchParams.get('has_drum') === '1';
  const filterMaxPrice = searchParams.get('max_price') ? Number(searchParams.get('max_price')) : undefined;
  const filterRadius = searchParams.get('radius') ? Number(searchParams.get('radius')) : undefined;

  const filters: StudioFilters = {
    room_type: filterRoomType ?? undefined,
    has_drum: filterDrum || undefined,
    max_price: filterMaxPrice,
    radius: filterRadius,
  };

  // Ref to track whether initial search has run to avoid duplicate effects
  const initializedRef = useRef(false);

  // Run search whenever URL params change
  useEffect(() => {
    const opts = {
      region: query || undefined,
      lat: userLat ?? undefined,
      lng: userLng ?? undefined,
      filters,
    };
    search(opts);
    initializedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString()]);

  /** Push updated params to URL, triggering re-search via effect */
  function buildUrl(overrides: {
    q?: string;
    lat?: number | null;
    lng?: number | null;
    filters?: StudioFilters;
  }) {
    const params = new URLSearchParams();
    const q = overrides.q ?? query;
    const lat = overrides.lat !== undefined ? overrides.lat : userLat;
    const lng = overrides.lng !== undefined ? overrides.lng : userLng;
    const f = overrides.filters ?? filters;

    if (q) params.set('q', q);
    if (lat != null) params.set('lat', String(lat));
    if (lng != null) params.set('lng', String(lng));
    if (f.room_type) params.set('room_type', f.room_type);
    if (f.has_drum) params.set('has_drum', '1');
    if (f.max_price) params.set('max_price', String(f.max_price));
    if (f.radius) params.set('radius', String(f.radius));

    return `/search?${params.toString()}`;
  }

  const onFilterChange = useCallback(
    (next: StudioFilters) => {
      router.push(buildUrl({ filters: next }));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [query, userLat, userLng, filters]
  );

  const queryRef = useRef(query);
  queryRef.current = query;

  const onQueryChange = useCallback((q: string) => {
    queryRef.current = q;
  }, []);

  const onSubmit = useCallback(() => {
    router.push(buildUrl({ q: queryRef.current, lat: null, lng: null }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const onGps = useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        router.push(
          buildUrl({ lat: coords.latitude, lng: coords.longitude, q: '' })
        );
      },
      () => alert('위치 권한을 허용해 주세요.')
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  return {
    studios,
    loading,
    hasMore,
    totalCount,
    query,
    userLat,
    userLng,
    filters,
    loadMore,
    onFilterChange,
    onQueryChange,
    onSubmit,
    onGps,
  };
}
