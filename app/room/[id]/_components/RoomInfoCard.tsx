'use client';

import { Heart, Share2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Studio } from '@/types/studio';
import { useFavorites } from '@/hooks/useFavorites';

interface RoomInfoCardProps {
  studio: Studio;
  onShare: () => void;
}

export default function RoomInfoCard({ studio, onShare }: RoomInfoCardProps) {
  const { isFav, toggle } = useFavorites();
  const fav = isFav(studio.id);

  const roomLabel =
    studio.room_type === 'T'
      ? 'T룸'
      : studio.room_type === 'M'
        ? 'M룸'
        : studio.room_type === 'both'
          ? 'T/M룸'
          : null;

  return (
    <div
      className="bg-white rounded-[20px] border-[3px] border-[#0A0A0A] p-5"
      style={{ boxShadow: '6px 6px 0 #0A0A0A' }}
    >
      {/* 이름 + 액션 버튼 */}
      <div className="flex items-start gap-3">
        <h1
          className="flex-1 text-[22px] leading-tight text-[#0A0A0A]"
          style={{ fontFamily: 'Pretendard, sans-serif', fontWeight: 800 }}
        >
          {studio.name}
        </h1>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* 공유 */}
          <motion.button
            onClick={onShare}
            whileTap={{ scale: 0.88 }}
            className="w-9 h-9 flex items-center justify-center bg-[#FFF8F0] rounded-full border-[2px] border-[#0A0A0A]"
            style={{ boxShadow: '2px 2px 0 #0A0A0A' }}
            aria-label="공유"
          >
            <Share2 className="w-4 h-4 text-[#0A0A0A]" />
          </motion.button>

          {/* 즐겨찾기 */}
          <motion.button
            onClick={() => toggle(studio.id)}
            whileTap={{ scale: 0.88 }}
            className="w-9 h-9 flex items-center justify-center bg-white rounded-full border-[2px] border-[#0A0A0A]"
            style={{ boxShadow: '2px 2px 0 #0A0A0A' }}
            aria-label={fav ? '즐겨찾기 해제' : '즐겨찾기'}
          >
            <Heart
              className="w-4 h-4"
              fill={fav ? '#FF3D77' : 'none'}
              stroke={fav ? '#FF3D77' : '#0A0A0A'}
              strokeWidth={2}
            />
          </motion.button>
        </div>
      </div>

      {/* 배지 */}
      <div className="flex flex-wrap gap-2 mt-3">
        {roomLabel && (
          <span
            className="px-3 py-1 bg-[#FF3D77] border-[2px] border-[#0A0A0A] text-white text-[12px] font-bold rounded-[8px]"
            style={{ boxShadow: '2px 2px 0 #0A0A0A' }}
          >
            {roomLabel}
          </span>
        )}
        {studio.has_drum && (
          <span
            className="px-3 py-1 bg-[#F5FF4F] border-[2px] border-[#0A0A0A] text-[#0A0A0A] text-[12px] font-bold rounded-[8px]"
            style={{ boxShadow: '2px 2px 0 #0A0A0A' }}
          >
            🥁 드럼 가능
          </span>
        )}
        {studio.capacity && (
          <span
            className="px-3 py-1 bg-[#4FC3F7] border-[2px] border-[#0A0A0A] text-[#0A0A0A] text-[12px] font-bold rounded-[8px]"
            style={{ boxShadow: '2px 2px 0 #0A0A0A' }}
          >
            👥 {studio.capacity}
          </span>
        )}
        {studio.rating && (
          <span className="px-3 py-1 bg-[#FFF8F0] border-[2px] border-[#0A0A0A] text-[#0A0A0A] text-[12px] font-bold rounded-[8px]">
            ⭐ {studio.rating}
          </span>
        )}
      </div>

      {/* 주소 / 영업시간 */}
      <div className="mt-4 space-y-2">
        {studio.address && (
          <div className="flex gap-2">
            <span className="text-[14px] flex-shrink-0">📍</span>
            <span
              className="text-[14px] text-[#0A0A0A]/70"
              style={{ fontFamily: 'Pretendard, sans-serif' }}
            >
              {studio.address}
            </span>
          </div>
        )}
        {studio.hours && (
          <div className="flex gap-2">
            <span className="text-[14px] flex-shrink-0">🕐</span>
            <span
              className="text-[14px] text-[#0A0A0A]/70"
              style={{ fontFamily: 'Pretendard, sans-serif' }}
            >
              {studio.hours}
            </span>
          </div>
        )}
        {studio.phone && (
          <div className="flex gap-2">
            <span className="text-[14px] flex-shrink-0">📞</span>
            <a
              href={`tel:${studio.phone}`}
              className="text-[14px] text-[#4FC3F7] font-bold underline-offset-2 hover:underline"
              style={{ fontFamily: 'Pretendard, sans-serif' }}
            >
              {studio.phone}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
