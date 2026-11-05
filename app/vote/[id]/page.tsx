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

/**
 * 관리 링크(#k=<토큰>)의 토큰을 HTML 파싱 중에 꺼내 window에 잠깐 두고 주소창 해시를 지운다.
 * GA(afterInteractive)·Amplitude(useEffect) 초기화보다 먼저 실행돼야 전체 URL 수집에 토큰이 안 실린다.
 * 꺼낸 토큰은 VoteClient가 검증한 뒤에만 저장한다. 규칙은 lib/votes.ts parseAdminHash와 같다.
 */
const STRIP_ADMIN_HASH = `(function(){try{var h=location.hash;if(!h||h.indexOf('k=')<0)return;var k=new URLSearchParams(h.slice(1)).get('k');if(k)window.__msVoteAdminToken=k;history.replaceState(history.state,'',location.pathname+location.search);}catch(e){}})();`;

export default function VotePage({ params }: Props) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: STRIP_ADMIN_HASH }} />
      <Navigation />
      <VoteClient voteId={params.id} />
    </>
  );
}
