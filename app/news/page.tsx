import type { Metadata } from 'next';
import Navigation from '@/components/Navigation';
import SiteFooter from '@/components/SiteFooter';
import { localeAlternates } from '@/lib/seo';
import { fetchNewsPage, NEWS_PAGE_SIZE } from '@/lib/news';
import NewsListClient from './_components/NewsListClient';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.musicspotfest.com';

// ISR: 카드뉴스는 하루 2개씩 늘어난다. 1시간 캐싱
export const revalidate = 3600;

const title = '밴드씬 뉴스 | Music Spot';
const description = '록·메탈·인디 밴드의 새 앨범·투어·페스티벌 소식을 매일 카드뉴스로. Music Spot 인스타그램 카드뉴스 모음.';

export const metadata: Metadata = {
  title,
  description,
  alternates: localeAlternates(`${SITE_URL}/news`),
  openGraph: { title, description, url: `${SITE_URL}/news`, siteName: 'Music Spot', type: 'website', locale: 'ko_KR' },
  twitter: { card: 'summary_large_image', title, description },
};

export default async function NewsListPage() {
  const first = await fetchNewsPage(0, NEWS_PAGE_SIZE);
  return (
    <>
      <Navigation />
      <NewsListClient initial={first} />
      <SiteFooter />
    </>
  );
}
