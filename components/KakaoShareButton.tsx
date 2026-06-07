'use client';

import { trackEvent } from '@/lib/analytics';
import { buildShareUrl, type ShareCampaign } from '@/lib/share-utm';

interface Props {
  studioName: string;
  studioAddress: string;
  studioId: string;
  imageUrl?: string;
  campaign?: ShareCampaign;
}

export default function KakaoShareButton({
  studioName,
  studioAddress,
  studioId,
  imageUrl,
  campaign = 'studio',
}: Props) {
  async function handleShare() {
    const kakaoUrl = buildShareUrl(`/room/${studioId}`, 'kakao', campaign, studioId);
    const linkUrl = buildShareUrl(`/room/${studioId}`, 'link', campaign, studioId);

    // 1순위: 카카오 SDK
    if (window.Kakao?.isInitialized()) {
      try {
        window.Kakao.Share.sendDefault({
          objectType: 'feed',
          content: {
            title: studioName,
            description: studioAddress || '연습실 정보 보기',
            imageUrl: imageUrl || `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.musicspotfest.com'}/hero-bg.png`,
            link: { mobileWebUrl: kakaoUrl, webUrl: kakaoUrl },
          },
          buttons: [
            {
              title: '연습실 보기',
              link: { mobileWebUrl: kakaoUrl, webUrl: kakaoUrl },
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
          url: linkUrl,
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
      await navigator.clipboard.writeText(linkUrl);
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
      className="w-full py-3 rounded-[14px] border-[3px] border-[#0A0A0A] text-sm font-bold flex items-center justify-center gap-2 transition-transform active:translate-x-[2px] active:translate-y-[2px]"
      style={{ backgroundColor: '#FEE500', color: 'rgba(0,0,0,0.85)', boxShadow: '4px 4px 0 #0A0A0A', fontFamily: 'Pretendard, sans-serif' }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 3C6.48 3 2 6.58 2 11c0 2.83 1.87 5.32 4.68 6.73l-.96 3.57c-.09.32.25.59.54.42l4.26-2.69c.47.07.96.11 1.48.11 5.52 0 10-3.58 10-8S17.52 3 12 3z"/>
      </svg>
      카카오톡 공유
    </button>
  );
}
