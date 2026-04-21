'use client';

import { motion } from 'framer-motion';
import RoomCard from '@/components/RoomCard';
import { Studio } from '@/types/studio';

interface RoomListProps {
  studios: Studio[];
  loading: boolean;
  hasMore: boolean;
  totalCount: number;
  userLat: number | null;
  userLng: number | null;
  onLoadMore: () => void;
}

export default function RoomList({
  studios,
  loading,
  hasMore,
  totalCount,
  userLat,
  userLng,
  onLoadMore,
}: RoomListProps) {
  if (loading && studios.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 0.9, ease: 'linear' }}
          className="w-10 h-10 rounded-full border-[3px] border-[#FF3D77] border-t-transparent"
        />
        <p className="text-[14px] text-[#0A0A0A]/50" style={{ fontFamily: 'Pretendard, sans-serif' }}>
          연습실 찾는 중...
        </p>
      </div>
    );
  }

  if (!loading && studios.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <span className="text-5xl">🎸</span>
        <p
          className="text-[16px] font-bold text-[#0A0A0A]"
          style={{ fontFamily: 'Pretendard, sans-serif' }}
        >
          검색 결과가 없어요
        </p>
        <p className="text-[13px] text-[#0A0A0A]/50" style={{ fontFamily: 'Pretendard, sans-serif' }}>
          다른 지역이나 조건으로 검색해 보세요
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 py-4">
      {/* 결과 수 */}
      <p
        className="text-[13px] text-[#0A0A0A]/50 mb-4"
        style={{ fontFamily: 'Pretendard, sans-serif' }}
      >
        {totalCount > 0 ? `${totalCount}개 연습실` : `${studios.length}개 연습실`}
      </p>

      {/* 카드 그리드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {studios.map((studio, i) => (
          <RoomCard
            key={studio.id}
            studio={studio}
            userLat={userLat ?? undefined}
            userLng={userLng ?? undefined}
            rotationIndex={i % 3}
          />
        ))}
      </div>

      {/* 더보기 버튼 */}
      {hasMore && (
        <div className="mt-8 flex justify-center">
          <motion.button
            onClick={onLoadMore}
            disabled={loading}
            whileTap={{ scale: 0.95, y: 2 }}
            className="px-8 py-3 bg-[#FFD600] rounded-[16px] border-[3px] border-[#0A0A0A] font-bold text-[14px]"
            style={{ boxShadow: '4px 4px 0 #0A0A0A', fontFamily: 'Pretendard, sans-serif' }}
          >
            {loading ? '불러오는 중...' : '더 보기 💥'}
          </motion.button>
        </div>
      )}
    </div>
  );
}
