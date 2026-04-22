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
    <div className="fixed bottom-0 left-0 right-0 bg-comic-cream border-t-[3px] border-comic-black p-4 flex gap-2 max-w-lg mx-auto">
      {studio.naver_place_url && (
        <a
          href={studio.naver_place_url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackContactClick('naver', studio.id, studio.name)}
          className="flex-1 py-3 bg-comic-green border-[2px] border-comic-black text-comic-black text-sm font-bold text-center transition-transform active:translate-x-[2px] active:translate-y-[2px]"
          style={{ boxShadow: '3px 3px 0 #0A0A0A' }}
        >
          플레이스
        </a>
      )}

      {studio.kakao_channel && (
        <a
          href={`https://pf.kakao.com/${studio.kakao_channel}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackContactClick('kakao', studio.id, studio.name)}
          className="flex-1 py-3 bg-comic-yellow border-[2px] border-comic-black text-comic-black text-sm font-bold text-center transition-transform active:translate-x-[2px] active:translate-y-[2px]"
          style={{ boxShadow: '3px 3px 0 #0A0A0A' }}
        >
          카카오 문의
        </a>
      )}

      {studio.phone && (
        <a
          href={`tel:${studio.phone}`}
          onClick={() => trackContactClick('phone', studio.id, studio.name)}
          className="flex-1 py-3 bg-comic-pink border-[2px] border-comic-black text-white text-sm font-bold text-center transition-transform active:translate-x-[2px] active:translate-y-[2px]"
          style={{ boxShadow: '3px 3px 0 #0A0A0A' }}
        >
          📞 전화
        </a>
      )}
    </div>
  );
}
