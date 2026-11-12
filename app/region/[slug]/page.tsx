import { cache } from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { expandRegion, regionCity } from '@/lib/region-alias';
import { REGIONS, getRegionBySlug, CITY_ISO, type RegionMeta } from '@/lib/regions';
import { fetchSeoulStudios, MUSIC_CATEGORY_FILTER } from '@/lib/region-rooms';
import {
  selectRegionRooms,
  nearbyRegions,
  nearestHourlyRoom,
  isIndexable,
  regionStats,
  walkMinutes,
  type RegionSelection,
  type RegionStats,
} from '@/lib/region-select';
import { localeAlternates } from '@/lib/seo';
import { Studio } from '@/types/studio';
import RoomCard from '@/components/RoomCard';
import BandDivider, { isBandBoundary } from '@/components/BandDivider';
import { Fragment } from 'react';
import { collectionForRegion } from '@/lib/room-collections';
import Navigation from '@/components/Navigation';
import SiteFooter from '@/components/SiteFooter';
import JamEntryCard from '@/components/JamEntryCard';
import ReturnStrip from '@/components/ReturnStrip';
import NewsLatest from '@/components/NewsLatest';
import { fetchNewsPage, type NewsSummary } from '@/lib/news';

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

/** 서울 밖 지역: 검색과 동일한 카테고리(음악 연습실) + 지역 별칭 필터로 룸 조회 */
async function fetchRoomsByRegion(keyword: string): Promise<Studio[]> {
  const terms = expandRegion(keyword);
  const regionConditions = terms
    .flatMap((t) => [`address.ilike.%${t}%`, `region.ilike.%${t}%`])
    .join(',');

  let query = supabase
    .from('studios')
    .select('*')
    .eq('is_published', true)
    .or(MUSIC_CATEGORY_FILTER)
    .or(regionConditions)
    .order('band_rank', { ascending: true }) // 밴드용 먼저(2026-11-12)
    .order('data_quality_score', { ascending: false })
    .order('review_avg', { ascending: false, nullsFirst: false })
    .range(0, 59);
  const city = regionCity(keyword);
  if (city) query = query.or(`address.ilike.%${city}%,region.ilike.%${city}%`);
  const { data } = await query;

  return (data as unknown as Studio[]) ?? [];
}

/** 서울(area 있음)은 역 반경·구 기준, 그 밖은 주소 별칭 기준. 메타데이터와 본문이 같은 결과를 쓴다 */
const getRegionRooms = cache(async (region: RegionMeta): Promise<RegionSelection> => {
  if (region.area) return selectRegionRooms(region.area, await fetchSeoulStudios());
  const studios = await fetchRoomsByRegion(region.keyword);
  return { rooms: studios.map((studio) => ({ studio, distanceM: null })), radiusM: null };
});

const won = (n: number) => `₩${n.toLocaleString()}`;

/** 이 지역 연습실을 어떤 기준으로 모았는지 한 구절 */
function scopeText(region: RegionMeta, radiusM: number | null): string {
  if (region.area?.kind === 'station' && radiusM) return `${region.area.name}에서 반경 ${radiusM / 1000}km 안`;
  if (region.area?.kind === 'gu') return `서울 ${region.area.gu}`;
  return `${region.city} ${region.label} 근처`;
}

/** 페이지에 보이는 FAQ와 같은 내용을 JSON-LD로도 낸다. 데이터가 없는 질문은 뺀다 */
function buildFaqs(region: RegionMeta, selection: RegionSelection, stats: RegionStats) {
  const faqs: { q: string; a: string }[] = [];
  if (stats.total === 0) return faqs;
  faqs.push({
    q: `${region.label} 합주실·연습실은 몇 곳이에요?`,
    a:
      `${scopeText(region, selection.radiusM)}에 ${stats.total}곳이 있어요(댄스 전용 연습실 제외). ` +
      (stats.band > 0 ? `밴드 합주가 가능한 곳은 ${stats.band}곳이고, ` : '밴드 합주 가능으로 확인된 곳은 아직 없어요. ') +
      (stats.drum > 0
        ? `그중 드럼을 쓸 수 있는 곳은 ${stats.drum}곳이에요.`
        : '드럼 가능으로 등록된 곳은 아직 없어요.'),
  });
  if (stats.pricedCount >= 3 && stats.minPrice != null && stats.medianPrice != null) {
    faqs.push({
      q: `${region.label} 합주실 시간당 얼마예요?`,
      a: `시간당 요금이 등록된 ${stats.pricedCount}곳 기준으로 최저 ${won(stats.minPrice)}, 중간값 ${won(stats.medianPrice)}이에요. 인원·장비에 따라 달라지니 정확한 요금은 업체에 확인해 주세요.`,
    });
  }
  const nearest = nearestHourlyRoom(selection.rooms);
  if (region.area?.kind === 'station' && nearest?.distanceM != null) {
    faqs.push({
      q: `${region.area.name}에서 가장 가까운 시간제 합주실은 어디예요?`,
      a: `가장 가까운 곳은 '${nearest.studio.name}'(도보 약 ${walkMinutes(nearest.distanceM)}분)이에요.`,
    });
  }
  return faqs;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const region = getRegionBySlug(params.slug);
  if (!region) return { title: '지역 연습실 | Music Spot' };

  const selection = await getRegionRooms(region);
  // 짝 조합 페이지(예: 마포 밴드 합주실)가 있으면 이 페이지는 '연습실'로 — 같은 검색어로 두 페이지가 경쟁하지 않게
  const title = collectionForRegion(region.slug)
    ? `${region.label} 연습실 추천 | Music Spot`
    : `${region.label} 합주실·연습실 추천 | Music Spot`;
  const description = `${scopeText(region, selection.radiusM)} 합주실·연습실 ${regionStats(selection.rooms).total}곳을 한눈에. 위치·가격·드럼 여부로 비교하고 바로 문의하세요.`;
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
    alternates: localeAlternates(url),
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
    // 연습실이 적은 서울 지역은 얇은 페이지라 검색엔진에 올리지 않는다(링크는 따라가게)
    ...(isIndexable(region, selection) ? {} : { robots: { index: false, follow: true } }),
  };
}

export default async function RegionPage({ params }: Props) {
  const region = getRegionBySlug(params.slug);
  if (!region) notFound();

  const selection = await getRegionRooms(region);
  const rooms = selection.rooms.map((r) => r.studio);
  const stats = regionStats(selection.rooms);
  const faqs = buildFaqs(region, selection, stats);
  const nearby = nearbyRegions(region, REGIONS);
  // 밴드 합주 가능이 0곳이면 가까운 동네 중 밴드용이 있는 곳으로 안내(서울 지역만 — 같은 원본에서 바로 셀 수 있음)
  const bandNearby =
    stats.band === 0 && region.area
      ? await (async () => {
          const seoul = await fetchSeoulStudios();
          return nearbyRegions(region, REGIONS, REGIONS.length)
            .map((r) => ({ r, band: regionStats(selectRegionRooms(r.area!, seoul).rooms).band }))
            .filter((x) => x.band > 0)
            .slice(0, 3);
        })()
      : [];
  const station = region.area?.kind === 'station' ? region.area.name : null;
  const bandCollection = collectionForRegion(region.slug);
  // 뉴스 입구는 곁가지라 조회가 실패해도 지역 페이지는 그대로 그린다(로그만)
  const news: NewsSummary[] = await fetchNewsPage(0, 2).catch((e) => {
    console.error('[region] 최신 뉴스 조회 실패', e);
    return [];
  });

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

  const faqJsonLd =
    faqs.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: faqs.map((f) => ({
            '@type': 'Question',
            name: f.q,
            acceptedAnswer: { '@type': 'Answer', text: f.a },
          })),
        }
      : null;

  // 내부 링크용: 같은 도시의 다른 지역 (가까운 동네에 이미 나온 곳은 뺀다)
  const nearbySlugs = new Set(nearby.map((r) => r.slug));
  const sameCity = REGIONS.filter(
    (r) => r.city === region.city && r.slug !== region.slug && !nearbySlugs.has(r.slug),
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}
      <Navigation />
      <main className="min-h-screen bg-comic-cream px-4 sm:px-6 py-6 max-w-5xl mx-auto">
        <nav className="text-xs font-bold text-comic-black/50 mb-3">
          <Link href="/" className="hover:text-comic-pink">홈</Link>
          <span className="mx-1.5">/</span>
          <Link href="/region" className="hover:text-comic-pink">지역</Link>
          <span className="mx-1.5">/</span>
          <span className="text-comic-black">{region.label}</span>
        </nav>

        <header className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bungee">
            {region.label} <span className="text-comic-pink">{bandCollection ? '연습실' : '합주실·연습실'}</span>
          </h1>
          <p className="mt-2 text-sm text-comic-black/60 leading-relaxed">
            {scopeText(region, selection.radiusM)} 합주실·연습실 {stats.total}곳
            {stats.band > 0 ? `, 그중 밴드 합주 가능 ${stats.band}곳.` : '.'}
            {' '}위치·가격·드럼 여부로 비교하고 바로 문의하세요.
          </p>
          {bandCollection && (
            <Link
              href={`/rooms/${bandCollection.slug}`}
              className="mt-3 inline-flex items-center min-h-[44px] px-4 rounded-[12px] bg-[#F5FF4F] border-[2px] border-comic-black text-[13px] font-bold"
              style={{ boxShadow: '2px 2px 0 #0A0A0A' }}
            >
              🎸 {bandCollection.title}만 모아 보기 →
            </Link>
          )}
          {stats.band === 0 && (
            <div className="mt-3 rounded-[12px] border-[2px] border-comic-black bg-white px-4 py-3" style={{ boxShadow: '2px 2px 0 #0A0A0A' }}>
              <p className="text-[13px] font-bold text-comic-black">🥁 이 동네에는 밴드 합주 가능한 곳이 아직 없어요</p>
              {bandNearby.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {bandNearby.map(({ r, band }) => (
                    <Link
                      key={r.slug}
                      href={`/region/${r.slug}`}
                      className="inline-flex items-center min-h-[44px] px-3 rounded-[12px] bg-[#F5FF4F] border-[2px] border-comic-black text-[13px] font-bold"
                    >
                      {r.label} 밴드 합주 {band}곳 →
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
          {stats.total > 0 && (
            <ul className="mt-4 flex flex-wrap gap-2 text-[13px] font-bold">
              <li className="px-3 py-1.5 bg-white border-[2px] border-comic-black" style={{ boxShadow: '2px 2px 0 #0A0A0A' }}>
                📍 연습실 {stats.total}곳
              </li>
              {stats.band > 0 && (
                <li className="px-3 py-1.5 bg-white border-[2px] border-comic-black" style={{ boxShadow: '2px 2px 0 #0A0A0A' }}>
                  🎸 밴드 합주 {stats.band}곳
                </li>
              )}
              {stats.drum > 0 && (
                <li className="px-3 py-1.5 bg-white border-[2px] border-comic-black" style={{ boxShadow: '2px 2px 0 #0A0A0A' }}>
                  🥁 드럼 가능 {stats.drum}곳
                </li>
              )}
              {stats.medianPrice != null && stats.pricedCount >= 3 && (
                <li className="px-3 py-1.5 bg-white border-[2px] border-comic-black" style={{ boxShadow: '2px 2px 0 #0A0A0A' }}>
                  💰 시간당 보통 {won(stats.medianPrice)}
                </li>
              )}
            </ul>
          )}
        </header>

        {/* 재방문자: 최근 본·찜·진행 중인 투표. 클라이언트에서만 그려 ISR HTML에 개인 데이터가 섞이지 않는다 */}
        <ReturnStrip placement="region" />

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
            {selection.rooms.map(({ studio, distanceM }, i) => (
              <Fragment key={studio.id}>
                {isBandBoundary(rooms, i) && <BandDivider />}
                <RoomCard
                  studio={studio}
                  locationNote={
                    station && distanceM != null ? `🚶 ${station} 도보 약 ${walkMinutes(distanceM)}분` : undefined
                  }
                />
              </Fragment>
            ))}
          </section>
        )}

        {/* 매일 새로 볼 것: 밴드씬 뉴스 최신 2개 — 연습실 목록 다음 */}
        <NewsLatest from="region" posts={news} className="mt-10" />

        {/* 온라인 잼 입구 — 연습실 목록 다음 */}
        <JamEntryCard from="region" className="mt-10 max-w-2xl" />

        {faqs.length > 0 && (
          <section className="mt-12 max-w-2xl">
            <h2 className="text-lg font-bungee mb-4">자주 묻는 질문</h2>
            <dl className="flex flex-col gap-3">
              {faqs.map((f) => (
                <div
                  key={f.q}
                  className="bg-white border-[2px] border-comic-black rounded-[12px] p-4"
                  style={{ boxShadow: '3px 3px 0 #0A0A0A' }}
                >
                  <dt className="text-sm font-bold">Q. {f.q}</dt>
                  <dd className="mt-1.5 text-sm text-comic-black/70 leading-relaxed">{f.a}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {nearby.length > 0 && (
          <section className="mt-12 pt-6 border-t-[2px] border-comic-black/10">
            <h2 className="text-sm font-bold text-comic-black/60 mb-3">가까운 동네 연습실</h2>
            <div className="flex flex-wrap gap-2">
              {nearby.map((r) => (
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

        {sameCity.length > 0 && (
          <section className={`${nearby.length > 0 ? 'mt-6' : 'mt-12 pt-6 border-t-[2px] border-comic-black/10'}`}>
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
