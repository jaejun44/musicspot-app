'use client';

import { useEffect, useRef, useState } from 'react';
import { getRecentStudioIds } from '@/lib/recentlyViewed';
import { getFavorites } from '@/lib/favorites';
import { supabase } from '@/lib/supabase';
import { track, type ReturnStripKind } from '@/lib/analytics';
import { Studio } from '@/types/studio';
import StudioMiniCard from '@/app/my-bookings/_components/StudioMiniCard';

const MAX_ITEMS = 6;

const LABEL: Record<ReturnStripKind, string> = {
  recent: '최근 본 연습실',
  favorite: '찜한 연습실',
};

/**
 * 홈·검색 상단 "최근 본 / 찜한 연습실" 가로 스트립. 다시 온 사람이 클릭 없이 이어 보게 한다.
 * 목록이 비면 아무것도 그리지 않는다. 비공개로 바뀐 곳은 조회에서 빠진다(눌러도 갈 곳이 없으므로).
 */
export default function ReturnStrip() {
  const [lists, setLists] = useState<Record<ReturnStripKind, Studio[]> | null>(null);
  const [kind, setKind] = useState<ReturnStripKind>('recent');
  const viewed = useRef(new Set<ReturnStripKind>());

  useEffect(() => {
    const recentIds = getRecentStudioIds().slice(0, MAX_ITEMS);
    // 찜은 추가한 순서로 쌓이므로 최근 것부터
    const favoriteIds = getFavorites().slice().reverse().slice(0, MAX_ITEMS);
    const ids = Array.from(new Set([...recentIds, ...favoriteIds]));
    if (ids.length === 0) return;

    supabase
      .from('studios')
      .select('*')
      .in('id', ids)
      .eq('is_published', true)
      .then(({ data, error }) => {
        if (error) {
          console.error('[ReturnStrip] 연습실 조회 실패', error.message);
          return;
        }
        const map = new Map(((data ?? []) as Studio[]).map((s) => [s.id, s]));
        const pick = (list: string[]) => list.map((id) => map.get(id)).filter(Boolean) as Studio[];
        const next = { recent: pick(recentIds), favorite: pick(favoriteIds) };
        setLists(next);
        if (next.recent.length === 0 && next.favorite.length > 0) setKind('favorite');
      });
  }, []);

  const studios = lists?.[kind] ?? [];

  useEffect(() => {
    if (studios.length === 0 || viewed.current.has(kind)) return;
    viewed.current.add(kind);
    track('return_strip_view', { count: studios.length, kind });
  }, [kind, studios.length]);

  if (!lists || (lists.recent.length === 0 && lists.favorite.length === 0)) return null;

  const kinds = (['recent', 'favorite'] as const).filter((k) => lists[k].length > 0);

  return (
    <section className="relative z-10 px-4 pt-4 max-w-5xl mx-auto w-full">
      <div
        className="bg-white rounded-[20px] border-[3px] border-[#0A0A0A] pt-4 pb-2"
        style={{ boxShadow: '4px 4px 0 #0A0A0A' }}
      >
        <div className="flex items-center gap-2 px-4 mb-2" style={{ fontFamily: 'Pretendard, sans-serif' }}>
          {kinds.length > 1 ? (
            kinds.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                aria-pressed={kind === k}
                className={`px-3 py-1 rounded-[10px] border-[2px] border-[#0A0A0A] text-[13px] font-bold ${
                  kind === k ? 'bg-[#F5FF4F] text-[#0A0A0A]' : 'bg-white text-[#0A0A0A]/60'
                }`}
                style={kind === k ? { boxShadow: '2px 2px 0 #0A0A0A' } : undefined}
              >
                {k === 'recent' ? '👀' : '❤️'} {LABEL[k]} {lists[k].length}
              </button>
            ))
          ) : (
            <h2 className="text-[15px] font-bold text-[#0A0A0A]">
              {kind === 'recent' ? '👀' : '❤️'} {LABEL[kind]}
            </h2>
          )}
        </div>
        <div className="flex gap-3 overflow-x-auto px-4 pt-1 pb-3">
          {studios.map((studio, i) => (
            <div
              key={studio.id}
              className="w-[148px] flex-shrink-0"
              onClickCapture={() => track('return_strip_click', { kind, studio_id: studio.id })}
            >
              <StudioMiniCard studio={studio} index={i} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
