import type { Metadata } from 'next';
import HomeClient from './_components/HomeClient';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://musicspotapp.vercel.app';

export const metadata: Metadata = {
  title: 'Music Spot — 내 밴드에 맞는 연습실 찾기',
  description:
    '국내 1,000개+ 합주실·연습실을 지도와 목록으로 한눈에. 위치·가격·드럼 여부로 빠르게 필터링하고 바로 문의하세요.',
  alternates: { canonical: SITE_URL },
  openGraph: {
    title: 'Music Spot — 내 밴드에 맞는 연습실 찾기',
    description: '국내 1,000개+ 합주실·연습실을 지도와 목록으로 한눈에 확인하세요.',
    url: SITE_URL,
    images: [{ url: '/ms_character/starbeat.png', width: 1200, height: 630, alt: 'Music Spot' }],
  },
};

export default function HomePage() {
  return <HomeClient />;
}
