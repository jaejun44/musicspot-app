import type { RegionArea, RegionMeta } from './regions';
import type { Studio } from '@/types/studio';
import { getDistanceKm } from './distance';
import { hourlyPrice } from './studio-price';

// 지역 페이지 연습실 고르기 — 순수 함수(데이터 조회는 페이지에서). tests/region-select.cjs

const BASE_RADIUS_M = 1000;
const WIDE_RADIUS_M = 1500;
/** 기본 반경 안이 이보다 적으면 넓은 반경으로 */
const MIN_ROOMS_IN_BASE = 8;
/** 직선거리 → 실제 걷는 거리 보정(길이 꺾임)과 걷는 속도(분당 70m ≈ 4.2km/h) */
const DETOUR = 1.3;
const WALK_M_PER_MIN = 70;

export interface RegionRoom {
  studio: Studio;
  /** station 기준일 때만. gu 기준은 null */
  distanceM: number | null;
}

export interface RegionSelection {
  rooms: RegionRoom[];
  /** station 기준에서 실제로 쓴 반경. gu 기준은 null */
  radiusM: number | null;
}

export function walkMinutes(distanceM: number): number {
  return Math.max(1, Math.round((distanceM * DETOUR) / WALK_M_PER_MIN));
}

function distanceM(area: RegionArea, s: Studio): number | null {
  if (s.lat == null || s.lng == null) return null;
  return getDistanceKm(area.lat, area.lng, s.lat, s.lng) * 1000;
}

/**
 * studios: 서울 음악 연습실 전체(품질 점수 순). area가 없는 지역엔 쓰지 않는다.
 * station → 반경 안, gu → 주소에 그 구가 있는 곳. 둘 다 받은 순서(품질 순)를 유지한다 —
 * 거리순으로 하면 사진 깨진 월세 작업실 같은 저품질 목록이 맨 위로 올라온다(홍대 실측). 거리는 카드에 도보 분으로 보여준다.
 */
export function selectRegionRooms(area: RegionArea, studios: Studio[]): RegionSelection {
  if (area.kind === 'gu') {
    const rooms = studios
      .filter((s) => (s.address ?? '').includes(`${area.gu} `))
      .map((studio) => ({ studio, distanceM: null }));
    return { rooms, radiusM: null };
  }

  const withDistance = studios
    .map((studio) => ({ studio, distanceM: distanceM(area, studio) }))
    .filter((r): r is { studio: Studio; distanceM: number } => r.distanceM != null);

  const inBase = withDistance.filter((r) => r.distanceM <= BASE_RADIUS_M);
  if (inBase.length >= MIN_ROOMS_IN_BASE) return { rooms: inBase, radiusM: BASE_RADIUS_M };
  return { rooms: withDistance.filter((r) => r.distanceM <= WIDE_RADIUS_M), radiusM: WIDE_RADIUS_M };
}

/** 시간 단위로 요금이 나온 곳(합주실답게 빌릴 수 있는 곳) 중 기준점에서 가장 가까운 곳 */
export function nearestHourlyRoom(rooms: RegionRoom[]): RegionRoom | null {
  let best: RegionRoom | null = null;
  for (const r of rooms) {
    if (r.distanceM == null || hourlyPrice(r.studio) == null) continue;
    if (!best || r.distanceM < (best.distanceM as number)) best = r;
  }
  return best;
}

/** 이 지역 기준점에서 가까운 다른 서울 지역 (내부 링크용) */
export function nearbyRegions(region: RegionMeta, all: RegionMeta[], limit = 4): RegionMeta[] {
  const from = region.area;
  if (!from) return [];
  return all
    .filter((r) => r.slug !== region.slug && r.area)
    .map((r) => ({ r, d: getDistanceKm(from.lat, from.lng, r.area!.lat, r.area!.lng) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, limit)
    .map(({ r }) => r);
}

export interface RegionStats {
  total: number;
  drum: number;
  pricedCount: number;
  minPrice: number | null;
  medianPrice: number | null;
}

export function regionStats(rooms: RegionRoom[]): RegionStats {
  const prices = rooms
    .map((r) => hourlyPrice(r.studio))
    .filter((p): p is number => p != null)
    .sort((a, b) => a - b);
  const mid = Math.floor(prices.length / 2);
  return {
    total: rooms.length,
    drum: rooms.filter((r) => r.studio.has_drum).length,
    pricedCount: prices.length,
    minPrice: prices[0] ?? null,
    medianPrice: prices.length === 0 ? null : prices.length % 2 ? prices[mid] : Math.round((prices[mid - 1] + prices[mid]) / 2),
  };
}
