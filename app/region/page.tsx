import { Metadata } from 'next';
import Link from 'next/link';
import { REGIONS } from '@/lib/regions';
import { localeAlternates } from '@/lib/seo';
import Navigation from '@/components/Navigation';
import SiteFooter from '@/components/SiteFooter';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.musicspotfest.com';

// ISR: 지역 목록은 거의 안 변하므로 하루 캐싱.
export const revalidate = 86400;

export function generateMetadata(): Metadata {
  const title = '전국 합주실·연습실 지역별 찾기 | Music Spot';
  const description =
    '서울 홍대·강남부터 부산·대구·대전까지, 우리 동네 합주실·연습실을 지역별로 한눈에. 위치·가격·드럼 여부로 비교하고 바로 문의하세요.';
  const url = `${SITE_URL}/region`;

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
  };
}

/** REGIONS 를 등장 순서 유지하며 city 로 그룹핑 */
function groupByCity() {
  const groups: { city: string; regions: typeof REGIONS }[] = [];
  for (const region of REGIONS) {
    let group = groups.find((g) => g.city === region.city);
    if (!group) {
      group = { city: region.city, regions: [] };
      groups.push(group);
    }
    group.regions.push(region);
  }
  return groups;
}

export default function RegionIndexPage() {
  const groups = groupByCity();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: '전국 합주실·연습실 지역별 목록',
    url: `${SITE_URL}/region`,
    numberOfItems: REGIONS.length,
    itemListElement: REGIONS.map((r, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${SITE_URL}/region/${r.slug}`,
      name: `${r.label} 연습실`,
    })),
  };

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
          <span className="text-comic-black">지역</span>
        </nav>

        <header className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bungee">
            우리 동네 <span className="text-comic-pink">합주실 찾기</span>
          </h1>
          <p className="mt-2 text-sm text-comic-black/60 leading-relaxed">
            전국 {REGIONS.length}개 지역의 합주실·연습실을 지역별로 모았어요.
            가고 싶은 동네를 골라 위치·가격·드럼 여부를 비교해보세요.
          </p>
        </header>

        <div className="flex flex-col gap-10">
          {groups.map((group) => (
            <section key={group.city}>
              <h2 className="text-lg sm:text-xl font-bungee mb-4">
                {group.city}
              </h2>
              <div className="flex flex-wrap gap-2.5">
                {group.regions.map((r) => (
                  <Link
                    key={r.slug}
                    href={`/region/${r.slug}`}
                    className="px-4 py-2 bg-white border-[2px] border-comic-black text-sm font-bold hover:bg-comic-pink hover:text-white transition-colors"
                    style={{ boxShadow: '3px 3px 0 #0A0A0A' }}
                  >
                    {r.label} 연습실
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>

        <section className="mt-12 pt-6 border-t-[2px] border-comic-black/10">
          <p className="text-sm text-comic-black/60 font-bold mb-3">
            찾는 지역이 없나요? 전체 연습실에서 검색해보세요.
          </p>
          <Link
            href="/search"
            className="inline-block px-5 py-2.5 bg-comic-pink border-[2px] border-comic-black text-white font-bold text-sm"
            style={{ boxShadow: '3px 3px 0 #0A0A0A' }}
          >
            전체 연습실 보기
          </Link>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
