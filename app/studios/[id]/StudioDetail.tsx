'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Studio } from '@/types/studio';
import { trackStudioView } from '@/lib/analytics';
import { addRecentlyViewed } from '@/lib/recentlyViewed';
import FavoriteButton from '@/components/FavoriteButton';
import PhotoGallery from '@/components/PhotoGallery';
import KakaoMap from '@/components/KakaoMap';
import ContactButtons from '@/components/ContactButtons';
import KakaoShareButton from '@/components/KakaoShareButton';
import ReportModal from '@/components/ReportModal';

export default function StudioDetail() {
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

      setStudio(data as Studio);
      trackStudioView(data.id, data.name);
      addRecentlyViewed(data.id);
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-comic-cream flex items-center justify-center">
        <div
          className="bg-comic-yellow border-[3px] border-comic-black font-bold text-sm px-6 py-3 animate-pulse"
          style={{ boxShadow: '4px 4px 0 #0A0A0A' }}
        >
          🎵 로딩 중...
        </div>
      </div>
    );
  }

  if (!studio) {
    return (
      <div className="min-h-screen bg-comic-cream flex flex-col items-center justify-center gap-4">
        <div
          className="bg-white border-[3px] border-comic-black px-8 py-6 text-center"
          style={{ boxShadow: '6px 6px 0 #0A0A0A' }}
        >
          <p className="font-bungee text-comic-pink text-xl mb-2">404</p>
          <p className="text-sm font-bold">연습실을 찾을 수 없습니다</p>
        </div>
        <button
          onClick={() => router.back()}
          className="px-6 py-2 bg-comic-yellow border-[2px] border-comic-black font-bold text-sm"
          style={{ boxShadow: '3px 3px 0 #0A0A0A' }}
        >
          돌아가기
        </button>
      </div>
    );
  }

  const roomLabel =
    studio.room_type === 'T'
      ? 'T룸'
      : studio.room_type === 'M'
        ? 'M룸'
        : studio.room_type === 'both'
          ? 'T/M'
          : null;

  const optionTags = studio.options
    ? studio.options.split(/[,/]/).map((o) => o.trim()).filter(Boolean)
    : [];

  return (
    <div className="min-h-screen bg-comic-cream pb-28">
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="fixed top-4 left-4 z-30 w-9 h-9 bg-comic-cream border-[2px] border-comic-black flex items-center justify-center"
        style={{ boxShadow: '2px 2px 0 #0A0A0A' }}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Photos */}
      <PhotoGallery photos={studio.photos ?? []} name={studio.name} />

      {/* Info */}
      <div className="px-4 mt-4 space-y-4 max-w-lg mx-auto">
        {/* Title */}
        <div
          className="bg-white border-[3px] border-comic-black p-4"
          style={{ boxShadow: '5px 5px 0 #0A0A0A' }}
        >
          <div className="flex items-start gap-2">
            <h1 className="text-xl font-bold flex-1 text-comic-black">{studio.name}</h1>
            <div className="flex items-center gap-1 shrink-0">
              {roomLabel && (
                <span
                  className="px-2 py-0.5 bg-comic-pink border-[2px] border-comic-black text-white text-xs font-bold"
                >
                  {roomLabel}
                </span>
              )}
              <FavoriteButton studioId={studio.id} studioName={studio.name} size="md" />
            </div>
          </div>
          {studio.rating && (
            <p className="text-sm font-semibold text-comic-black/50 mt-1">⭐ {studio.rating}</p>
          )}
        </div>

        {/* Address & Hours */}
        <div
          className="bg-white border-[2px] border-comic-black p-4 space-y-2 text-sm"
          style={{ boxShadow: '3px 3px 0 #0A0A0A' }}
        >
          {studio.address && (
            <div className="flex gap-2">
              <span className="shrink-0">📍</span>
              <span className="font-medium">{studio.address}</span>
            </div>
          )}
          {studio.hours && (
            <div className="flex gap-2">
              <span className="shrink-0">🕐</span>
              <span className="font-medium">{studio.hours}</span>
            </div>
          )}
        </div>

        {/* Price */}
        <div
          className="bg-comic-yellow border-[3px] border-comic-black p-4"
          style={{ boxShadow: '5px 5px 0 #FF3D77' }}
        >
          <p className="text-xs font-bold text-comic-black/50 mb-1">💰 가격</p>
          <p className="text-2xl font-bungee text-comic-black">
            {studio.price_per_hour
              ? `₩${studio.price_per_hour.toLocaleString()}`
              : studio.price_info ?? '가격 문의'}
          </p>
          {studio.price_per_hour && (
            <p className="text-xs font-bold text-comic-black/60">/ 시간</p>
          )}
        </div>

        {/* Music Info */}
        <div
          className="bg-white border-[2px] border-comic-black p-4"
          style={{ boxShadow: '3px 3px 0 #0A0A0A' }}
        >
          <h2 className="text-sm font-bold mb-3 text-comic-black">🎸 연습실 정보</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-comic-cream border-[2px] border-comic-black p-2">
              <span className="text-xs font-bold text-comic-black/50 block">드럼</span>
              <p className="font-bold mt-0.5">{studio.has_drum ? '✅ 가능' : '❌ 불가'}</p>
            </div>
            {studio.capacity && (
              <div className="bg-comic-cream border-[2px] border-comic-black p-2">
                <span className="text-xs font-bold text-comic-black/50 block">수용 인원</span>
                <p className="font-bold mt-0.5">{studio.capacity}</p>
              </div>
            )}
          </div>
        </div>

        {/* Options */}
        {optionTags.length > 0 && (
          <div>
            <h2 className="text-sm font-bold mb-2">✨ 옵션</h2>
            <div className="flex flex-wrap gap-2">
              {optionTags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-white border-[2px] border-comic-black text-xs font-bold"
                  style={{ boxShadow: '2px 2px 0 #0A0A0A' }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Map */}
        {studio.lat && studio.lng && (
          <div>
            <h2 className="text-sm font-bold mb-2">📍 위치</h2>
            <div className="border-[3px] border-comic-black overflow-hidden" style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>
              <KakaoMap lat={studio.lat} lng={studio.lng} name={studio.name} />
            </div>
          </div>
        )}

        {/* Share */}
        <div>
          <h2 className="text-sm font-bold mb-2">🔗 공유하기</h2>
          <KakaoShareButton
            studioId={studio.id}
            studioName={studio.name}
            studioAddress={studio.address || ''}
            imageUrl={studio.photos?.[0]}
          />
        </div>

        {/* Report link */}
        <div className="text-center pt-2">
          <button
            onClick={() => setShowReport(true)}
            className="text-xs font-bold text-comic-black/40 underline underline-offset-4 hover:text-comic-pink transition-colors"
          >
            정보가 틀린가요?
          </button>
        </div>
      </div>

      {/* Report Modal */}
      {showReport && (
        <ReportModal
          studioId={studio.id}
          onClose={() => setShowReport(false)}
        />
      )}

      {/* CTA */}
      <ContactButtons studio={studio} />
    </div>
  );
}
