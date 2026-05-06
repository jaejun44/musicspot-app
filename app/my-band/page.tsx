import type { Metadata } from 'next';
import MyBandClient from './_components/MyBandClient';

export const metadata: Metadata = {
  title: '내 밴드 | Music Spot',
  description: '내 밴드 일정과 멤버를 관리하세요. 밴드를 만들고 스케줄을 공유해요.',
  openGraph: {
    title: '내 밴드 | Music Spot',
    description: '내 밴드 일정과 멤버를 관리하세요.',
    url: 'https://musicspotapp.vercel.app/my-band',
    siteName: 'Music Spot',
    locale: 'ko_KR',
    type: 'website',
  },
};

export default function MyBandPage() {
  return <MyBandClient />;
}
