import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { expandRegion } from '@/lib/region-alias';
import { REGIONS, getRegionBySlug, CITY_ISO } from '@/lib/regions';
import { Studio } from '@/types/studio';
import RoomCard from '@/components/RoomCard';
import Navigation from '@/components/Navigation';
import SiteFooter from '@/components/SiteFooter';

interface Props {
  params: { slug: string };
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.musicspotfest.com';

// ISR: 지역 페이지는 1시간 캐싱. 25개 지역 전부 빌드 타임 프리렌더.
export const revalidate = 3600;
export const dynamicParams = false; // 정의된 지역 외 slug 는 404

export function generateStaticParams() {
  return REGIONS.map((r) => ({ slug: r.slug }));
}

/** 검색과 동일한 카테고리(음악 연습실) + 지역 별칭 필터로 룸 조회 */
async function fetchRoomsByRegion(keyword: string): Promise<Studio[]> {
  const terms = expandRegion(keyword);
  const regionConditions = terms
    .flatMap((t) => [`address.ilike.%${t}%`, `region.ilike.%${t}%`])
    .join(',');

  const { data } = await supabase
    .from('studios')
    .select('*')
    .eq('is_published', true)
    .or(
      'category.ilike.%악기%,category.ilike.%보컬%,category.ilike.%녹음%,category.ilike.%합주%,category.ilike.%개인연습실%'
    )
    .or(regionConditions)
    .order('data_quality_score', { ascending: false })
    .order('review_avg', { ascending: false, nullsFirst: false })
    .limit(60);

  return (data as unknown as Studio[]) ?? [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const region = getRegionBySlug(params.slug);
  if (!region) return { title: '지역 연습실 | Music Spot' };

  const title = `${region.label} 합주실·연습실 추천 | Music Spot`;
  const description = `${region.city} ${region.label} 근처 합주실·연습실을 한눈에. 위치·가격·드럼 여부로 비교하고 바로 문의하세요.`;
  const url = `${SITE_URL}/region/${region.slug}`;

  // 로컬 검색엔진용 geo 메타태그
  const geoMeta: Record<string, string> = {
    'geo.placename': `${region.city} ${region.label}`,
  };
  const iso = CITY_ISO[region.city];
  if (iso) geoMeta['geo.region'] = iso;

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
    other: geoMeta,
  };
}

export default async function RegionPage({ params }: Props) {
  const region = getRegionBySlug(params.slug);
  if (!region) notFound();

  const rooms = await fetchRoomsByRegion(region.keyword);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${region.label} 합주실·연습실`,
    url: `${SITE_URL}/region/${region.slug}`,
    numberOfItems: rooms.length,
    itemListElement: rooms.slice(0, 20).map((s, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${SITE_URL}/room/${s.id}`,
      name: s.name,
    })),
  };

  // 내부 링크용: 같은 도시의 다른 지역
  const sameCity = REGIONS.filter((r) => r.city === region.city && r.slug !== region.slug);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Navigation />
      <main className="min-h-screen bg-comic-cream px-4 sm:px-6 py-6 max-w-5xl mx-auto">
        <nav className="text-xs font-bold text-comic-black/50 mb-3">
          <Link href="/" className="hover:text-comic-pink">홈</Link>
          <span className="mx-1.5">/</span>
          <Link href="/search" className="hover:text-comic-pink">연습실</Link>
          <span className="mx-1.5">/</span>
          <span className="text-comic-black">{region.label}</span>
        </nav>

        <header className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bungee">
            {region.label} <span className="text-comic-pink">합주실·연습실</span>
          </h1>
          <p className="mt-2 text-sm text-comic-black/60 leading-relaxed">
            {region.city} {region.label} 근처 합주실·연습실 {rooms.length}곳.
            위치·가격·드럼 여부로 비교하고 바로 문의하세요.
          </p>
        </header>

        {rooms.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-comic-black/50 font-bold">
              아직 {region.label} 지역에 등록된 연습실이 없어요.
            </p>
            <Link
              href="/search"
              className="inline-block mt-4 px-5 py-2.5 bg-comic-pink border-[2px] border-comic-black text-white font-bold text-sm"
              style={{ boxShadow: '3px 3px 0 #0A0A0A' }}
            >
              전체 연습실 보기
            </Link>
          </div>
        ) : (
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {rooms.map((studio, i) => (
              <RoomCard key={studio.id} studio={studio} rotationIndex={i % 3} />
            ))}
          </section>
        )}

        {sameCity.length > 0 && (
          <section className="mt-12 pt-6 border-t-[2px] border-comic-black/10">
            <h2 className="text-sm font-bold text-comic-black/60 mb-3">
              {region.city} 다른 지역 연습실
            </h2>
            <div className="flex flex-wrap gap-2">
              {sameCity.map((r) => (
                <Link
                  key={r.slug}
                  href={`/region/${r.slug}`}
                  className="px-3 py-1.5 bg-white border-[2px] border-comic-black text-xs font-bold hover:bg-comic-pink hover:text-white transition-colors"
                >
                  {r.label}
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
