/**
 * 모든 이벤트에 자동으로 붙는 공통 속성 + Amplitude 유저 속성 동기화.
 *
 * 이벤트마다 country/locale를 손으로 넣지 않는다. 빠뜨리면 세그먼트 분석이
 * 통째로 깨지는데(한/일 비교가 핵심), 손으로 넣는 방식은 반드시 빠뜨린다.
 */

import { getAttribution } from './attribution';
import * as amplitude from '@amplitude/unified';
import { AMPLITUDE_ENABLED } from '@/lib/amplitude';
import { getClientLocale } from '@/lib/i18n';
import { getClientCountry } from '@/lib/geo';
import { supabase } from '@/lib/supabase';

// ─── 익명 세션 ID (Supabase user_events 용) ──────────────────────
export function getSessionId(): string {
  if (typeof window === 'undefined') return 'ssr';
  let sid = sessionStorage.getItem('ms_sid');
  if (!sid) {
    sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem('ms_sid', sid);
  }
  return sid;
}

// ─── 로그인 상태 캐시 ────────────────────────────────────────────
// 공통 속성을 만들 때마다 await 할 수 없으므로, AmplitudeProvider가
// auth 상태 변화 때 여기에 밀어넣은 값을 동기적으로 읽는다.
let currentUserId: string | null = null;

export function setAnalyticsUserId(userId: string | null) {
  currentUserId = userId;
}

export function getAnalyticsUserId(): string | null {
  return currentUserId;
}

// ─── 공통 속성 ───────────────────────────────────────────────────
export type CommonProps = {
  page: string;
  referrer_host: string;
  locale: string;
  country: string;
  is_logged_in: boolean;
  is_pwa: boolean;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
};

/** referrer는 전체 URL 대신 호스트만 (카디널리티 폭발 + 쿼리스트링 PII 방어) */
function referrerHost(): string {
  if (typeof document === 'undefined' || !document.referrer) return 'direct';
  try {
    const host = new URL(document.referrer).hostname;
    return host === window.location.hostname ? 'internal' : host;
  } catch {
    return 'unknown';
  }
}

function utmProps(): Partial<CommonProps> {
  if (typeof window === 'undefined') return {};
  let storage: Storage | undefined;
  try { storage = window.sessionStorage; } catch { /* 저장소 차단 시 현재 URL만 사용 */ }
  return getAttribution(window.location.search, storage);
}

export function getCommonProps(): CommonProps {
  if (typeof window === 'undefined') {
    return {
      page: '',
      referrer_host: 'ssr',
      locale: 'ko',
      country: 'unknown',
      is_logged_in: false,
      is_pwa: false,
    };
  }
  return {
    // 검색어·토큰이 섞일 수 있는 search는 제외하고 경로만
    page: window.location.pathname,
    referrer_host: referrerHost(),
    locale: getClientLocale(),
    country: getClientCountry() ?? 'unknown',
    is_logged_in: currentUserId !== null,
    is_pwa: window.matchMedia?.('(display-mode: standalone)').matches ?? false,
    ...utmProps(),
  };
}

/** Supabase user_events용 — 전체 경로(쿼리 포함), 내부 분석 전용 */
export function getCurrentPage(): string {
  if (typeof window === 'undefined') return '';
  return window.location.pathname + window.location.search;
}

// ─── 유저 속성 ───────────────────────────────────────────────────
export type UserProps = {
  language: string;
  country: string;
  /** 8마디 명예 점수 — 세그먼트(파워유저 vs 신규) 분리의 축 */
  challenge_score: number;
  /** 획득 타이틀 수 */
  title_count: number;
  /** 밴드 소속 여부 — Stage 2 전환 판정 */
  has_band: boolean;
  /** 밴드매칭 프로필 작성 여부 */
  has_profile: boolean;
  /** 업로드한 8마디 트랙 수 */
  stem_track_count: number;
  signup_date: string;
};

/**
 * 유저 속성 갱신. 로그인 직후 + 주요 행동(업로드·프로필 저장) 후 호출.
 * 실패해도 조용히 무시 — 트래킹이 서비스를 막으면 안 된다.
 */
export async function syncUserProperties(userId: string): Promise<void> {
  if (!AMPLITUDE_ENABLED) return;

  try {
    const [scoreRes, titleRes, bandRes, profileRes, trackRes] = await Promise.all([
      supabase.from('user_challenge_score').select('score').eq('user_id', userId).maybeSingle(),
      supabase.from('user_titles').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('band_members').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('user_profiles').select('created_at').eq('user_id', userId).maybeSingle(),
      supabase.from('stem_tracks').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    ]);

    const identify = new amplitude.Identify();
    identify.set('language', getClientLocale());
    const country = getClientCountry();
    if (country) identify.set('country', country);
    identify.set('challenge_score', (scoreRes.data as { score?: number } | null)?.score ?? 0);
    identify.set('title_count', titleRes.count ?? 0);
    identify.set('has_band', (bandRes.count ?? 0) > 0);
    identify.set('has_profile', profileRes.data != null);
    identify.set('stem_track_count', trackRes.count ?? 0);

    const signupDate = (profileRes.data as { created_at?: string } | null)?.created_at;
    // setOnce — 최초 1회만 기록해 코호트 기준일이 덮어써지지 않게
    if (signupDate) identify.setOnce('signup_date', signupDate.slice(0, 10));

    amplitude.identify(identify);
  } catch (e) {
    console.warn('[analytics] syncUserProperties failed:', e);
  }
}

/** 누적 카운터 증가 (Amplitude 유저 속성). 업로드·게시 등 행동 직후 */
export function incrementUserProperty(key: string, value = 1): void {
  if (!AMPLITUDE_ENABLED) return;
  const identify = new amplitude.Identify();
  identify.add(key, value);
  amplitude.identify(identify);
}
