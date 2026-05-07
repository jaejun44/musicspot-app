'use client';

import { motion } from 'framer-motion';
import { Studio } from '@/types/studio';
import { trackContactClick } from '@/lib/analytics';

interface RoomContactBarProps {
  studio: Studio;
}

const NAVER_PLACE_DOMAINS = ['naver.me', 'map.naver.com', 'place.naver.com', 'booking.naver.com'];

function resolveNaverUrl(url: string, lat?: number | null, lng?: number | null): string {
  const isNaverPlace = NAVER_PLACE_DOMAINS.some((d) => url.includes(d));
  if (isNaverPlace) return url;
  if (lat && lng) return `https://map.naver.com/v5/?c=${lng},${lat},17,0,0,0,dh`;
  return url;
}

export default function RoomContactBar({ studio }: RoomContactBarProps) {
  const hasAny = studio.naver_place_url || studio.kakao_channel || studio.phone;
  if (!hasAny) return null;

  const naverUrl = studio.naver_place_url
    ? resolveNaverUrl(studio.naver_place_url, studio.lat, studio.lng)
    : null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#FFF8F0] border-t-[3px] border-[#0A0A0A] px-4 py-3">
      <div className="flex gap-2 max-w-lg mx-auto">
        {naverUrl && (
          <motion.a
            href={naverUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackContactClick('naver', studio.id)}
            whileTap={{ scale: 0.95, y: 1 }}
            className="flex-1 py-3 bg-[#F5FF4F] rounded-[14px] border-[2px] border-[#0A0A0A] text-[#0A0A0A] text-[14px] font-bold text-center"
            style={{ boxShadow: '3px 3px 0 #0A0A0A', fontFamily: 'Pretendard, sans-serif' }}
          >
            📍 플레이스
          </motion.a>
        )}

        {studio.kakao_channel && (
          <motion.a
            href={`https://pf.kakao.com/${studio.kakao_channel}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackContactClick('kakao', studio.id)}
            whileTap={{ scale: 0.95, y: 1 }}
            className="flex-1 py-3 bg-[#FFD600] rounded-[14px] border-[2px] border-[#0A0A0A] text-[#0A0A0A] text-[14px] font-bold text-center"
            style={{ boxShadow: '3px 3px 0 #0A0A0A', fontFamily: 'Pretendard, sans-serif' }}
          >
            💬 카카오 문의
          </motion.a>
        )}

        {studio.phone && (
          <motion.a
            href={`tel:${studio.phone}`}
            onClick={() => trackContactClick('phone', studio.id)}
            whileTap={{ scale: 0.95, y: 1 }}
            className="flex-1 py-3 bg-[#4FC3F7] rounded-[14px] border-[2px] border-[#0A0A0A] text-[#0A0A0A] text-[14px] font-bold text-center"
            style={{ boxShadow: '3px 3px 0 #0A0A0A', fontFamily: 'Pretendard, sans-serif' }}
          >
            📞 전화
          </motion.a>
        )}
      </div>
    </div>
  );
}
