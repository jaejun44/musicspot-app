'use client';

import { Fragment } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Heart } from 'lucide-react';
import { Studio } from '@/types/studio';
import { getDistanceKm } from '@/lib/distance';
import { useFavorites } from '@/hooks/useFavorites';
import { trackFavoriteToggle } from '@/lib/analytics';
import { studioPriceLabel } from '@/lib/studio-price';

interface RoomCardProps {
  studio: Studio;
  userLat?: number;
  userLng?: number;
  /** 위치 줄을 대신할 문구 (지역 페이지의 '○○역 도보 약 N분') */
  locationNote?: string;
}

export default function RoomCard({ studio, userLat, userLng, locationNote }: RoomCardProps) {
  const { isFav, toggle } = useFavorites();
  const fav = isFav(studio.id);

  const photo = studio.photos?.[0] ?? null;

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

  const priceLabel = studioPriceLabel(studio);

  function handleFav(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    trackFavoriteToggle(fav ? 'remove' : 'add', studio.id);
    toggle(studio.id);
  }

  return (
    <Link href={`/room/${studio.id}`} className="block">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        whileHover={{ y: -8, boxShadow: '10px 10px 0 #0A0A0A' }}
        whileTap={{ scale: 0.97 }}
        viewport={{ once: true }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        className="bg-white rounded-[20px] border-[3px] border-[#0A0A0A] overflow-hidden"
        style={{ boxShadow: '6px 6px 0 #0A0A0A' }}
      >
        {/* 사진 — 휴대폰(1열)에선 낮춰 한 화면에 카드가 더 보이게, 2열 이상은 기존 4:3 */}
        <div className="relative aspect-[16/9] sm:aspect-[4/3] bg-[#0A0A0A]/10 border-b-[2px] border-[#0A0A0A]">
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
            className="absolute top-2 right-2 w-10 h-10 flex items-center justify-center bg-white rounded-full border-[2px] border-[#0A0A0A]"
            style={{ boxShadow: '2px 2px 0 #0A0A0A' }}
            aria-label={fav ? '즐겨찾기 해제' : '즐겨찾기 추가'}
          >
            <Heart
              className="w-5 h-5"
              fill={fav ? '#FF3D77' : 'none'}
              stroke={fav ? '#FF3D77' : '#0A0A0A'}
              strokeWidth={2}
            />
          </motion.button>

          {/* 배지 */}
          <div className="absolute top-3 left-3 flex flex-col gap-1">
            {roomLabel && (
              <span
                className="px-2 py-0.5 bg-[#FF3D77] border-[2px] border-[#0A0A0A] text-white text-[12px] font-bold rounded-[6px]"
                style={{ boxShadow: '2px 2px 0 #0A0A0A' }}
              >
                {roomLabel}
              </span>
            )}
            {studio.has_drum && (
              <span
                className="px-2 py-0.5 bg-[#F5FF4F] border-[2px] border-[#0A0A0A] text-[#0A0A0A] text-[12px] font-bold rounded-[6px]"
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
            {locationNote ?? (
              <>
                📍{' '}
                {distance != null
                  ? `${distance.toFixed(1)}km · ${studio.region ?? ''}`
                  : (studio.region ?? studio.address ?? '')}
              </>
            )}
          </p>

          <div className="flex items-center justify-between gap-2">
            {(studio.review_count ?? 0) > 0 ? (
              <span
                className="flex-shrink-0 whitespace-nowrap px-2 py-0.5 bg-[#FF3D77] border-[2px] border-[#0A0A0A] text-white text-[12px] font-bold rounded-[6px]"
                style={{ boxShadow: '2px 2px 0 #0A0A0A' }}
              >
                ⭐ {studio.review_avg?.toFixed(1)} ({studio.review_count})
              </span>
            ) : studio.rating ? (
              <span
                className="flex-shrink-0 whitespace-nowrap px-2 py-0.5 bg-[#FF3D77] border-[2px] border-[#0A0A0A] text-white text-[12px] font-bold rounded-[6px]"
                style={{ boxShadow: '2px 2px 0 #0A0A0A' }}
              >
                ⭐ {studio.rating}
              </span>
            ) : null}
            <span
              className="ml-auto text-right break-keep"
              style={{
                fontFamily: 'Bungee, sans-serif',
                fontSize: '15px',
                color: '#FF3D77',
              }}
            >
              {/* ' / '로 나뉜 짧은 요금(시간당·패키지)은 덩어리째 줄바꿈 — '~'만 다음 줄로 떨어지지 않게.
                  업체 원문이 긴 문장인 경우는 그대로 줄바꿈(안 그러면 화면 밖으로 넘침) */}
              {priceLabel.split(' / ').map((part, i) => (
                <Fragment key={i}>
                  {i > 0 && ' / '}
                  <span className={part.length <= 16 ? 'whitespace-nowrap' : undefined}>{part}</span>
                </Fragment>
              ))}
            </span>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
