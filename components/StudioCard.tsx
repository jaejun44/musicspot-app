'use client';

import Link from 'next/link';
import { Studio } from '@/types/studio';
import { getDistanceKm } from '@/lib/distance';

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
      <div className="bg-brand-card rounded-xl overflow-hidden border border-brand-border hover:border-brand-red/40 transition-colors">
        {/* Photo */}
        <div className="relative w-full h-40 bg-brand-border">
          {photo ? (
            <img
              src={photo}
              alt={studio.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-brand-muted">
              <svg
                className="w-12 h-12"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                />
              </svg>
            </div>
          )}
          {/* Badges */}
          <div className="absolute top-2 left-2 flex gap-1">
            {roomLabel && (
              <span className="px-2 py-0.5 bg-brand-red text-white text-xs font-semibold rounded">
                {roomLabel}
              </span>
            )}
            {studio.has_drum && (
              <span className="px-2 py-0.5 bg-white/20 backdrop-blur text-white text-xs font-semibold rounded">
                🥁 드럼
              </span>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="p-3">
          <h3 className="font-semibold text-sm truncate">{studio.name}</h3>

          <div className="flex items-center gap-2 mt-1 text-xs text-brand-muted">
            {distance !== null && <span>{distance.toFixed(1)}km</span>}
            {studio.rating && <span>⭐ {studio.rating}</span>}
          </div>

          <div className="mt-1.5 text-sm font-semibold text-brand-red">
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
