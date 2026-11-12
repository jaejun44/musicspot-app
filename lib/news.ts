// 밴드씬 뉴스 /news — 인스타 카드뉴스 웹 보관(supabase/17_news.sql, scripts/import_cardnews.py)
// 읽기는 anon 키로 공개 글(is_published=true)만 RLS가 돌려준다
import { supabase } from '@/lib/supabase';

export const NEWS_PAGE_SIZE = 12;

export interface NewsSource {
  text?: string;
  url?: string;
  label?: string;
}

/** 목록·카드용 가벼운 모양 */
export interface NewsSummary {
  slug: string;
  title: string;
  published_on: string;
  images: string[];
}

export interface NewsPost extends NewsSummary {
  body: string;
  topic: string | null;
  image_count: number;
  sources: NewsSource[];
  photo_credit: string;
  hashtags: string[];
  instagram_url: string;
  source_key: string;
  created_at: string;
  updated_at: string;
}

const SUMMARY_FIELDS = 'slug, title, published_on, images';
const POST_FIELDS =
  'slug, title, body, published_on, topic, images, image_count, sources, photo_credit, hashtags, instagram_url, source_key, created_at, updated_at';

/** Storage 공개 버킷 news의 경로 → 공개 URL */
export function newsImageUrl(path: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/news/${path}`;
}

/** "2026-11-12" → "2026.11.12" */
export function formatNewsDate(date: string): string {
  return date.split('-').join('.');
}

/** 최신순 한 페이지. 같은 날은 source_key(슬롯) 역순으로 고정 */
export async function fetchNewsPage(page: number, size = NEWS_PAGE_SIZE): Promise<NewsSummary[]> {
  const from = page * size;
  const { data, error } = await supabase
    .from('news_posts')
    .select(SUMMARY_FIELDS)
    .order('published_on', { ascending: false })
    .order('source_key', { ascending: false })
    .range(from, from + size - 1);
  if (error) throw new Error(`[news] 목록 조회 실패 (page ${page}): ${error.message}`);
  return (data ?? []) as NewsSummary[];
}

export async function fetchNewsPost(slug: string): Promise<NewsPost | null> {
  const { data, error } = await supabase.from('news_posts').select(POST_FIELDS).eq('slug', slug).maybeSingle();
  if (error) throw new Error(`[news] 글 조회 실패 (${slug}): ${error.message}`);
  return (data as NewsPost | null) ?? null;
}

/** 전체 slug(사이트맵·generateStaticParams). 1,000행 배치 */
export async function fetchAllNewsSlugs(): Promise<{ slug: string; published_on: string; updated_at: string }[]> {
  const all: { slug: string; published_on: string; updated_at: string }[] = [];
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from('news_posts')
      .select('slug, published_on, updated_at')
      .order('published_on', { ascending: false })
      .order('id')
      .range(offset, offset + 999);
    if (error) throw new Error(`[news] slug 조회 실패 (offset ${offset}): ${error.message}`);
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < 1000) break;
    offset += 1000;
  }
  return all;
}

/**
 * 이전 글(더 오래된)·다음 글(더 최신). 정렬은 목록과 같은 (published_on, source_key).
 * PostgREST or 필터로 "같은 날이면 source_key 비교"를 표현한다
 */
export async function fetchAdjacentNews(post: NewsPost): Promise<{ older: NewsSummary | null; newer: NewsSummary | null }> {
  const d = post.published_on;
  const k = post.source_key;
  const [older, newer] = await Promise.all([
    supabase
      .from('news_posts')
      .select(SUMMARY_FIELDS)
      .or(`published_on.lt.${d},and(published_on.eq.${d},source_key.lt.${k})`)
      .order('published_on', { ascending: false })
      .order('source_key', { ascending: false })
      .range(0, 0),
    supabase
      .from('news_posts')
      .select(SUMMARY_FIELDS)
      .or(`published_on.gt.${d},and(published_on.eq.${d},source_key.gt.${k})`)
      .order('published_on', { ascending: true })
      .order('source_key', { ascending: true })
      .range(0, 0),
  ]);
  if (older.error) throw new Error(`[news] 이전 글 조회 실패: ${older.error.message}`);
  if (newer.error) throw new Error(`[news] 다음 글 조회 실패: ${newer.error.message}`);
  return {
    older: ((older.data ?? [])[0] as NewsSummary | undefined) ?? null,
    newer: ((newer.data ?? [])[0] as NewsSummary | undefined) ?? null,
  };
}
