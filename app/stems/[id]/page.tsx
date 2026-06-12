import { Metadata } from 'next';
import { Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import StemsClient from '../_components/StemsClient';

interface Props {
  params: { id: string };
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.musicspotfest.com';

// ISR: 프로젝트 메타는 5분 캐싱(참여자 수 등 반영). 본문은 클라이언트가 패칭.
export const revalidate = 300;
export const dynamicParams = true;

export async function generateStaticParams() {
  const { data } = await supabase
    .from('stem_projects')
    .select('id')
    .order('share_count', { ascending: false })
    .limit(100);
  return (data ?? []).map((p: { id: string }) => ({ id: p.id }));
}

async function getProject(id: string) {
  const { data } = await supabase
    .from('stem_projects')
    .select('id, title, creator_name, genre, bpm, key_signature, pass_count, stem_tracks(count)')
    .eq('id', id)
    .maybeSingle();
  return data;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const project = await getProject(params.id);
  if (!project) {
    return { title: '8마디 챌린지 | Music Spot' };
  }

  const trackCount =
    (project.stem_tracks as { count: number }[] | null)?.[0]?.count ?? 0;
  const title = `${project.title} — 8마디 챌린지 | Music Spot`;
  const parts = [
    project.creator_name && `${project.creator_name} 시작`,
    project.genre,
    `${trackCount}명 참여`,
  ].filter(Boolean);
  const description = `${parts.join(' · ')}. 8마디를 이어 음악을 완성해보세요.`;
  const url = `${SITE_URL}/stems/${params.id}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: 'Music Spot',
      type: 'website',
      locale: 'ko_KR',
    },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default function StemProjectPage({ params }: Props) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-comic-cream flex items-center justify-center">
          <div className="w-10 h-10 rounded-full border-[3px] border-comic-pink border-t-transparent animate-spin" />
        </div>
      }
    >
      <StemsClient initialProjectId={params.id} />
    </Suspense>
  );
}
