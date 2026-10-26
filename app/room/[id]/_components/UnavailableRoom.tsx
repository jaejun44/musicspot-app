'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { track } from '@/lib/analytics';
import { walkMinutes } from '@/lib/region-select';
import type { NearbyRoom } from '@/lib/nearby-rooms';
import RoomCard from '@/components/RoomCard';

interface Props {
  studioId: string;
  name: string;
  rooms: NearbyRoom[];
  region: { slug: string; label: string } | null;
}

function distanceNote(distanceM: number): string {
  return distanceM < 1500 ? `🚶 원래 곳에서 도보 약 ${walkMinutes(distanceM)}분` : `📍 원래 곳에서 약 ${(distanceM / 1000).toFixed(1)}km`;
}

/** 비공개(문 닫음·모집 끝난 광고) 연습실 주소로 들어온 사람에게 근처 대안을 보여준다 */
export default function UnavailableRoom({ studioId, name, rooms, region }: Props) {
  useEffect(() => {
    track('room_unavailable_view', { studio_id: studioId, nearby_count: rooms.length });
  }, [studioId, rooms.length]);

  return (
    <main className="min-h-screen bg-comic-cream px-4 sm:px-6 py-6 max-w-5xl mx-auto">
      <header
        className="bg-white rounded-[20px] border-[3px] border-comic-black px-5 py-5 mb-6"
        style={{ boxShadow: '6px 6px 0 #0A0A0A' }}
      >
        <p className="text-[12px] font-bold text-comic-black/40 truncate">{name}</p>
        <h1 className="mt-1 text-[18px] sm:text-[20px] font-bold text-comic-black break-keep">
          이 연습실은 지금 정보를 제공하지 않아요
        </h1>
        <p className="mt-1.5 text-[14px] text-comic-black/60 break-keep">
          문을 닫았거나 모집이 끝난 곳이에요.
          {rooms.length > 0 && ' 가까운 연습실을 대신 보여드릴게요.'}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {region && (
            <Link
              href={`/region/${region.slug}`}
              onClick={() => track('room_unavailable_click', { studio_id: studioId, to: 'region' })}
              className="px-4 py-2 bg-comic-pink text-white rounded-[12px] border-[2px] border-comic-black text-[14px] font-bold"
              style={{ boxShadow: '3px 3px 0 #0A0A0A' }}
            >
              {region.label} 연습실 전체 보기
            </Link>
          )}
          <Link
            href="/search"
            onClick={() => track('room_unavailable_click', { studio_id: studioId, to: 'search' })}
            className="px-4 py-2 bg-comic-blue rounded-[12px] border-[2px] border-comic-black text-[14px] font-bold"
            style={{ boxShadow: '3px 3px 0 #0A0A0A' }}
          >
            연습실 검색하기
          </Link>
        </div>
      </header>

      {rooms.length > 0 && (
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map(({ studio, distanceM }) => (
            <div
              key={studio.id}
              onClickCapture={(e) => {
                // 카드 안 찜 버튼은 이동이 아니라서 세지 않는다
                if ((e.target as HTMLElement).closest('button')) return;
                track('room_unavailable_click', { studio_id: studioId, to: 'studio', to_studio_id: studio.id });
              }}
            >
              <RoomCard studio={studio} locationNote={distanceNote(distanceM)} />
            </div>
          ))}
        </section>
      )}
    </main>
  );
}
