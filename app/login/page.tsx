import { Suspense } from 'react';
import { Metadata } from 'next';
import LoginClient from './_components/LoginClient';

export const metadata: Metadata = {
  title: '로그인 | Music Spot',
  description: '뮤지션을 위한 합주/연습실 플랫폼 Music Spot에 로그인하세요.',
};

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FFF8F0] flex items-center justify-center">
          <div className="w-10 h-10 rounded-full border-[3px] border-[#FF3D77] border-t-transparent animate-spin" />
        </div>
      }
    >
      <LoginClient />
    </Suspense>
  );
}
