import { Metadata } from 'next';
import Navigation from '@/components/Navigation';
import SplitClient from './_components/SplitClient';

interface Props {
  params: { id: string };
}

// 냈어요 체크가 계속 바뀌므로 캐시하지 않는다(내용은 클라이언트가 RPC로 읽음)
export const dynamic = 'force-dynamic';

export function generateMetadata(): Metadata {
  const title = '합주비 정산 | Music Spot';
  const description = '이번 합주비 1인당 금액을 확인하고, 냈으면 "냈어요"를 눌러 주세요. 로그인 없이 돼요.';
  return {
    title,
    description,
    // 단톡방 공유용 개인 링크 — 검색 결과에 남기지 않는다
    robots: { index: false, follow: false },
    openGraph: { title, description, siteName: 'Music Spot', type: 'website', locale: 'ko_KR' },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default function SplitPage({ params }: Props) {
  return (
    <>
      <Navigation />
      <SplitClient splitId={params.id} />
    </>
  );
}
