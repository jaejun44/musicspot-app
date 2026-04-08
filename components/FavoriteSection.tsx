'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { getFavorites } from '@/lib/favorites';
import { Studio } from '@/types/studio';
import FavoriteButton from './FavoriteButton';

export default function FavoriteSection() {
  const [studios, setStudios] = useState<Studio[]>([]);

  useEffect(() => {
    async function load() {
      const ids = getFavorites();
      if (ids.length === 0) return;

      const { data } = await supabase
        .from('studios')
        .select('*')
        .in('id', ids);

      if (data) setStudios(data as Studio[]);
    }
    load();
  }, []);

  if (studios.length === 0) return null;

  return (
    <div className="w-full mt-6">
      <h2 className="text-sm font-semibold text-white mb-3">
        내가 찜한 연습실
      </h2>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x">
        {studios.map((s) => (
          <Link
            key={s.id}
            href={`/studios/${s.id}`}
            className="w-64 shrink-0 snap-start bg-brand-card/80 backdrop-blur border border-brand-border rounded-xl overflow-hidden"
          >
            <div className="relative h-32 bg-brand-border">
              {s.photos?.[0] ? (
                <img
                  src={s.photos[0]}
                  alt={s.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-brand-muted">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                </div>
              )}
              <div className="absolute top-1 right-1">
                <FavoriteButton studioId={s.id} studioName={s.name} />
              </div>
            </div>
            <div className="p-2.5">
              <p className="text-sm font-medium truncate">{s.name}</p>
              <p className="text-xs text-brand-muted mt-0.5">
                {s.price_per_hour
                  ? `₩${s.price_per_hour.toLocaleString()}/시간`
                  : s.price_info || '가격 문의'}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
