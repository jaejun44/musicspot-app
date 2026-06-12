/**
 * hreflang/canonical 일관 생성 헬퍼.
 * 현재 한국어 단일 언어 → ko-KR + x-default 만 명시.
 * 일본어 페이지가 생기면 이 함수에 'ja-JP' 매핑 한 줄만 추가하면
 * 전 페이지에 일괄 반영된다(코드 변경 최소).
 */
export function localeAlternates(url: string): {
  canonical: string;
  languages: Record<string, string>;
} {
  return {
    canonical: url,
    languages: {
      'ko-KR': url,
      'x-default': url,
      // 'ja-JP': url.replace('musicspotfest.com', 'musicspotfest.com/ja'),  // 일본어 출시 시 활성화
    },
  };
}
