import { Suspense } from 'react';
import { cache } from 'react';
import { Metadata } from 'next';
import { supabase } from '@/lib/supabase';
import RoomDetailClient from './_components/RoomDetailClient';

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
    .select('id, name, address, phone, lat, lng, price_per_hour, price_info, photos, hours')
    .eq('id', id)
    .eq('is_published', true)
    .single();
  return data;
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await getStudio(params.id);

  if (!data) {
    return {
      title: '연습실 | Music Spot',
      description: '뮤지션을 위한 합주/연습실 플랫폼',
    };
  }

  const pageUrl = `${SITE_URL}/room/${params.id}`;
  const title = `${data.name} | Music Spot`;
  const price = data.price_per_hour
    ? `₩${data.price_per_hour.toLocaleString()}/h`
    : data.price_info ?? '';
  const description = [data.address, price, '합주 연습실 예약'].filter(Boolean).join(' · ');
  return {
    title,
    description,
    alternates: { canonical: pageUrl },
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
  };
}

export default async function RoomDetailPage({ params }: Props) {
  const data = await getStudio(params.id);

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
