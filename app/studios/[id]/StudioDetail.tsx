'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Studio } from '@/types/studio';
import { trackStudioView } from '@/lib/analytics';
import FavoriteButton from '@/components/FavoriteButton';
import PhotoGallery from '@/components/PhotoGallery';
import KakaoMap from '@/components/KakaoMap';
import ContactButtons from '@/components/ContactButtons';
import KakaoShareButton from '@/components/KakaoShareButton';

export default function StudioDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [studio, setStudio] = useState<Studio | null>(null);
  const [loading, setLoading] = useState(true);

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
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-red border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!studio) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-brand-muted">연습실을 찾을 수 없습니다</p>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 bg-brand-card border border-brand-border rounded-lg text-sm"
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
    <div className="min-h-screen pb-24">
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="fixed top-4 left-4 z-30 w-9 h-9 bg-black/60 backdrop-blur rounded-full flex items-center justify-center"
      >
        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Photos */}
      <PhotoGallery photos={studio.photos ?? []} name={studio.name} />

      {/* Info */}
      <div className="px-4 mt-4 space-y-5">
        {/* Title */}
        <div>
          <div className="flex items-center gap-1">
            <h1 className="text-xl font-bold flex-1">{studio.name}</h1>
            {roomLabel && (
              <span className="px-2 py-0.5 bg-brand-red text-white text-xs font-semibold rounded shrink-0">
                {roomLabel}
              </span>
            )}
            <FavoriteButton studioId={studio.id} studioName={studio.name} size="md" />
          </div>
          {studio.rating && (
            <p className="text-sm text-brand-muted mt-1">⭐ {studio.rating}</p>
          )}
        </div>

        {/* Address & Hours */}
        <div className="space-y-2 text-sm">
          {studio.address && (
            <div className="flex gap-2">
              <span className="text-brand-muted shrink-0">📍</span>
              <span>{studio.address}</span>
            </div>
          )}
          {studio.hours && (
            <div className="flex gap-2">
              <span className="text-brand-muted shrink-0">🕐</span>
              <span>{studio.hours}</span>
            </div>
          )}
        </div>

        {/* Price */}
        <div className="p-4 bg-brand-card rounded-xl border border-brand-border">
          <p className="text-xs text-brand-muted mb-1">가격</p>
          <p className="text-lg font-bold text-brand-red">
            {studio.price_per_hour
              ? `₩${studio.price_per_hour.toLocaleString()} / 시간`
              : studio.price_info ?? '가격 문의'}
          </p>
        </div>

        {/* Music-specific Info */}
        <div className="p-4 bg-brand-card rounded-xl border border-brand-border space-y-3">
          <h2 className="text-sm font-semibold">연습실 특화 정보</h2>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-brand-muted text-xs">드럼</span>
              <p>{studio.has_drum ? '✅ 가능' : '❌ 불가'}</p>
            </div>
            {studio.capacity && (
              <div>
                <span className="text-brand-muted text-xs">수용 인원</span>
                <p>{studio.capacity}</p>
              </div>
            )}
            {studio.soundproof_grade && (
              <div>
                <span className="text-brand-muted text-xs">방음 등급</span>
                <p>{studio.soundproof_grade}등급</p>
              </div>
            )}
            {studio.amp_info && (
              <div>
                <span className="text-brand-muted text-xs">앰프</span>
                <p>{studio.amp_info}</p>
              </div>
            )}
          </div>

          {studio.instruments && studio.instruments.length > 0 && (
            <div>
              <span className="text-brand-muted text-xs">보유 악기</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {studio.instruments.map((inst) => (
                  <span
                    key={inst}
                    className="px-2 py-0.5 bg-brand-bg border border-brand-border rounded text-xs"
                  >
                    {inst}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Options */}
        {optionTags.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold mb-2">옵션</h2>
            <div className="flex flex-wrap gap-1.5">
              {optionTags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-brand-card border border-brand-border rounded-full text-xs text-brand-muted"
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
            <h2 className="text-sm font-semibold mb-2">위치</h2>
            <KakaoMap lat={studio.lat} lng={studio.lng} name={studio.name} />
          </div>
        )}

        {/* Share */}
        <div>
          <h2 className="text-sm font-semibold mb-2">공유하기</h2>
          <KakaoShareButton
            studioId={studio.id}
            studioName={studio.name}
            studioAddress={studio.address || ''}
            imageUrl={studio.photos?.[0]}
          />
        </div>

        {/* Feedback link */}
        <div className="text-center pt-2">
          <Link
            href="/feedback"
            className="text-xs text-gray-500 hover:text-brand-red transition-colors"
          >
            건의사항 남기기 →
          </Link>
        </div>
      </div>

      {/* CTA */}
      <ContactButtons studio={studio} />
    </div>
  );
}
