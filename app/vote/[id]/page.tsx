import { Metadata } from 'next';
import { supabase } from '@/lib/supabase';
import Navigation from '@/components/Navigation';
import VoteClient from './_components/VoteClient';

interface Props {
  params: { id: string };
}

// 투표는 계속 바뀌므로 캐시하지 않는다(내용은 클라이언트가 RPC로 읽음)
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { data } = await supabase.rpc('get_vote', { p_vote_id: params.id });
  const count = (data as { studio_ids?: string[] } | null)?.studio_ids?.length ?? 0;
  const title = count > 0 ? `다음 합주 어디서? 후보 ${count}곳 투표 | Music Spot` : '합주 후보 투표 | Music Spot';
  const description = '밴드 멤버와 합주할 연습실·날짜를 투표로 정해요. 로그인 없이 바로 투표할 수 있어요.';
  return {
    title,
    description,
    // 단톡방 공유용 개인 링크 — 검색 결과에 남기지 않는다
    robots: { index: false, follow: false },
    openGraph: { title, description, siteName: 'Music Spot', type: 'website', locale: 'ko_KR' },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default function VotePage({ params }: Props) {
  return (
    <>
      <Navigation />
      <VoteClient voteId={params.id} />
    </>
  );
}
