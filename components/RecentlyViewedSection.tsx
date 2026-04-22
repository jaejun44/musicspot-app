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
      <h2 className="text-sm font-bold text-comic-black mb-3 flex items-center gap-2">
        <span className="bg-comic-blue border-[2px] border-comic-black px-2 py-0.5 text-xs" style={{ boxShadow: '2px 2px 0 #0A0A0A' }}>
          최근 본 연습실
        </span>
      </h2>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x">
        {studios.map((s) => (
          <Link
            key={s.id}
            href={`/studios/${s.id}`}
            className="w-44 shrink-0 snap-start bg-white border-[2px] border-comic-black overflow-hidden block"
            style={{ boxShadow: '3px 3px 0 #0A0A0A' }}
          >
            <div className="relative h-24 bg-comic-black/10">
              {s.photos?.[0] ? (
                <img
                  src={s.photos[0]}
                  alt={s.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-comic-black/30 text-2xl">
                  🎵
                </div>
              )}
            </div>
            <div className="p-2">
              <p className="text-xs font-bold truncate">{s.name}</p>
              <p className="text-[10px] text-comic-black/50 mt-0.5 truncate">
                {s.region || s.address || ''}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
