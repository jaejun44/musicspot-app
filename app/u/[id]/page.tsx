import { Metadata } from 'next';
import { supabase } from '@/lib/supabase';
import UserProfileClient from './UserProfileClient';

// ISR: 프로필 메타데이터 1시간 캐싱. 본문은 클라이언트가 패칭하므로 항상 최신.
export const revalidate = 3600;

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const { data } = await supabase
    .from('user_profiles')
    .select('display_name, bio, avatar_url')
    .eq('user_id', params.id)
    .maybeSingle();

  const name = data?.display_name ?? '뮤지션';
  const description = data?.bio ?? `${name}의 Music Spot 뮤지션 프로필`;

  return {
    title: `${name} — Music Spot`,
    description,
    openGraph: {
      title: `${name} — Music Spot`,
      description,
      images: data?.avatar_url ? [{ url: data.avatar_url }] : [],
    },
  };
}

export default function UserProfilePage({ params }: { params: { id: string } }) {
  return <UserProfileClient userId={params.id} />;
}
