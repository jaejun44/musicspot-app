/** 외부 문의 링크를 일관되게 처리한다. 빈 값과 실행 가능한 URL은 제외. */
export function externalUrl(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value.trim());
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

export function kakaoChannelUrl(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const channel = value.trim();
  const url = externalUrl(channel.startsWith('pf.kakao.com/') ? `https://${channel}` : channel);
  if (url) return new URL(url).hostname === 'pf.kakao.com' ? url : null;
  return /^_[A-Za-z0-9]+$/.test(channel) ? `https://pf.kakao.com/${channel}` : null;
}

export function studioBookingLink(studio: { source_url: string | null; naver_place_url: string | null }) {
  const source = externalUrl(studio.source_url);
  const place = externalUrl(studio.naver_place_url);
  return source ? { url: source, type: 'source' as const } : place ? { url: place, type: 'naver' as const } : null;
}
