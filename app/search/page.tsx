import { Suspense } from 'react';
import SearchClient from './_components/SearchClient';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://musicspotapp.vercel.app';

export const metadata = {
  title: '연습실 검색 | Music Spot',
  description: '위치·가격·드럼 여부로 내 주변 합주실을 빠르게 찾아보세요. 전국 1,000개+ 연습실 보유.',
  alternates: { canonical: `${SITE_URL}/search` },
  openGraph: {
    title: '연습실 검색 | Music Spot',
    description: '위치·가격·드럼 여부로 내 주변 합주실을 빠르게 찾아보세요.',
    url: `${SITE_URL}/search`,
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'Music Spot 연습실 검색' }],
  },
};

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FFF8F0]" />}>
      <SearchClient />
    </Suspense>
  );
}
