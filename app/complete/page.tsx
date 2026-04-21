import { Suspense } from 'react';
import { Metadata } from 'next';
import CompleteClient from './_components/CompleteClient';

export const metadata: Metadata = {
  title: '예약 완료 | Music Spot',
  description: '연습실 예약이 완료되었습니다.',
};

export default function CompletePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FFF8F0] flex items-center justify-center">
          <div className="w-10 h-10 rounded-full border-[3px] border-[#FF3D77] border-t-transparent animate-spin" />
        </div>
      }
    >
      <CompleteClient />
    </Suspense>
  );
}
