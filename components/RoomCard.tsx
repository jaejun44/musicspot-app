'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Heart } from 'lucide-react';
import { Studio } from '@/types/studio';
import { getDistanceKm } from '@/lib/distance';
import { useFavorites } from '@/hooks/useFavorites';
import { trackFavoriteToggle } from '@/lib/analytics';

interface RoomCardProps {
  studio: Studio;
  userLat?: number;
  userLng?: number;
  /** 0·1·2 반복 → -2°·0°·+2° 회전 variance */
  rotationIndex?: number;
}

const ROTATION_MAP = [-2, 0, 2] as const;

export default function RoomCard({ studio, userLat, userLng, rotationIndex = 0 }: RoomCardProps) {
  const { isFav, toggle } = useFavorites();
  const fav = isFav(studio.id);

  const photo = studio.photos?.[0] ?? null;

  const distance =
    userLat && userLng && studio.lat && studio.lng
      ? getDistanceKm(userLat, userLng, studio.lat, studio.lng)
      : null;

  const rotation = ROTATION_MAP[rotationIndex % 3];

  const roomLabel =
    studio.room_type === 'T'
      ? 'T룸'
      : studio.room_type === 'M'
        ? 'M룸'
        : studio.room_type === 'both'
          ? 'T/M'
          : null;

  const priceLabel = studio.price_per_hour
    ? `₩${studio.price_per_hour.toLocaleString()}/h`
    : studio.price_info ?? '가격 문의';

  function handleFav(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    trackFavoriteToggle(fav ? 'remove' : 'add', studio.id);
    toggle(studio.id);
  }

  return (
    <Link href={`/room/${studio.id}`} className="block">
      <motion.div
        initial={{ opacity: 0, y: 20, rotate: 0 }}
        whileInView={{ opacity: 1, y: 0, rotate: rotation }}
        whileHover={{ y: -8, rotate: 0, boxShadow: '10px 10px 0 #0A0A0A' }}
        whileTap={{ scale: 0.97 }}
        viewport={{ once: true }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        className="bg-white rounded-[20px] border-[3px] border-[#0A0A0A] overflow-hidden"
        style={{ boxShadow: '6px 6px 0 #0A0A0A' }}
      >
        {/* 사진 */}
        <div className="relative h-44 bg-[#0A0A0A]/10 border-b-[2px] border-[#0A0A0A]">
          {photo ? (
            <img
              src={photo}
              alt={studio.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-5xl">
              🎵
            </div>
          )}

          {/* 즐겨찾기 버튼 */}
          <motion.button
            onClick={handleFav}
            whileTap={{ scale: 0.85 }}
            className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center bg-white rounded-full border-[2px] border-[#0A0A0A]"
            style={{ boxShadow: '2px 2px 0 #0A0A0A' }}
            aria-label={fav ? '즐겨찾기 해제' : '즐겨찾기 추가'}
          >
            <Heart
              className="w-4 h-4"
              fill={fav ? '#FF3D77' : 'none'}
              stroke={fav ? '#FF3D77' : '#0A0A0A'}
              strokeWidth={2}
            />
          </motion.button>

          {/* 배지 */}
          <div className="absolute top-3 left-3 flex flex-col gap-1">
            {roomLabel && (
              <span
                className="px-2 py-0.5 bg-[#FF3D77] border-[2px] border-[#0A0A0A] text-white text-[11px] font-bold rounded-[6px]"
                style={{ boxShadow: '2px 2px 0 #0A0A0A' }}
              >
                {roomLabel}
              </span>
            )}
            {studio.has_drum && (
              <span
                className="px-2 py-0.5 bg-[#FFD600] border-[2px] border-[#0A0A0A] text-[#0A0A0A] text-[11px] font-bold rounded-[6px]"
                style={{ boxShadow: '2px 2px 0 #0A0A0A' }}
              >
                🥁 드럼
              </span>
            )}
          </div>
        </div>

        {/* 정보 */}
        <div className="p-4">
          <h3
            className="truncate mb-1"
            style={{ fontFamily: 'Pretendard, sans-serif', fontWeight: 800, fontSize: '16px' }}
          >
            {studio.name}
          </h3>

          <p
            className="text-[#0A0A0A]/60 text-[13px] mb-3"
            style={{ fontFamily: 'Pretendard, sans-serif' }}
          >
            📍{' '}
            {distance != null
              ? `${distance.toFixed(1)}km · ${studio.region ?? ''}`
              : (studio.region ?? studio.address ?? '')}
          </p>

          <div className="flex items-center justify-between">
            {studio.rating && (
              <span className="text-[13px] font-semibold text-[#0A0A0A]/60">
                ⭐ {studio.rating}
              </span>
            )}
            <span
              className="ml-auto"
              style={{
                fontFamily: 'Bungee, sans-serif',
                fontSize: '15px',
                color: '#FF3D77',
              }}
            >
              {priceLabel}
            </span>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
