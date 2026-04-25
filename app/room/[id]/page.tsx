import { Suspense } from 'react';
import { cache } from 'react';
import { Metadata } from 'next';
import { supabase } from '@/lib/supabase';
import RoomDetailClient from './_components/RoomDetailClient';

interface Props {
  params: { id: string };
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://musicspot.app';

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
  const imageUrl = data.photos?.[0] ?? `${SITE_URL}/og-default.png`;

  return {
    title,
    description,
    alternates: { canonical: pageUrl },
    openGraph: {
      title,
      description,
      url: pageUrl,
      siteName: 'Music Spot',
      images: [{ url: imageUrl, width: 1200, height: 630, alt: data.name }],
      type: 'website',
      locale: 'ko_KR',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
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
