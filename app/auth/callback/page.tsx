'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { safeInternalPath } from '@/lib/safe-redirect';
import { useT } from '@/lib/i18n';
import { track, setAnalyticsUserId, syncUserProperties } from '@/lib/analytics';

export default function AuthCallbackPage() {
  const router = useRouter();
  const t = useT();

  useEffect(() => {
    // 공유 링크 → 로그인 → 콜백 복귀 경로. 내부 경로만 허용(오픈 리다이렉트 방지).
    const rawReturnTo =
      typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('returnTo')
        : null;
    const dest = safeInternalPath(rawReturnTo, '/my-bookings');

    // Supabase JS SDK가 URL의 code를 자동으로 세션으로 교환함
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        const user = session.user;
        const provider = user.app_metadata?.provider ?? 'unknown';
        // 계정 생성 직후 첫 콜백이면 신규 가입. created_at이 1분 이내면 신규로 본다
        // (Supabase가 신규/기존 플래그를 세션에 주지 않음).
        const isNewUser = Date.now() - new Date(user.created_at).getTime() < 60_000;

        setAnalyticsUserId(user.id);
        track('auth_login_success', { provider, is_new_user: isNewUser });
        void syncUserProperties(user.id);

        router.replace(dest);
      } else {
        track('auth_login_fail', { provider: 'unknown', reason: 'no_session_on_callback' });
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
          {t('로그인 처리 중...')}
        </p>
      </div>
    </div>
  );
}
