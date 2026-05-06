'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Studio } from '@/types/studio';
import { trackStudioView } from '@/lib/analytics';
import { addRecentlyViewed } from '@/lib/recentlyViewed';
import Navigation from '@/components/Navigation';
import ReportModal from '@/components/ReportModal';
import KakaoShareButton from '@/components/KakaoShareButton';
import RoomPhotoGallery from './RoomPhotoGallery';
import RoomInfoCard from './RoomInfoCard';
import RoomBookingWidget from './RoomBookingWidget';
import RoomContactBar from './RoomContactBar';
import ReviewSection from './ReviewSection';

export default function RoomDetailClient() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [studio, setStudio] = useState<Studio | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReport, setShowReport] = useState(false);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('studios')
        .select('*')
        .eq('id', id)
        .eq('is_published', true)
        .single();

      if (error || !data) {
        setLoading(false);
        return;
      }

      const s = data as Studio;
      setStudio(s);
      trackStudioView(s.id, s.name);
      addRecentlyViewed(s.id);
      setLoading(false);
    }
    load();
  }, [id]);

  async function handleShare() {
    if (!studio) return;
    const url = `${window.location.origin}/room/${studio.id}`;

    if (window.Kakao?.isInitialized()) {
      try {
        window.Kakao.Share.sendDefault({
          objectType: 'feed',
          content: {
            title: studio.name,
            description: studio.address || '연습실 정보 보기',
            imageUrl: studio.photos?.[0] || `${window.location.origin}/hero-bg.png`,
            link: { mobileWebUrl: url, webUrl: url },
          },
          buttons: [{ title: '연습실 보기', link: { mobileWebUrl: url, webUrl: url } }],
        });
        return;
      } catch {
        // fallthrough
      }
    }

    if (navigator.share) {
      try {
        await navigator.share({ title: studio.name, text: studio.address ?? '', url });
        return;
      } catch {
        // user cancelled
      }
    }

    await navigator.clipboard.writeText(url).catch(() => null);
    alert('링크가 복사되었습니다!');
  }

  // 옵션 / 악기 태그
  const optionTags = studio?.options
    ? studio.options.split(/[,/]/).map((o) => o.trim()).filter(Boolean)
    : [];
  const instrumentTags = studio?.instruments ?? [];

  /* ── 로딩 ── */
  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFF8F0] flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 0.9, ease: 'linear' }}
          className="w-10 h-10 rounded-full border-[3px] border-[#FF3D77] border-t-transparent"
        />
      </div>
    );
  }

  /* ── 404 ── */
  if (!studio) {
    return (
      <div className="min-h-screen bg-[#FFF8F0] flex flex-col items-center justify-center gap-4 px-4">
        <div
          className="bg-white rounded-[20px] border-[3px] border-[#0A0A0A] px-8 py-8 text-center"
          style={{ boxShadow: '6px 6px 0 #0A0A0A' }}
        >
          <p
            className="text-[#FF3D77] text-[32px] mb-2"
            style={{ fontFamily: 'Bungee, sans-serif' }}
          >
            404
          </p>
          <p className="text-[15px] font-bold text-[#0A0A0A]" style={{ fontFamily: 'Pretendard, sans-serif' }}>
            연습실을 찾을 수 없어요
          </p>
        </div>
        <motion.button
          onClick={() => router.back()}
          whileTap={{ scale: 0.95 }}
          className="px-6 py-3 bg-[#4FC3F7] rounded-[14px] border-[2px] border-[#0A0A0A] font-bold text-[14px]"
          style={{ boxShadow: '3px 3px 0 #0A0A0A', fontFamily: 'Pretendard, sans-serif' }}
        >
          돌아가기
        </motion.button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF8F0] pb-28">
      <Navigation />

      {/* 뒤로가기 */}
      <div className="px-4 pt-4 pb-2">
        <motion.button
          onClick={() => router.back()}
          whileTap={{ scale: 0.93 }}
          className="flex items-center gap-1 text-[14px] font-bold text-[#0A0A0A]/60 hover:text-[#0A0A0A] transition-colors"
          style={{ fontFamily: 'Pretendard, sans-serif' }}
        >
          <ChevronLeft className="w-5 h-5" />
          검색으로
        </motion.button>
      </div>

      {/* 사진 갤러리 — 지도 이미지 URL 제외 */}
      <RoomPhotoGallery
        photos={(studio.photos ?? []).filter(
          (url) => !/map\.(kakao|daum|naver)|daumcdn\.net|staticmap|maps\.googleapis|nrbe\.pstatic\.net|pstatic\.net.*[?&]mt=/i.test(url)
        )}
        name={studio.name}
      />

      {/* 본문 */}
      <div className="px-4 py-5 space-y-5 max-w-2xl mx-auto">
        {/* 이름/배지/공유/하트/주소 */}
        <RoomInfoCard studio={studio} onShare={handleShare} />

        {/* 가격 + 예약 */}
        <RoomBookingWidget studio={studio} />

        {/* 옵션 태그 */}
        {(optionTags.length > 0 || instrumentTags.length > 0) && (
          <div
            className="bg-white rounded-[20px] border-[3px] border-[#0A0A0A] p-5"
            style={{ boxShadow: '6px 6px 0 #0A0A0A' }}
          >
            <h2
              className="text-[15px] font-bold mb-3 text-[#0A0A0A]"
              style={{ fontFamily: 'Pretendard, sans-serif' }}
            >
              ✨ 시설 / 악기
            </h2>
            <div className="flex flex-wrap gap-2">
              {instrumentTags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-[#4FC3F7]/20 border-[2px] border-[#4FC3F7] text-[#0A0A0A] text-[12px] font-bold rounded-[8px]"
                >
                  🎸 {tag}
                </span>
              ))}
              {optionTags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-[#FFF8F0] border-[2px] border-[#0A0A0A] text-[#0A0A0A] text-[12px] font-bold rounded-[8px]"
                  style={{ boxShadow: '2px 2px 0 #0A0A0A' }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 지도 */}
        {((studio.lat && studio.lng) || studio.address) && (
          <div
            className="bg-white rounded-[20px] border-[3px] border-[#0A0A0A] p-5"
            style={{ boxShadow: '6px 6px 0 #0A0A0A' }}
          >
            <h2
              className="text-[15px] font-bold text-[#0A0A0A] mb-1"
              style={{ fontFamily: 'Pretendard, sans-serif' }}
            >
              📍 위치
            </h2>
            {studio.address && (
              <p className="text-[13px] text-[#0A0A0A]/60 mb-3" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                {studio.address}
              </p>
            )}
            {studio.lat && studio.lng ? (
              <a
                href={`https://map.kakao.com/link/to/${encodeURIComponent(studio.name)},${studio.lat},${studio.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-4 bg-[#4FC3F7] rounded-[14px] border-[2px] border-[#0A0A0A] font-bold text-[15px] text-[#0A0A0A] active:scale-95 transition-transform"
                style={{ boxShadow: '4px 4px 0 #0A0A0A', fontFamily: 'Pretendard, sans-serif' }}
              >
                <span className="text-xl">🗺️</span>
                카카오맵에서 길찾기
              </a>
            ) : (
              <div className="w-full h-16 bg-[#FFF8F0] rounded-[12px] border-[2px] border-[#0A0A0A]/20 flex items-center justify-center gap-2">
                <span className="text-xl">🗺️</span>
                <span className="text-[12px] text-[#0A0A0A]/40 font-bold" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                  지도 정보 준비중
                </span>
              </div>
            )}
          </div>
        )}

        {/* 뮤지션 리뷰 */}
        <ReviewSection studioId={studio.id} />

        {/* 카카오 공유 */}
        <KakaoShareButton
          studioId={studio.id}
          studioName={studio.name}
          studioAddress={studio.address ?? ''}
          imageUrl={studio.photos?.[0]}
        />

        {/* 정보 제보 */}
        <div className="text-center pb-2">
          <button
            onClick={() => setShowReport(true)}
            className="text-[12px] font-bold text-[#0A0A0A]/40 underline underline-offset-4 hover:text-[#FF3D77] transition-colors"
            style={{ fontFamily: 'Pretendard, sans-serif' }}
          >
            정보가 틀린가요?
          </button>
        </div>
      </div>

      {/* 제보 모달 */}
      {showReport && (
        <ReportModal
          studioId={studio.id}
          defaultType="correction"
          onClose={() => setShowReport(false)}
        />
      )}

      {/* 하단 고정 연락 버튼 */}
      <RoomContactBar studio={studio} />
    </div>
  );
}
