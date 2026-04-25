import { supabase } from '@/lib/supabase';

type EventParams = Record<string, string | number | boolean>;

// ─── 익명 세션 ID ────────────────────────────────────────────────
function getSessionId(): string {
  if (typeof window === 'undefined') return 'ssr';
  let sid = sessionStorage.getItem('ms_sid');
  if (!sid) {
    sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem('ms_sid', sid);
  }
  return sid;
}

function getCurrentPage(): string {
  if (typeof window === 'undefined') return '';
  return window.location.pathname + window.location.search;
}

function getReferrer(): string {
  if (typeof window === 'undefined') return '';
  return document.referrer || '';
}

// ─── GA4 이벤트 (기존 유지) ───────────────────────────────────────
function trackGA(eventName: string, params?: EventParams) {
  if (typeof window !== 'undefined' && 'gtag' in window) {
    (window as any).gtag('event', eventName, params);
  }
}

// ─── Supabase 직접 적재 ───────────────────────────────────────────
async function logEvent(payload: {
  event_type: string;
  studio_id?: string;
  studio_name?: string;
  click_type?: string;
  search_query?: string;
}) {
  try {
    await supabase.from('user_events').insert({
      session_id: getSessionId(),
      page: getCurrentPage(),
      referrer: getReferrer(),
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      ...payload,
    });
  } catch (e) {
    // 트래킹 실패가 서비스에 영향을 주면 안됨 → 조용히 무시
    console.warn('[analytics] logEvent failed:', e);
  }
}

// ─── Public API ──────────────────────────────────────────────────

/** 범용 이벤트 (KakaoShareButton, ReportModal 등 기존 호출자 호환) */
export function trackEvent(eventName: string, params?: EventParams) {
  trackGA(eventName, params);
  logEvent({ event_type: eventName });
}

/** 연습실 상세 페이지 진입 */
export function trackStudioView(studioId: string, studioName: string) {
  trackGA('studio_view', { studio_id: studioId, studio_name: studioName });
  logEvent({ event_type: 'studio_view', studio_id: studioId, studio_name: studioName });
}

/** 예약 버튼 클릭 (네이버/카카오/전화) — 가장 중요한 이벤트 */
export function trackContactClick(
  type: 'naver' | 'kakao' | 'phone',
  studioId: string,
  studioName?: string
) {
  trackGA('contact_click', { type, studio_id: studioId });
  logEvent({
    event_type: 'contact_click',
    studio_id: studioId,
    studio_name: studioName,
    click_type: type,
  });
}

/** 검색 실행 */
export function trackSearch(method: 'gps' | 'text', query?: string) {
  trackGA('search', { method, ...(query ? { query } : {}) });
  logEvent({
    event_type: 'search',
    search_query: query ?? method,
  });
}

/** 필터 적용 */
export function trackFilterApply(filterType: string, value: string) {
  trackGA('filter_apply', { filter_type: filterType, value });
  logEvent({
    event_type: 'filter_apply',
    search_query: `${filterType}:${value}`,
  });
}

/** 커밍순 탭 클릭 (밴드매칭, 커뮤니티 등) */
export function trackComingSoonClick(tabName: 'band_matching' | 'community') {
  trackGA('coming_soon_click', { tab_name: tabName });
  logEvent({ event_type: 'coming_soon_click', search_query: tabName });
}

/** 밴드매칭 연락하기 클릭 */
export function trackBandContact(
  type: 'open_modal' | 'kakao',
  musicianName: string,
  position: string
) {
  trackGA('band_contact_click', { type, musician: musicianName, position });
  logEvent({
    event_type: 'band_contact_click',
    click_type: type,
    studio_name: `${musicianName} (${position})`,
  });
}

/** 즐겨찾기 토글 */
export function trackFavoriteToggle(action: 'add' | 'remove', studioId: string) {
  trackGA('favorite_toggle', { action, studio_id: studioId });
  logEvent({ event_type: 'favorite_toggle', studio_id: studioId, click_type: action });
}

/** 목록/지도 뷰 전환 */
export function trackViewToggle(view: 'list' | 'map') {
  trackGA('view_toggle', { view });
  logEvent({ event_type: 'view_toggle', search_query: view });
}

/** 더보기 버튼 클릭 */
export function trackLoadMore(currentCount: number) {
  trackGA('load_more', { current_count: currentCount });
  logEvent({ event_type: 'load_more' });
}

/** 지도 마커 클릭 */
export function trackMapMarkerClick(studioId: string, studioName: string) {
  trackGA('map_marker_click', { studio_id: studioId, studio_name: studioName });
  logEvent({ event_type: 'map_marker_click', studio_id: studioId, studio_name: studioName });
}

/** 랜딩 HOT 연습실 카드 클릭 */
export function trackHotRoomClick(studioId: string, studioName: string) {
  trackGA('hot_room_click', { studio_id: studioId, studio_name: studioName });
  logEvent({ event_type: 'hot_room_click', studio_id: studioId, studio_name: studioName });
}

/** 예약 시도 — "지금 예약하기" 버튼 클릭 (B2B 수요 측정 핵심 지표) */
export function trackBookingAttempt(studioId: string, studioName: string) {
  trackGA('booking_attempt', { studio_id: studioId, studio_name: studioName });
  logEvent({ event_type: 'booking_attempt', studio_id: studioId, studio_name: studioName });
}

/** 결제 완료 — 실제 예약 확정 */
export function trackBookingComplete(studioId: string, studioName: string, totalPrice: number | null) {
  trackGA('booking_complete', {
    studio_id: studioId,
    studio_name: studioName,
    ...(totalPrice != null && { value: totalPrice }),
  });
  logEvent({ event_type: 'booking_complete', studio_id: studioId, studio_name: studioName });
}
