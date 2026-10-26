import { Suspense } from 'react';
import { cache } from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { localeAlternates } from '@/lib/seo';
import { REGIONS } from '@/lib/regions';
import { pickNearbyRooms, nearestRegion } from '@/lib/nearby-rooms';
import type { Studio } from '@/types/studio';
import Navigation from '@/components/Navigation';
import RoomDetailClient from './_components/RoomDetailClient';
import UnavailableRoom from './_components/UnavailableRoom';

interface Props {
  params: { id: string };
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.musicspotfest.com';

// ISR: 룸 상세는 거의 변하지 않으므로 1시간 캐싱.
// 빌드 시 generateStaticParams 의 인기 룸을 프리렌더하고,
// 그 외 id 는 첫 요청 때 생성 후 캐싱(dynamicParams=true).
export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
  // 발행된 룸 중 일부를 빌드 타임에 미리 생성(전체 빌드 시간 폭증 방지를 위해 상한).
  const { data } = await supabase
    .from('studios')
    .select('id')
    .eq('is_published', true)
    .order('data_quality_score', { ascending: false })
    .limit(500);
  return (data ?? []).map((s: { id: string }) => ({ id: s.id }));
}

const getStudio = cache(async (id: string) => {
  const { data } = await supabase
    .from('studios')
    .select(
      'id, name, address, phone, lat, lng, price_per_hour, price_info, photos, hours, region, review_avg, review_count'
    )
    .eq('id', id)
    .eq('is_published', true)
    .single();
  return data;
});

/**
 * 공개 목록에 없는 id의 상태. 'hidden' = 비공개(폐업·모집 끝난 광고)라 근처 대안을 보여줌,
 * 'missing' = 그런 연습실이 없음(진짜 404), 'unknown' = 조회 실패(예전처럼 클라이언트가 처리)
 */
type HiddenStudio = Pick<Studio, 'id' | 'name' | 'lat' | 'lng' | 'room_type'>;
const getHiddenStudio = cache(
  async (id: string): Promise<{ state: 'hidden'; studio: HiddenStudio } | { state: 'missing' | 'unknown' }> => {
    const { data, error } = await supabase
      .from('studios')
      .select('id, name, lat, lng, room_type, is_published')
      .eq('id', id)
      .maybeSingle();
    if (error) return { state: 'unknown' }; // uuid 형식 아님 등 — ISR에 404가 굳지 않게 판단 보류
    if (!data) return { state: 'missing' };
    if (data.is_published) return { state: 'unknown' }; // 그사이 공개됨
    return { state: 'hidden', studio: data as HiddenStudio };
  },
);

/** 비공개 연습실 근처의 공개 연습실. 약 3km 상자에서 3곳이 안 되면 약 10km로 넓힌다 */
async function fetchNearbyRooms(origin: HiddenStudio) {
  if (origin.lat == null || origin.lng == null) return [];
  const center = { lat: origin.lat, lng: origin.lng, room_type: origin.room_type ?? null };
  for (const box of [0.03, 0.1]) {
    // 상자 안 공개 연습실은 1,000곳보다 훨씬 적어 한 번의 range로 충분
    const { data } = await supabase
      .from('studios')
      .select('*')
      .eq('is_published', true)
      .gte('lat', center.lat - box)
      .lte('lat', center.lat + box)
      .gte('lng', center.lng - box * 1.25)
      .lte('lng', center.lng + box * 1.25)
      .range(0, 999);
    const rooms = pickNearbyRooms(center, (data ?? []) as Studio[]);
    if (rooms.length >= 3 || box === 0.1) return rooms;
  }
  return [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await getStudio(params.id);

  if (!data) {
    // 비공개·없는 연습실은 검색 결과에서 빠지게 (링크는 따라가도 됨)
    return {
      title: '연습실 정보 없음 | Music Spot',
      description: '뮤지션을 위한 합주/연습실 플랫폼',
      robots: { index: false, follow: true },
    };
  }

  const pageUrl = `${SITE_URL}/room/${params.id}`;
  const title = `${data.name} | Music Spot`;
  const price = data.price_per_hour
    ? `₩${data.price_per_hour.toLocaleString()}/h`
    : data.price_info ?? '';
  const description = [data.address, price, '합주 연습실 예약'].filter(Boolean).join(' · ');

  // 좌표 있을 때만 geo 메타태그(로컬 검색 신호)
  const geoMeta: Record<string, string> | undefined =
    data.lat != null && data.lng != null
      ? {
          'geo.position': `${data.lat};${data.lng}`,
          ICBM: `${data.lat}, ${data.lng}`,
          ...(data.region && { 'geo.placename': data.region }),
        }
      : undefined;

  return {
    title,
    description,
    alternates: localeAlternates(pageUrl),
    openGraph: {
      title,
      description,
      url: pageUrl,
      siteName: 'Music Spot',
      type: 'website',
      locale: 'ko_KR',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    ...(geoMeta && { other: geoMeta }),
  };
}

export default async function RoomDetailPage({ params }: Props) {
  const data = await getStudio(params.id);

  if (!data) {
    const hidden = await getHiddenStudio(params.id);
    if (hidden.state === 'missing') notFound();
    if (hidden.state === 'hidden') {
      const { studio } = hidden;
      const rooms = await fetchNearbyRooms(studio);
      const region =
        studio.lat != null && studio.lng != null ? nearestRegion(studio.lat, studio.lng, REGIONS) : null;
      return (
        <>
          <Navigation />
          <UnavailableRoom
            studioId={studio.id}
            name={studio.name}
            rooms={rooms}
            region={region && { slug: region.slug, label: region.label }}
          />
        </>
      );
    }
  }

  const jsonLd = data
    ? {
        '@context': 'https://schema.org',
        '@type': 'LocalBusiness',
        name: data.name,
        url: `${SITE_URL}/room/${params.id}`,
        ...(data.address && {
          address: {
            '@type': 'PostalAddress',
            streetAddress: data.address,
            ...(data.region && { addressRegion: data.region }),
            addressCountry: 'KR',
          },
        }),
        ...(data.phone && { telephone: data.phone }),
        ...(data.lat && data.lng && {
          geo: {
            '@type': 'GeoCoordinates',
            latitude: data.lat,
            longitude: data.lng,
          },
        }),
        ...(data.price_per_hour && {
          priceRange: `₩${data.price_per_hour.toLocaleString()}/h`,
        }),
        ...(data.photos?.[0] && { image: data.photos[0] }),
        ...(data.hours && { openingHours: data.hours }),
        // 리뷰가 실제로 있을 때만 aggregateRating 노출(빈 평점은 구글이 무효 마크업으로 간주).
        ...(data.review_count &&
          data.review_count > 0 &&
          data.review_avg != null && {
            aggregateRating: {
              '@type': 'AggregateRating',
              ratingValue: Number(data.review_avg).toFixed(1),
              reviewCount: data.review_count,
              bestRating: 5,
              worstRating: 1,
            },
          }),
      }
    : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <Suspense
        fallback={
          <div className="min-h-screen bg-[#FFF8F0] flex items-center justify-center">
            <div className="w-10 h-10 rounded-full border-[3px] border-[#FF3D77] border-t-transparent animate-spin" />
          </div>
        }
      >
        <RoomDetailClient />
      </Suspense>
    </>
  );
}
