import type { Metadata } from 'next';
import Navigation from '@/components/Navigation';
import EarClient from './_components/EarClient';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.musicspotfest.com';

const title = '오늘의 음감 — 매일 5문제 | Music Spot';
const description = '하루 한 번, 모두 같은 5문제. 음정·코드·코드 진행을 듣고 맞혀 보세요. 로그인 없이 바로 시작.';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: `${SITE_URL}/ear` },
  openGraph: { title, description, url: `${SITE_URL}/ear`, siteName: 'Music Spot', type: 'website', locale: 'ko_KR' },
  twitter: { card: 'summary_large_image', title, description },
};

export default function EarPage() {
  return (
    <>
      <Navigation />
      <EarClient />
    </>
  );
}
