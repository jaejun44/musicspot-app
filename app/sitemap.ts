import { MetadataRoute } from 'next';
import { supabase } from '@/lib/supabase';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://musicspotapp.vercel.app';

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

  return [...staticRoutes, ...studioRoutes];
}
