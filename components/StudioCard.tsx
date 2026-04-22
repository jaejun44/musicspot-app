'use client';

import Link from 'next/link';
import { Studio } from '@/types/studio';
import { getDistanceKm } from '@/lib/distance';
import FavoriteButton from './FavoriteButton';

interface Props {
  studio: Studio;
  userLat?: number;
  userLng?: number;
}

export default function StudioCard({ studio, userLat, userLng }: Props) {
  const photo = studio.photos?.[0];
  const distance =
    userLat && userLng && studio.lat && studio.lng
      ? getDistanceKm(userLat, userLng, studio.lat, studio.lng)
      : null;

  const roomLabel =
    studio.room_type === 'T'
      ? 'T룸'
      : studio.room_type === 'M'
        ? 'M룸'
        : studio.room_type === 'both'
          ? 'T/M'
          : null;

  return (
    <Link href={`/studios/${studio.id}`}>
      <div
        className="bg-white border-[3px] border-comic-black overflow-hidden transition-transform hover:-translate-y-0.5"
        style={{ boxShadow: '5px 5px 0 #0A0A0A' }}
      >
        {/* Photo */}
        <div className="relative w-full h-40 bg-comic-black/10 border-b-[2px] border-comic-black">
          {photo ? (
            <img
              src={photo}
              alt={studio.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl">
              🎵
            </div>
          )}

          {/* Favorite */}
          <div className="absolute top-1 right-1">
            <FavoriteButton studioId={studio.id} studioName={studio.name} />
          </div>

          {/* Badges */}
          <div className="absolute top-2 left-2 flex gap-1">
            {roomLabel && (
              <span
                className="px-2 py-0.5 bg-comic-pink border-[2px] border-comic-black text-white text-xs font-bold"
                style={{ boxShadow: '2px 2px 0 #0A0A0A' }}
              >
                {roomLabel}
              </span>
            )}
            {studio.has_drum && (
              <span
                className="px-2 py-0.5 bg-comic-yellow border-[2px] border-comic-black text-comic-black text-xs font-bold"
                style={{ boxShadow: '2px 2px 0 #0A0A0A' }}
              >
                🥁 드럼
              </span>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="p-3">
          <h3 className="font-bold text-sm truncate text-comic-black">{studio.name}</h3>

          <div className="flex items-center gap-2 mt-1 text-xs text-comic-black/50 font-medium">
            {distance !== null && <span>📍 {distance.toFixed(1)}km</span>}
            {studio.rating && <span>⭐ {studio.rating}</span>}
            {studio.region && !distance && <span>{studio.region}</span>}
          </div>

          <div className="mt-1.5 text-sm font-bold text-comic-pink">
            {studio.price_per_hour
              ? `₩${studio.price_per_hour.toLocaleString()}/시간`
              : studio.price_info
                ? studio.price_info
                : '가격 문의'}
          </div>
        </div>
      </div>
    </Link>
  );
}
