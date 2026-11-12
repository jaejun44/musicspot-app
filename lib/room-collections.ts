// 종류 조합 페이지 /rooms/[slug] — 서울 음악 연습실 중 한 종류만 모은 목록(2026-11-12). 순수 함수: tests/room-collections.cjs
// 데이터는 lib/region-rooms.ts fetchSeoulStudios(품질 순)를 그대로 받아 거른다
import type { Studio } from '@/types/studio';
import { bandRank } from './studio-kinds';

export interface RoomCollection {
  slug: string;
  /** 화면 제목(h1·title) */
  title: string;
  /** 요약에 쓰는 이름 ("밴드 합주 가능한 곳") */
  noun: string;
  /** 이 조합과 겹치는 지역 페이지 — 서로 링크하고 제목을 구분한다(같은 검색어로 경쟁하지 않게) */
  regionSlug?: string;
  /** 구 한정(주소 '서울 ○○구 ') */
  gu?: string;
  match: (s: Studio) => boolean;
  /** 목록이 잘릴 때 '전체 보기' 검색 주소 */
  searchHref: string;
}

/** 이보다 적으면 noindex(얇은 페이지) — 지역 페이지와 같은 기준 */
export const MIN_ROOMS_FOR_COLLECTION_INDEX = 8;
/** 목록에 보여 줄 최대 수 */
export const COLLECTION_LIST_MAX = 60;

const hasKind = (s: Studio, kind: string) => (s.kinds ?? []).includes(kind);

export const COLLECTIONS: RoomCollection[] = [
  {
    slug: 'seoul-band',
    title: '서울 합주실',
    noun: '밴드 합주 가능한 곳',
    match: (s) => bandRank(s) === 0,
    searchHref: '/search?q=서울&band=1',
  },
  {
    slug: 'seoul-drum',
    title: '서울 드럼 합주실·연습실',
    noun: '드럼이 있는 곳',
    match: (s) => hasKind(s, 'drum'),
    searchHref: '/search?q=서울&has_drum=1',
  },
  {
    slug: 'seoul-piano',
    title: '서울 피아노 연습실',
    noun: '피아노가 있는 곳',
    match: (s) => hasKind(s, 'piano') && bandRank(s) < 2,
    searchHref: '/search?q=서울',
  },
  {
    slug: 'mapo-band',
    title: '마포 밴드 합주실',
    noun: '밴드 합주 가능한 곳',
    regionSlug: 'mapo',
    gu: '마포구',
    match: (s) => bandRank(s) === 0,
    searchHref: '/search?q=마포&band=1',
  },
];

export function getCollection(slug: string): RoomCollection | undefined {
  return COLLECTIONS.find((c) => c.slug === slug);
}

/** 지역 페이지 쪽에서 짝 조합 찾기 */
export function collectionForRegion(regionSlug: string): RoomCollection | undefined {
  return COLLECTIONS.find((c) => c.regionSlug === regionSlug);
}

/** 서울 연습실(품질 순) → 이 조합에 드는 곳(순서 유지) */
export function pickCollection(c: RoomCollection, studios: Studio[]): Studio[] {
  return studios.filter((s) => c.match(s) && (!c.gu || (s.address ?? '').includes(`${c.gu} `)));
}

/** 주소의 '서울 ○○구' 기준 구별 곳 수, 많은 순 */
export function guCounts(studios: Studio[]): { gu: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const s of studios) {
    const gu = /^서울(?:특별시)?\s+(\S+구)\s/.exec(s.address ?? '')?.[1];
    if (gu) counts.set(gu, (counts.get(gu) ?? 0) + 1);
  }
  return [...counts].map(([gu, count]) => ({ gu, count })).sort((a, b) => b.count - a.count || a.gu.localeCompare(b.gu));
}
