import { Suspense } from 'react';
import { Metadata } from 'next';
import MyBookingsClient from './_components/MyBookingsClient';

export const metadata: Metadata = {
  title: '마이페이지 | Music Spot',
  description: '내 예약, 즐겨찾기, 최근 본 연습실을 확인하세요.',
};

export default function MyBookingsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FFF8F0] flex items-center justify-center">
          <div className="w-10 h-10 rounded-full border-[3px] border-[#FF3D77] border-t-transparent animate-spin" />
        </div>
      }
    >
      <MyBookingsClient />
    </Suspense>
  );
}
