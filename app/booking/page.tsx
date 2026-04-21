import { Suspense } from 'react';
import { Metadata } from 'next';
import BookingClient from './_components/BookingClient';

export const metadata: Metadata = {
  title: '예약하기 | Music Spot',
  description: '연습실 예약 정보를 입력하세요.',
};

export default function BookingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FFF8F0] flex items-center justify-center">
          <div className="w-10 h-10 rounded-full border-[3px] border-[#FF3D77] border-t-transparent animate-spin" />
        </div>
      }
    >
      <BookingClient />
    </Suspense>
  );
}
