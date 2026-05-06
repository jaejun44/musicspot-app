import { Metadata } from 'next';
import { supabase } from '@/lib/supabase';
import UserProfileClient from './UserProfileClient';

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
