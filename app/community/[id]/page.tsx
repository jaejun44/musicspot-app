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

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { data } = await supabaseServer
    .from('posts')
    .select('title, body, author_name')
    .eq('id', params.id)
    .single();

  if (!data) {
    return { title: '게시물 | Music Spot' };
  }

  return {
    title: `${data.title} | Music Spot 커뮤니티`,
    description: data.body?.slice(0, 120),
    openGraph: {
      title: `${data.title} | Music Spot 커뮤니티`,
      description: data.body?.slice(0, 120),
      type: 'article',
    },
  };
}

export default function PostDetailPage({ params }: Props) {
  return <PostDetailClient postId={params.id} />;
}
