import { Metadata } from 'next';
import { supabase } from '@/lib/supabase';
import UserProfileClient from './UserProfileClient';

// ISR: 프로필 메타데이터 1시간 캐싱. 본문은 클라이언트가 패칭하므로 항상 최신.
// generateStaticParams 가 있어야 동적 라우트에 revalidate(ISR)가 실제 적용된다.
export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
  // 최근 활동 프로필 일부를 빌드 타임에 프리렌더. 나머지는 첫 요청 시 생성 후 캐싱.
  const { data } = await supabase
    .from('user_profiles')
    .select('user_id')
    .order('updated_at', { ascending: false })
    .limit(200);
  return (data ?? [])
    .filter((p: { user_id: string | null }) => p.user_id)
    .map((p: { user_id: string }) => ({ id: p.user_id }));
}

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
