'use client';

// ─────────────────────────────────────────────────────────────
// Music Spot i18n (gettext 방식: 한국어 원문이 곧 키)
//
// 사용법 (클라이언트 컴포넌트):
//   const t = useT();
//   <button>{t('로그인')}</button>
//   t('총 {count}명', { count: 5 })
//
// 사용법 (React 밖: lib/*.ts, 이벤트 핸들러 등):
//   import { t } from '@/lib/i18n';
//   alert(t('마이크 권한이 필요해요'));
//
// 사전에 없는 문장은 한국어 원문 그대로 노출된다(안전한 폴백).
// ─────────────────────────────────────────────────────────────

import { createContext, useContext, useCallback } from 'react';
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from './locale';
import { CORE_JA } from './dict/core-ja';
import { BAND_JA } from './dict/band-ja';
import { COMMUNITY_JA } from './dict/community-ja';

export type { Locale } from './locale';

const DICT_JA: Record<string, string> = {
  ...CORE_JA,
  ...BAND_JA,
  ...COMMUNITY_JA,
};

type Vars = Record<string, string | number>;

function interpolate(text: string, vars?: Vars): string {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match
  );
}

export function translate(locale: Locale, text: string, vars?: Vars): string {
  const resolved = locale === 'ja' ? DICT_JA[text] ?? text : text;
  return interpolate(resolved, vars);
}

// ─── 클라이언트 쿠키 기반 로케일 (React 밖에서 사용) ───
export function getClientLocale(): Locale {
  if (typeof document === 'undefined') return DEFAULT_LOCALE;
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${LOCALE_COOKIE}=(\\w+)`)
  );
  const value = match?.[1];
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

/** React 컨텍스트 밖(유틸, alert 등)에서 쓰는 번역 함수 */
export function t(text: string, vars?: Vars): string {
  return translate(getClientLocale(), text, vars);
}

/** 언어 수동 전환: 쿠키 저장 후 새로고침 (수동 선택이 자동 판별보다 우선)
 *  일본어 전환 시 현재 페이지가 차단 경로면 middleware가 홈으로 보낸다. */
export function setLocaleAndReload(locale: Locale): void {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  window.location.reload();
}

// ─── Provider / Hooks ───
const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  return (
    <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>
  );
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

/** 일본어 모드 여부 (연습실 기능 숨김 등 분기용) */
export function useIsJapanMode(): boolean {
  return useLocale() === 'ja';
}

export function useT() {
  const locale = useLocale();
  return useCallback(
    (text: string, vars?: Vars) => translate(locale, text, vars),
    [locale]
  );
}
