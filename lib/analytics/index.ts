/**
 * 이벤트 트래킹 단일 진입점.
 *
 * 한 번의 track() 호출이 세 곳으로 나간다:
 *   GA4(window.gtag) · Amplitude(@amplitude/unified) · Supabase `user_events`
 *
 * 사용법:
 *   track('challenge_upload_complete', { project_id, track_order, source, pass_count_after })
 *   → 이벤트명·속성은 `events.ts`의 EventSchema가 강제. 오타/누락은 컴파일 에러.
 *   → country/locale/page/is_logged_in/utm_* 은 자동 첨부 (직접 넣지 말 것).
 */

import * as amplitude from '@amplitude/unified';
import { AMPLITUDE_ENABLED } from '@/lib/amplitude';
import { supabase } from '@/lib/supabase';
import type { EventName, EventSchema } from './events';
import {
  getCommonProps,
  getCurrentPage,
  getSessionId,
  getAnalyticsUserId,
} from './context';

export * from './events';
export {
  setAnalyticsUserId,
  syncUserProperties,
  incrementUserProperty,
  getSessionId,
} from './context';

declare global {
  interface Window {
    gtag: (command: string, eventName: string, params?: Record<string, unknown>) => void;
  }
}

type AnyProps = Record<string, unknown>;

// ─── 핵심 track ──────────────────────────────────────────────────
/**
 * 타입 안전 이벤트 전송. 속성이 없는 이벤트는 두 번째 인자 생략 가능.
 */
export function track<E extends EventName>(
  ...args: Record<string, never> extends EventSchema[E]
    ? [event: E, props?: EventSchema[E]]
    : [event: E, props: EventSchema[E]]
): void {
  const [event, props] = args;
  if (typeof window === 'undefined') return; // 클라이언트 전용

  const payload: AnyProps = { ...getCommonProps(), ...(props ?? {}) };

  // undefined 속성은 제거 — Amplitude/GA4 스키마에 빈 키가 남지 않게
  for (const key of Object.keys(payload)) {
    if (payload[key] === undefined) delete payload[key];
  }

  if ('gtag' in window && typeof window.gtag === 'function') {
    window.gtag('event', event, payload);
  }

  // 키 미설정 시 init이 안 되고, 그 상태로 track하면 이벤트가 내부 큐에 무한 적립된다.
  if (AMPLITUDE_ENABLED) {
    amplitude.track(event, payload);
  }

  void logEvent(event, payload);
}

// ─── Supabase 적재 ───────────────────────────────────────────────
/**
 * 레거시 전용 컬럼(studio_id/studio_name/click_type/search_query)은 기존 대시보드·쿼리가
 * 물려 있어 유지하고, 나머지 속성은 전부 `props` jsonb에 담는다.
 * (마이그레이션: supabase/08_user_events_props.sql)
 */
async function logEvent(eventType: string, props: AnyProps) {
  try {
    const studioId = typeof props.studio_id === 'string' ? props.studio_id : undefined;
    const studioName = typeof props.studio_name === 'string' ? props.studio_name : undefined;
    const clickType =
      typeof props.type === 'string'
        ? props.type
        : typeof props.action === 'string'
          ? props.action
          : undefined;
    const searchQuery =
      typeof props.query === 'string'
        ? props.query
        : typeof props.method === 'string'
          ? props.method
          : undefined;

    await supabase.from('user_events').insert({
      session_id: getSessionId(),
      user_id: getAnalyticsUserId(),
      page: getCurrentPage(),
      referrer: typeof document !== 'undefined' ? document.referrer || '' : '',
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      event_type: eventType,
      studio_id: studioId ?? null,
      studio_name: studioName ?? null,
      click_type: clickType ?? null,
      search_query: searchQuery ?? null,
      country: typeof props.country === 'string' ? props.country : null,
      language: typeof props.locale === 'string' ? props.locale : null,
      props,
    });
  } catch (e) {
    // 트래킹 실패가 서비스에 영향을 주면 안 된다 → 조용히 무시
    console.warn('[analytics] logEvent failed:', e);
  }
}

// ─── 연습실 (기존 호출부 호환 래퍼 — 시그니처 변경 금지) ──────────

export function trackStudioView(studioId: string, studioName: string) {
  track('studio_view', { studio_id: studioId, studio_name: studioName });
}

export function trackContactClick(
  type: 'source' | 'naver' | 'kakao' | 'phone',
  studioId: string,
  _studioName?: string
) {
  track('contact_click', { type, studio_id: studioId });
}

export function trackSearch(method: 'gps' | 'text', query?: string) {
  track('search', { method, ...(query ? { query } : {}) });
}

export function trackFilterApply(filterType: string, value: string) {
  track('filter_apply', { filter_type: filterType, value });
}

export function trackComingSoonClick(tabName: 'band_matching' | 'community') {
  track('coming_soon_click', { tab_name: tabName });
}

export function trackFavoriteToggle(action: 'add' | 'remove', studioId: string) {
  track('favorite_toggle', { action, studio_id: studioId });
}

export function trackViewToggle(view: 'list' | 'map') {
  track('view_toggle', { view });
}

export function trackLoadMore(currentCount: number) {
  track('load_more', { current_count: currentCount });
}

export function trackMapMarkerClick(studioId: string, studioName: string) {
  track('map_marker_click', { studio_id: studioId, studio_name: studioName });
}

export function trackHotRoomClick(studioId: string, studioName: string) {
  track('hot_room_click', { studio_id: studioId, studio_name: studioName });
}

export function trackBookingAttempt(studioId: string, studioName: string) {
  track('booking_attempt', { studio_id: studioId, studio_name: studioName });
}

export function trackBookingStart(studioId: string, studioName: string) {
  track('booking_start', { studio_id: studioId, studio_name: studioName });
}

export function trackPaymentSelect(method: 'card' | 'bank' | 'kakao', studioId: string) {
  track('payment_select', { method, studio_id: studioId });
}

export function trackBookingComplete(
  studioId: string,
  studioName: string,
  totalPrice: number | null
) {
  track('booking_complete', {
    studio_id: studioId,
    studio_name: studioName,
    ...(totalPrice != null && { value: totalPrice }),
  });
}

/** 밴드매칭 연락하기 (기존 호출부 호환) */
export function trackBandContact(
  type: 'open_modal' | 'kakao' | 'dm',
  targetUserId: string,
  _position?: string
) {
  track('match_contact_click', { target_user_id: targetUserId, type });
}
