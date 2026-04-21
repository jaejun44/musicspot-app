import { Suspense } from 'react';
import { Metadata } from 'next';
import CommunityClient from './_components/CommunityClient';

export const metadata: Metadata = {
  title: '커뮤니티 | Music Spot',
  description: '뮤지션들의 이야기가 모이는 곳. 연습실 후기, 밴드 구인, 자유 게시판.',
};

export default function CommunityPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FFF8F0] flex items-center justify-center">
          <div className="w-10 h-10 rounded-full border-[3px] border-[#FF3D77] border-t-transparent animate-spin" />
        </div>
      }
    >
      <CommunityClient />
    </Suspense>
  );
}
