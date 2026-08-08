'use client';

import { useEffect } from 'react';
import * as amplitude from '@amplitude/unified';

const AMPLITUDE_API_KEY = '528fb34e1421cfc2699e350cd5e75a98';

// 앱 생명주기 전체에서 단 한 번만 init (StrictMode 이중 마운트 · 라우팅 재마운트 방어)
let initialized = false;

/**
 * Amplitude Analytics + Session Replay 초기화.
 * 클라이언트에서만 동작 (useEffect 내부이므로 SSR 시 실행되지 않음).
 */
export default function AmplitudeProvider() {
  useEffect(() => {
    if (initialized) return;
    initialized = true;

    amplitude.initAll(AMPLITUDE_API_KEY, {
      analytics: { autocapture: true },
      sessionReplay: { sampleRate: 1 },
    });
  }, []);

  return null;
}
