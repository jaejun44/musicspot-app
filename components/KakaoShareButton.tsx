'use client';

import { trackEvent } from '@/lib/analytics';

interface Props {
  studioName: string;
  studioAddress: string;
  studioId: string;
  imageUrl?: string;
}

const BASE_URL = 'https://musicspotapp.vercel.app';

export default function KakaoShareButton({
  studioName,
  studioAddress,
  studioId,
  imageUrl,
}: Props) {
  async function handleShare() {
    const url = `${BASE_URL}/room/${studioId}`;

    // 1순위: 카카오 SDK
    if (window.Kakao?.isInitialized()) {
      try {
        window.Kakao.Share.sendDefault({
          objectType: 'feed',
          content: {
            title: studioName,
            description: studioAddress || '연습실 정보 보기',
            imageUrl: imageUrl || `${BASE_URL}/hero-bg.png`,
            link: { mobileWebUrl: url, webUrl: url },
          },
          buttons: [
            {
              title: '연습실 보기',
              link: { mobileWebUrl: url, webUrl: url },
            },
          ],
        });
        trackEvent('share_click', {
          studio_id: studioId,
          studio_name: studioName,
          method: 'kakao',
        });
        return;
      } catch (e) {
        console.error('Kakao share error:', e);
      }
    }

    // 2순위: Web Share API
    if (navigator.share) {
      try {
        await navigator.share({
          title: studioName,
          text: `${studioName} - ${studioAddress}`,
          url,
        });
        trackEvent('share_click', {
          studio_id: studioId,
          studio_name: studioName,
          method: 'web_share',
        });
        return;
      } catch {
        // 사용자가 취소한 경우 무시
      }
    }

    // 3순위: 클립보드 복사
    try {
      await navigator.clipboard.writeText(url);
      alert('링크가 복사되었습니다!');
      trackEvent('share_click', {
        studio_id: studioId,
        studio_name: studioName,
        method: 'clipboard',
      });
    } catch {
      // 폴백 없음
    }
  }

  return (
    <button
      onClick={handleShare}
      className="w-full py-3 bg-comic-yellow border-[3px] border-comic-black text-comic-black text-sm font-bold flex items-center justify-center gap-2 transition-transform active:translate-x-[2px] active:translate-y-[2px]"
      style={{ boxShadow: '4px 4px 0 #0A0A0A' }}
    >
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 3C6.5 3 2 6.58 2 11c0 2.83 1.87 5.32 4.68 6.73l-.96 3.57c-.09.32.25.59.54.42L10.6 19.1c.45.06.92.1 1.4.1 5.5 0 10-3.58 10-8s-4.5-8-10-8z" />
      </svg>
      💬 카카오톡 공유
    </button>
  );
}
