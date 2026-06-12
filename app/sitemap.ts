import { MetadataRoute } from 'next';
import { supabase } from '@/lib/supabase';
import { REGIONS } from '@/lib/regions';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.musicspotfest.com';

// sitemap.xml 도 1시간 캐싱(매 크롤 요청마다 전체 studios 조회 방지).
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static pages
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${SITE_URL}/search`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/band-matching`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE_URL}/community`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.6 },
    { url: `${SITE_URL}/feed`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.6 },
    { url: `${SITE_URL}/stems`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.5 },
  ];

  // 지역 SEO 페이지 (롱테일 검색 유입)
  const regionRoutes: MetadataRoute.Sitemap = REGIONS.map((r) => ({
    url: `${SITE_URL}/region/${r.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.85,
  }));

  // Dynamic studio pages — paginate to handle >1,000 rows
  const studioRoutes: MetadataRoute.Sitemap = [];
  let offset = 0;

  while (true) {
    const { data } = await supabase
      .from('studios')
      .select('id, updated_at')
      .eq('is_published', true)
      .range(offset, offset + 999);

    if (!data || data.length === 0) break;

    for (const studio of data) {
      studioRoutes.push({
        url: `${SITE_URL}/room/${studio.id}`,
        lastModified: new Date(studio.updated_at),
        changeFrequency: 'monthly',
        priority: 0.8,
      });
    }

    if (data.length < 1000) break;
    offset += 1000;
  }

  // Community post pages
  const postRoutes: MetadataRoute.Sitemap = [];
  const { data: posts } = await supabase
    .from('posts')
    .select('id, created_at')
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .limit(500);

  if (posts) {
    for (const post of posts) {
      postRoutes.push({
        url: `${SITE_URL}/community/${post.id}`,
        lastModified: new Date(post.created_at),
        changeFrequency: 'weekly',
        priority: 0.6,
      });
    }
  }

  return [...staticRoutes, ...regionRoutes, ...studioRoutes, ...postRoutes];
}
