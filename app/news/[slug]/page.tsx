import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Navigation from '@/components/Navigation';
import SiteFooter from '@/components/SiteFooter';
import { localeAlternates } from '@/lib/seo';
import {
  fetchAdjacentNews,
  fetchAllNewsSlugs,
  fetchNewsPage,
  fetchNewsPost,
  newsImageUrl,
} from '@/lib/news';
import NewsDetailClient from '../_components/NewsDetailClient';

interface Props {
  params: { slug: string };
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.musicspotfest.com';

// ISR 1시간. 빌드 때 있는 글은 미리 만들고, 그 뒤 새 글은 첫 요청 때 만든다(dynamicParams 기본 true)
export const revalidate = 3600;

export async function generateStaticParams() {
  const rows = await fetchAllNewsSlugs();
  return rows.map((r) => ({ slug: r.slug }));
}

/** 메타 설명: 본문 앞부분을 한 줄로(문장은 고치지 않고 자르기만) */
function summary(body: string, max = 120): string {
  const flat = body.replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await fetchNewsPost(params.slug);
  if (!post) return { title: '밴드씬 뉴스 | Music Spot' };
  const url = `${SITE_URL}/news/${post.slug}`;
  const title = `${post.title} | 밴드씬 뉴스 | Music Spot`;
  const description = summary(post.body) || post.title;
  const images = post.images[0]
    ? [{ url: newsImageUrl(post.images[0]), width: 1080, height: 1350, alt: post.title }]
    : undefined;
  return {
    title,
    description,
    alternates: localeAlternates(url),
    openGraph: {
      title: post.title,
      description,
      url,
      siteName: 'Music Spot',
      type: 'article',
      locale: 'ko_KR',
      publishedTime: `${post.published_on}T00:00:00+09:00`,
      modifiedTime: post.updated_at,
      images,
    },
    twitter: { card: 'summary_large_image', title: post.title, description, images: images?.map((i) => i.url) },
  };
}

export default async function NewsDetailPage({ params }: Props) {
  const post = await fetchNewsPost(params.slug);
  if (!post) notFound();

  const [{ older, newer }, recent] = await Promise.all([fetchAdjacentNews(post), fetchNewsPage(0, 4)]);
  const latest = recent.filter((p) => p.slug !== post.slug).slice(0, 3);
  const url = `${SITE_URL}/news/${post.slug}`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: post.title.slice(0, 110),
    description: summary(post.body, 200),
    image: post.images.map(newsImageUrl),
    datePublished: `${post.published_on}T00:00:00+09:00`,
    dateModified: post.updated_at,
    inLanguage: 'ko-KR',
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    url,
    author: { '@type': 'Organization', name: 'Music Spot', url: SITE_URL },
    publisher: {
      '@type': 'Organization',
      name: 'Music Spot',
      url: SITE_URL,
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/ms_character/cutout_clean.png` },
    },
    isBasedOn: post.instagram_url,
    keywords: post.hashtags.map((h) => h.replace(/^#/, '')).join(', ') || undefined,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <Navigation />
      <NewsDetailClient post={post} older={older} newer={newer} latest={latest} />
      <SiteFooter />
    </>
  );
}
