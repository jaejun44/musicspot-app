import { Suspense } from 'react';
import { Metadata } from 'next';
import BandMatchingClient from './_components/BandMatchingClient';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.musicspotfest.com';

export const metadata: Metadata = {
  title: '밴드 매칭 | Music Spot',
  description: '함께 연주할 뮤지션을 찾아보세요. 보컬, 기타, 베이스, 드럼, 건반 포지션별 매칭.',
  alternates: { canonical: `${SITE_URL}/band-matching` },
  openGraph: {
    title: '밴드 매칭 | Music Spot',
    description: '함께 연주할 뮤지션을 찾아보세요. 보컬·기타·베이스·드럼·건반 포지션별 매칭.',
    url: `${SITE_URL}/band-matching`,
    siteName: 'Music Spot',
    type: 'website',
    locale: 'ko_KR',
    images: [{ url: '/ms_character/starbeat.png', width: 1200, height: 630, alt: 'Music Spot 밴드 매칭' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '밴드 매칭 | Music Spot',
    description: '함께 연주할 뮤지션을 찾아보세요.',
  },
};

export default function BandMatchingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FFF8F0] flex items-center justify-center">
          <div className="w-10 h-10 rounded-full border-[3px] border-[#FF3D77] border-t-transparent animate-spin" />
        </div>
      }
    >
      <BandMatchingClient />
    </Suspense>
  );
}
