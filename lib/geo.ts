// 국가/언어 → 국기 이모지 (한/일 중심). 게시물 국가 표시용.
// country(ISO 2자리, IP 기반) 우선, 없으면 language(ko/ja)로 폴백.
const COUNTRY_FLAG: Record<string, string> = { KR: '🇰🇷', JP: '🇯🇵' };
const LANG_FLAG: Record<string, string> = { ko: '🇰🇷', ja: '🇯🇵' };

export function countryFlag(country?: string | null, language?: string | null): string | null {
  const c = (country ?? '').toUpperCase();
  if (COUNTRY_FLAG[c]) return COUNTRY_FLAG[c];
  const l = (language ?? '').toLowerCase();
  return LANG_FLAG[l] ?? null;
}

/** 게시물의 실효 언어(번역 버튼 노출 판단용). country=JP거나 language=ja면 'ja', 그 외 'ko'. */
export function contentLang(country?: string | null, language?: string | null): 'ko' | 'ja' {
  if ((language ?? '').toLowerCase() === 'ja') return 'ja';
  if ((country ?? '').toUpperCase() === 'JP') return 'ja';
  return 'ko';
}

/** 브라우저 쿠키에서 IP 국가(ms_country, middleware가 저장) 읽기. 없으면 null. */
export function getClientCountry(): string | null {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(/(?:^|;\s*)ms_country=([A-Za-z]{2})/);
  return m ? m[1].toUpperCase() : null;
}
