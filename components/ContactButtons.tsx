'use client';

import { Studio } from '@/types/studio';
import { trackContactClick } from '@/lib/analytics';

interface Props {
  studio: Studio;
}

export default function ContactButtons({ studio }: Props) {
  const hasAny = studio.naver_place_url || studio.kakao_channel || studio.phone;
  if (!hasAny) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-brand-bg/95 backdrop-blur border-t border-brand-border p-4 flex gap-2 max-w-lg mx-auto">
      {studio.naver_place_url && (
        <a
          href={studio.naver_place_url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackContactClick('naver', studio.id)}
          className="flex-1 py-3 bg-[#FFD6E0] text-gray-900 text-sm font-semibold rounded-xl text-center"
        >
          플레이스 보기
        </a>
      )}

      {studio.kakao_channel && (
        <a
          href={`https://pf.kakao.com/${studio.kakao_channel}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackContactClick('kakao', studio.id)}
          className="flex-1 py-3 bg-[#FEE500] text-[#191919] text-sm font-semibold rounded-xl text-center"
        >
          카카오톡 문의
        </a>
      )}

      {studio.phone && (
        <a
          href={`tel:${studio.phone}`}
          onClick={() => trackContactClick('phone', studio.id)}
          className="flex-1 py-3 bg-brand-red text-white text-sm font-semibold rounded-xl text-center"
        >
          전화 연결
        </a>
      )}
    </div>
  );
}
