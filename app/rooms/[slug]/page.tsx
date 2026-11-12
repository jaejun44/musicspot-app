import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { fetchSeoulStudios } from '@/lib/region-rooms';
import { regionStats } from '@/lib/region-select';
import { REGIONS } from '@/lib/regions';
import {
  COLLECTIONS,
  COLLECTION_LIST_MAX,
  MIN_ROOMS_FOR_COLLECTION_INDEX,
  getCollection,
  guCounts,
  pickCollection,
  type RoomCollection,
} from '@/lib/room-collections';
import { localeAlternates } from '@/lib/seo';
import RoomCard from '@/components/RoomCard';
import Navigation from '@/components/Navigation';
import SiteFooter from '@/components/SiteFooter';

interface Props {
  params: { slug: string };
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.musicspotfest.com';

// 지역 페이지와 같은 ISR 1시간. 정의된 조합만(그 외 404)
export const revalidate = 3600;
export const dynamicParams = false;

export function generateStaticParams() {
  return COLLECTIONS.map((c) => ({ slug: c.slug }));
}

const won = (n: number) => `₩${n.toLocaleString()}`;

async function load(c: RoomCollection) {
  const studios = pickCollection(c, await fetchSeoulStudios());
  const stats = regionStats(studios.map((studio) => ({ studio, distanceM: null })));
  return { studios, stats, gus: guCounts(studios) };
}

/** 구 이름 → 그 구의 지역 페이지(구 단위로 만든 곳만) */
function guRegion(gu: string) {
  return REGIONS.find((r) => r.area?.kind === 'gu' && r.area.gu === gu);
}

function buildFaqs(c: RoomCollection, studios: number, stats: ReturnType<typeof regionStats>, gus: { gu: string; count: number }[]) {
  const where = c.gu ? `서울 ${c.gu}` : '서울';
  const faqs: { q: string; a: string }[] = [
    {
      q: `${where}에 ${c.noun}은 몇 곳이에요?`,
      a: `Music Spot에 등록된 ${where} 연습실 중 ${c.noun}은 ${studios}곳이에요.` + (stats.drum > 0 ? ` 그중 드럼을 쓸 수 있는 곳은 ${stats.drum}곳이에요.` : ''),
    },
  ];
  if (stats.pricedCount >= 3 && stats.minPrice != null && stats.medianPrice != null) {
    faqs.push({
      q: `${c.title} 시간당 얼마예요?`,
      a: `시간당 요금이 등록된 ${stats.pricedCount}곳 기준으로 최저 ${won(stats.minPrice)}, 중간값 ${won(stats.medianPrice)}이에요. 인원·장비에 따라 달라지니 정확한 요금은 업체에 확인해 주세요.`,
    });
  }
  if (!c.gu && gus.length >= 3) {
    faqs.push({
      q: `서울 어느 동네에 ${c.noun}이 많아요?`,
      a: `${gus.slice(0, 3).map((g) => `${g.gu} ${g.count}곳`).join(', ')} 순으로 많아요.`,
    });
  }
  return faqs;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = getCollection(params.slug);
  if (!c) return { title: '연습실 | Music Spot' };
  const { studios } = await load(c);
  const title = `${c.title} 추천 — ${studios.length}곳 | Music Spot`;
  const description = `${c.gu ? `서울 ${c.gu}` : '서울'}의 ${c.noun} ${studios.length}곳을 한눈에. 위치·가격·드럼 여부로 비교하고 바로 문의하세요.`;
  const url = `${SITE_URL}/rooms/${c.slug}`;
  return {
    title,
    description,
    alternates: localeAlternates(url),
    openGraph: { title, description, url, siteName: 'Music Spot', type: 'website', locale: 'ko_KR' },
    twitter: { card: 'summary_large_image', title, description },
    ...(studios.length >= MIN_ROOMS_FOR_COLLECTION_INDEX ? {} : { robots: { index: false, follow: true } }),
  };
}

export default async function RoomCollectionPage({ params }: Props) {
  const c = getCollection(params.slug);
  if (!c) notFound();
  const { studios, stats, gus } = await load(c);
  const shown = studios.slice(0, COLLECTION_LIST_MAX);
  const region = c.regionSlug ? REGIONS.find((r) => r.slug === c.regionSlug) : undefined;
  const faqs = buildFaqs(c, studios.length, stats, gus);
  const others = COLLECTIONS.filter((o) => o.slug !== c.slug);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: c.title,
    url: `${SITE_URL}/rooms/${c.slug}`,
    numberOfItems: studios.length,
    itemListElement: shown.slice(0, 20).map((s, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE_URL}/room/${s.id}`, name: s.name })),
  };
  const faqJsonLd = faqs.length
    ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
      }
    : null;

  const chip = 'px-3 py-1.5 bg-white border-[2px] border-comic-black rounded-[12px]';
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {faqJsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />}
      <Navigation />
      <main className="min-h-screen bg-comic-cream px-4 sm:px-6 py-6 max-w-5xl mx-auto">
        <nav className="text-xs font-bold text-comic-black/50 mb-3">
          <Link href="/" className="hover:text-comic-pink">홈</Link>
          <span className="mx-1.5">/</span>
          <Link href="/region" className="hover:text-comic-pink">지역</Link>
          <span className="mx-1.5">/</span>
          <span className="text-comic-black">{c.title}</span>
        </nav>

        <header className="mb-6">
          <h1 className="text-2xl sm:text-3xl" style={{ fontWeight: 900 }}>
            {c.title}
          </h1>
          <p className="mt-2 text-sm text-comic-black/60 leading-relaxed break-keep">
            {c.gu ? `서울 ${c.gu}` : '서울'}의 {c.noun} {studios.length}곳. 위치·가격·드럼 여부로 비교하고 바로 문의하세요.
          </p>
          <ul className="mt-4 flex flex-wrap gap-2 text-[13px] font-bold">
            <li className={chip} style={{ boxShadow: '2px 2px 0 #0A0A0A' }}>📍 {studios.length}곳</li>
            {stats.drum > 0 && <li className={chip} style={{ boxShadow: '2px 2px 0 #0A0A0A' }}>🥁 드럼 가능 {stats.drum}곳</li>}
            {stats.medianPrice != null && stats.pricedCount >= 3 && (
              <li className={chip} style={{ boxShadow: '2px 2px 0 #0A0A0A' }}>💰 시간당 보통 {won(stats.medianPrice)}</li>
            )}
          </ul>
          {region && (
            <Link href={`/region/${region.slug}`} className="mt-3 inline-flex items-center min-h-[44px] text-[13px] font-bold underline underline-offset-4">
              {region.label}의 연습실 전체(개인 연습·보컬 포함) 보기 →
            </Link>
          )}
        </header>

        {!c.gu && gus.length > 0 && (
          <section className="mb-6">
            <h2 className="text-sm font-bold text-comic-black/60 mb-2">구별로 보기</h2>
            <div className="flex flex-wrap gap-2">
              {gus.slice(0, 12).map(({ gu, count }) => {
                const r = guRegion(gu);
                const label = `${gu} ${count}`;
                return r ? (
                  <Link key={gu} href={`/region/${r.slug}`} className="inline-flex items-center min-h-[44px] px-3 bg-white border-[2px] border-comic-black rounded-[12px] text-[13px] font-bold hover:bg-comic-pink hover:text-white">
                    {label} →
                  </Link>
                ) : (
                  <span key={gu} className="inline-flex items-center min-h-[44px] px-3 bg-white/70 border-[2px] border-comic-black/30 rounded-[12px] text-[13px] font-bold text-comic-black/70">
                    {label}
                  </span>
                );
              })}
            </div>
          </section>
        )}

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {shown.map((s) => (
            <RoomCard key={s.id} studio={s} />
          ))}
        </section>
        {studios.length > shown.length && (
          <p className="mt-4 text-[13px] font-bold text-comic-black/60">
            품질 순 상위 {shown.length}곳이에요.{' '}
            <Link href={c.searchHref} className="underline underline-offset-4">검색에서 전체 보기 →</Link>
          </p>
        )}

        {faqs.length > 0 && (
          <section className="mt-12 max-w-2xl">
            <h2 className="text-lg mb-4" style={{ fontWeight: 900 }}>자주 묻는 질문</h2>
            <dl className="flex flex-col gap-3">
              {faqs.map((f) => (
                <div key={f.q} className="bg-white border-[2px] border-comic-black rounded-[12px] p-4" style={{ boxShadow: '3px 3px 0 #0A0A0A' }}>
                  <dt className="text-sm font-bold">Q. {f.q}</dt>
                  <dd className="mt-1.5 text-sm text-comic-black/70 leading-relaxed">{f.a}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        <section className="mt-12 pt-6 border-t-[2px] border-comic-black/10">
          <h2 className="text-sm font-bold text-comic-black/60 mb-3">다른 목록</h2>
          <div className="flex flex-wrap gap-2">
            {others.map((o) => (
              <Link key={o.slug} href={`/rooms/${o.slug}`} className="inline-flex items-center min-h-[44px] px-3 bg-white border-[2px] border-comic-black rounded-[12px] text-xs font-bold hover:bg-comic-pink hover:text-white">
                {o.title}
              </Link>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
