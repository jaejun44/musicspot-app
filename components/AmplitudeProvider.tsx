'use client';

import { getCommonProps } from '@/lib/analytics/context';
import { useEffect } from 'react';
import * as amplitude from '@amplitude/unified';
import { AMPLITUDE_API_KEY, AMPLITUDE_ENABLED, SR_MASK_CLASS } from '@/lib/amplitude';
import { setAnalyticsUserId, syncUserProperties, track } from '@/lib/analytics';
import { supabase } from '@/lib/supabase';
import { getClientLocale } from '@/lib/i18n';
import { getClientCountry } from '@/lib/geo';

// 앱 생명주기 전체에서 단 한 번만 실행 (StrictMode 이중 마운트 · 라우팅 재마운트 방어).
// 루트 레이아웃에 한 번 마운트돼 언마운트되지 않으므로 cleanup으로 되돌리지 않는다.
// (StrictMode가 unmount→remount할 때 구독을 해제하면 두 번째 마운트는 이 플래그에
//  막혀 재구독하지 못하고, 로그인 상태 추적이 죽는다.)
let initialized = false;

/**
 * Amplitude Analytics + Session Replay 초기화 및 유저 아이덴티티 동기화.
 * 클라이언트에서만 동작 (useEffect 내부이므로 SSR 시 실행되지 않음).
 */
export default function AmplitudeProvider() {
  useEffect(() => {
    getCommonProps(); // 첫 이벤트/내부 이동 전에 랜딩 캠페인을 보존
    if (initialized) return;
    initialized = true;

    // ── auth 상태 → 트래킹 유저 식별 ──────────────────────────
    // Amplitude 키가 없어도 이 구독은 돌아야 한다.
    // user_events의 user_id / 공통 속성 is_logged_in이 여기에 의존.
    function applyUser(userId: string | null) {
      setAnalyticsUserId(userId);
      if (!AMPLITUDE_ENABLED) return;
      if (userId) {
        amplitude.setUserId(userId);
        void syncUserProperties(userId);
      } else {
        // userId + deviceId 초기화 → 같은 브라우저의 다음 유저와 세션이 섞이지 않게
        amplitude.reset();
      }
    }

    if (!AMPLITUDE_ENABLED) {
      console.warn(
        '[amplitude] NEXT_PUBLIC_AMPLITUDE_API_KEY 미설정 — Amplitude 트래킹 비활성 (GA4·user_events는 정상 동작)'
      );
    } else {
      amplitude.initAll(AMPLITUDE_API_KEY, {
        analytics: { autocapture: true },
        sessionReplay: {
          sampleRate: 1,
          privacyConfig: {
            // 1:1 DM 본문은 녹화에서 가린다. 지정 안 하면 말풍선 텍스트가 그대로 찍힌다.
            maskSelector: [`.${SR_MASK_CLASS}`],
          },
        },
      });

      // country / language — 모든 유저 활동에 남겨야 하는 축 (docs/RULES.md)
      const identity = new amplitude.Identify();
      identity.set('language', getClientLocale());
      const country = getClientCountry();
      if (country) identity.set('country', country);
      amplitude.identify(identity);
    }

    // init이 async여도 dispatchQ가 버퍼링하므로 순서 걱정은 없다.
    void supabase.auth.getSession().then(({ data: { session } }) => {
      applyUser(session?.user?.id ?? null);
    });

    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        track('auth_logout');
        applyUser(null);
      } else if (session?.user) {
        applyUser(session.user.id);
      }
    });
  }, []);

  return null;
}
