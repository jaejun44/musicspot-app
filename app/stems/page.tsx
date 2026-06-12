import { Suspense } from 'react';
import type { Metadata } from 'next';
import StemsClient from './_components/StemsClient';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.musicspotfest.com';

export const metadata: Metadata = {
  title: '8마디 챌린지 | Music Spot',
  description: '뮤지션들이 8마디씩 릴레이로 만들어가는 음악 프로젝트',
  alternates: { canonical: `${SITE_URL}/stems` },
  openGraph: {
    title: '8마디 챌린지 | Music Spot',
    description: '뮤지션들이 8마디씩 릴레이로 만들어가는 음악 프로젝트',
    url: `${SITE_URL}/stems`,
    siteName: 'Music Spot',
    type: 'website',
    locale: 'ko_KR',
  },
  twitter: {
    card: 'summary_large_image',
    title: '8마디 챌린지 | Music Spot',
    description: '뮤지션들이 8마디씩 릴레이로 만들어가는 음악 프로젝트',
  },
};

export default function StemsPage() {
  return (
    <Suspense>
      <StemsClient />
    </Suspense>
  );
}
