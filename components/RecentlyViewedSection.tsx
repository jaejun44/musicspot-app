'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { getRecentStudioIds } from '@/lib/recentlyViewed';
import { Studio } from '@/types/studio';

export default function RecentlyViewedSection() {
  const [studios, setStudios] = useState<Studio[]>([]);

  useEffect(() => {
    async function load() {
      const ids = getRecentStudioIds();
      if (ids.length === 0) return;

      const { data } = await supabase
        .from('studios')
        .select('id, name, address, photos, room_type, region')
        .in('id', ids);

      if (data) {
        // DB 순서가 아닌 최근 본 순서로 재정렬
        const ordered = ids
          .map((id) => data.find((s) => s.id === id))
          .filter(Boolean) as Studio[];
        setStudios(ordered);
      }
    }
    load();
  }, []);

  if (studios.length === 0) return null;

  return (
    <div className="w-full mt-6">
      <h2 className="text-sm font-semibold text-white mb-3">최근 본 연습실</h2>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x">
        {studios.map((s) => (
          <Link
            key={s.id}
            href={`/studios/${s.id}`}
            className="w-48 shrink-0 snap-start bg-brand-card/80 backdrop-blur border border-brand-border rounded-xl overflow-hidden"
          >
            <div className="relative h-28 bg-brand-border">
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
            </div>
            <div className="p-2">
              <p className="text-xs font-medium truncate">{s.name}</p>
              <p className="text-[10px] text-brand-muted mt-0.5 truncate">
                {s.region || s.address || ''}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
