import type { Metadata } from 'next';
import Navigation from '@/components/Navigation';
import SiteFooter from '@/components/SiteFooter';
import JamHubClient from './_components/JamHubClient';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.musicspotfest.com';

const title = '백킹 잼 — 브라우저에서 바로 치는 반주 | Music Spot';
const description =
  '키와 스타일을 고르면 드럼·베이스·코드 반주가 바로 나와요. 블루스·락·펑크·메탈·발라드·팝펑크, 매일 바뀌는 오늘의 잼. 설치·로그인 없이 집에서 혼자 연습.';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: `${SITE_URL}/jam` },
  openGraph: { title, description, url: `${SITE_URL}/jam`, siteName: 'Music Spot', type: 'website', locale: 'ko_KR' },
  twitter: { card: 'summary_large_image', title, description },
};

export default function JamPage() {
  return (
    <>
      <Navigation />
      <JamHubClient />
      <SiteFooter />
    </>
  );
}
