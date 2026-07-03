// 서버/클라이언트 공용 로케일 상수·유틸 (React 의존 없음 — middleware에서도 사용)
export type Locale = 'ko' | 'ja';

export const LOCALE_COOKIE = 'NEXT_LOCALE';
export const DEFAULT_LOCALE: Locale = 'ko';
export const SUPPORTED_LOCALES: Locale[] = ['ko', 'ja'];

export function isLocale(value: unknown): value is Locale {
  return value === 'ko' || value === 'ja';
}

/** 일본어 모드에서 접근 차단할 연습실 관련 경로 prefix */
export const JA_BLOCKED_PREFIXES = [
  '/search',
  '/region',
  '/room',
  '/booking',
  '/my-bookings',
  '/complete',
  '/payment',
  '/partner',
  '/register', // 연습실 등록 신청
];

export function isJaBlockedPath(pathname: string): boolean {
  return JA_BLOCKED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}
