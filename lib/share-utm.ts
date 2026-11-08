export type ShareSource = 'kakao' | 'instagram' | 'twitter' | 'facebook' | 'link' | 'calendar' | 'push';
export type ShareCampaign = 'challenge' | 'post' | 'profile' | 'studio' | 'landing' | 'vote' | 'split';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.musicspotfest.com';

export function buildShareUrl(
  path: string,
  source: ShareSource,
  campaign: ShareCampaign,
  content?: string
): string {
  const url = new URL(path, BASE_URL);
  url.searchParams.set('utm_source', source);
  url.searchParams.set('utm_medium', 'share');
  url.searchParams.set('utm_campaign', campaign);
  if (content) url.searchParams.set('utm_content', content);
  return url.toString();
}
