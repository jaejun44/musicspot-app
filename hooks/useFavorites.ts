'use client';

import { useState, useEffect, useCallback } from 'react';
import { getFavorites, toggleFavorite } from '@/lib/favorites';

interface UseFavoritesReturn {
  favoriteIds: string[];
  isFav: (id: string) => boolean;
  toggle: (id: string) => boolean;
}

export function useFavorites(): UseFavoritesReturn {
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  useEffect(() => {
    setFavoriteIds(getFavorites());
  }, []);

  const toggle = useCallback((id: string): boolean => {
    const isNowFav = toggleFavorite(id);
    setFavoriteIds(getFavorites());
    return isNowFav;
  }, []);

  const isFav = useCallback(
    (id: string) => favoriteIds.includes(id),
    [favoriteIds]
  );

  return { favoriteIds, isFav, toggle };
}
