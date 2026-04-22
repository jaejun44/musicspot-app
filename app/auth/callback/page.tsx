'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    // Supabase JS SDK가 URL의 code를 자동으로 세션으로 교환함
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace('/my-bookings');
      } else {
        router.replace('/login');
      }
    });
  }, [router]);

  return (
    <div className="min-h-screen bg-[#FFF8F0] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full border-[3px] border-[#FF3D77] border-t-transparent animate-spin" />
        <p
          className="text-[14px] font-bold text-[#0A0A0A]/50"
          style={{ fontFamily: 'Pretendard, sans-serif' }}
        >
          로그인 처리 중...
        </p>
      </div>
    </div>
  );
}
