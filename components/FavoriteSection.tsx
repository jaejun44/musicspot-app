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
      <h2 className="text-sm font-bold text-comic-black mb-3 flex items-center gap-2">
        <span className="bg-comic-pink text-white border-[2px] border-comic-black px-2 py-0.5 text-xs" style={{ boxShadow: '2px 2px 0 #0A0A0A' }}>
          ❤️ 내가 찜한 연습실
        </span>
      </h2>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x">
        {studios.map((s) => (
          <Link
            key={s.id}
            href={`/studios/${s.id}`}
            className="w-56 shrink-0 snap-start bg-white border-[2px] border-comic-black overflow-hidden block"
            style={{ boxShadow: '3px 3px 0 #0A0A0A' }}
          >
            <div className="relative h-28 bg-comic-black/10">
              {s.photos?.[0] ? (
                <img
                  src={s.photos[0]}
                  alt={s.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl">
                  🎵
                </div>
              )}
              <div className="absolute top-1 right-1">
                <FavoriteButton studioId={s.id} studioName={s.name} />
              </div>
            </div>
            <div className="p-2.5">
              <p className="text-sm font-bold truncate">{s.name}</p>
              <p className="text-xs text-comic-pink font-semibold mt-0.5">
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
