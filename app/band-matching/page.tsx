import { Suspense } from 'react';
import { Metadata } from 'next';
import BandMatchingClient from './_components/BandMatchingClient';

export const metadata: Metadata = {
  title: '밴드 매칭 | Music Spot',
  description: '함께 연주할 뮤지션을 찾아보세요. 보컬, 기타, 베이스, 드럼, 건반 포지션별 매칭.',
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
