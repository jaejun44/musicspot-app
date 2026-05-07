import type { Metadata } from 'next';
import QuizClient from './_components/QuizClient';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://musicspotapp.vercel.app';

export const metadata: Metadata = {
  title: '나에게 어울리는 악기는? 🎸 — Music Spot',
  description:
    '락·메탈 밴드 악기 유형 테스트! 7가지 질문으로 알아보는 나의 악기 DNA. 결과를 친구에게 공유해보세요.',
  alternates: { canonical: `${SITE_URL}/quiz` },
  openGraph: {
    title: '나에게 어울리는 악기는? 🎸',
    description: '락·메탈 밴드 악기 유형 테스트! 7가지 질문으로 알아보는 나의 악기 DNA.',
    url: `${SITE_URL}/quiz`,
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'Music Spot 악기 테스트' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '나에게 어울리는 악기는? 🎸',
    description: '락·메탈 밴드 악기 유형 테스트! 7가지 질문으로 알아보는 나의 악기 DNA.',
  },
};

export default function QuizPage() {
  return <QuizClient />;
}
