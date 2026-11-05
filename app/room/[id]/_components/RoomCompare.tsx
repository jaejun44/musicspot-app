'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { track } from '@/lib/analytics';
import { walkMinutes } from '@/lib/region-select';
import { studioPriceLabel } from '@/lib/studio-price';
import type { NearbyRoom } from '@/lib/nearby-rooms';
import CandidateToggle from './CandidateToggle';

interface Props {
  studioId: string;
  rooms: NearbyRoom[];
}

function distanceNote(distanceM: number): string {
  return distanceM < 1500 ? `🚶 도보 약 ${walkMinutes(distanceM)}분` : `📍 약 ${(distanceM / 1000).toFixed(1)}km`;
}

/** 연습실 상세: 근처 비슷한 연습실과 한 줄씩 비교하고 바로 후보로 담는다 */
export default function RoomCompare({ studioId, rooms }: Props) {
  useEffect(() => {
    if (rooms.length > 0) track('compare_view', { studio_id: studioId, count: rooms.length });
  }, [studioId, rooms.length]);

  if (rooms.length === 0) return null;

  return (
    <div
      className="bg-white rounded-[20px] border-[3px] border-[#0A0A0A] p-5"
      style={{ boxShadow: '6px 6px 0 #0A0A0A' }}
    >
      <h2 className="text-[15px] font-bold text-[#0A0A0A]" style={{ fontFamily: 'Pretendard, sans-serif' }}>
        🔍 근처 비슷한 연습실
      </h2>
      <p className="text-[12px] text-[#0A0A0A]/50 mt-0.5 mb-3" style={{ fontFamily: 'Pretendard, sans-serif' }}>
        거리는 이 연습실 기준이에요. 후보로 담아 멤버와 정해 보세요.
      </p>
      <ul className="space-y-2">
        {rooms.map(({ studio, distanceM }) => {
          const photo = studio.photos?.[0] ?? null;
          return (
            <li
              key={studio.id}
              className="flex items-center gap-3 rounded-[14px] border-[2px] border-[#0A0A0A] bg-[#FFF8F0] p-2"
            >
              <Link
                href={`/room/${studio.id}`}
                onClick={() => track('compare_click', { studio_id: studio.id })}
                className="flex items-center gap-3 flex-1 min-w-0"
              >
                <div className="relative w-14 h-14 flex-shrink-0 rounded-[10px] overflow-hidden border-[2px] border-[#0A0A0A] bg-[#0A0A0A]/5">
                  {photo ? (
                    <Image src={photo} alt={studio.name} fill className="object-cover" sizes="56px" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[22px]">🎸</div>
                  )}
                </div>
                <div className="min-w-0 flex-1" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                  <p className="text-[14px] font-bold text-[#0A0A0A] line-clamp-1">{studio.name}</p>
                  <p className="text-[12px] font-bold text-[#FF3D77] line-clamp-1">{studioPriceLabel(studio)}</p>
                  <p className="text-[12px] text-[#0A0A0A]/60 line-clamp-1">
                    {distanceNote(distanceM)}
                    {studio.has_drum && ' · 🥁 드럼'}
                  </p>
                </div>
              </Link>
              <div className="flex-shrink-0">
                <CandidateToggle studioId={studio.id} />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
