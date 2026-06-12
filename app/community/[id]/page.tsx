import { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';
import PostDetailClient from './PostDetailClient';

const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Props {
  params: { id: string };
}

// ISR: 게시글 본문/메타는 60초 캐싱(새 글·수정 반영). 좋아요·댓글 수는
// 클라이언트(PostDetailClient)가 실시간 재패칭하므로 캐싱돼도 표시는 최신.
// generateStaticParams 가 있어야 동적 라우트에 revalidate(ISR)가 실제 적용된다.
export const revalidate = 60;
export const dynamicParams = true;

export async function generateStaticParams() {
  // 최신 발행글 일부를 빌드 타임에 프리렌더. 나머지는 첫 요청 시 생성 후 캐싱.
  const { data } = await supabaseServer
    .from('posts')
    .select('id')
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .limit(200);
  return (data ?? []).map((p: { id: string }) => ({ id: p.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { data } = await supabaseServer
    .from('posts')
    .select('title, body, author_name, category')
    .eq('id', params.id)
    .eq('is_published', true)
    .maybeSingle();

  if (!data) {
    return { title: '게시물 | Music Spot' };
  }

  const description = data.body?.slice(0, 120);
  const title = `${data.title} | Music Spot 커뮤니티`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      siteName: 'Music Spot',
    },
  };
}

export default async function PostDetailPage({ params }: Props) {
  const { data } = await supabaseServer
    .from('posts')
    .select('id, category, title, body, author_id, author_name, author_emoji, author_avatar_url, created_at, tags, post_likes(post_id), post_comments(id)')
    .eq('id', params.id)
    .eq('is_published', true)
    .maybeSingle();

  const initialPost = data
    ? {
        id: data.id,
        category: data.category,
        title: data.title,
        body: data.body,
        author_id: data.author_id,
        author_name: data.author_name,
        author_emoji: data.author_emoji,
        author_avatar_url: data.author_avatar_url,
        created_at: data.created_at,
        tags: (data.tags as string[]) ?? [],
        likes_count: ((data.post_likes as { post_id: string }[]) ?? []).length,
        comments_count: ((data.post_comments as { id: string }[]) ?? []).length,
      }
    : null;

  return <PostDetailClient postId={params.id} initialPost={initialPost} />;
}
