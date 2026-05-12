export type ShareSource = 'kakao' | 'instagram' | 'twitter' | 'facebook' | 'link';
export type ShareCampaign = 'challenge' | 'post' | 'profile' | 'studio' | 'landing';

const BASE_URL = 'https://musicspotapp.vercel.app';

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
