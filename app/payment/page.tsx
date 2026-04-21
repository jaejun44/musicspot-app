import { Suspense } from 'react';
import { Metadata } from 'next';
import PaymentClient from './_components/PaymentClient';

export const metadata: Metadata = {
  title: '결제하기 | Music Spot',
  description: '연습실 예약 결제를 진행합니다.',
};

export default function PaymentPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FFF8F0] flex items-center justify-center">
          <div className="w-10 h-10 rounded-full border-[3px] border-[#FF3D77] border-t-transparent animate-spin" />
        </div>
      }
    >
      <PaymentClient />
    </Suspense>
  );
}
