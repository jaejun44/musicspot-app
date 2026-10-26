import { getDistanceKm } from './distance';
import type { Studio } from '@/types/studio';
import type { RegionMeta } from './regions';

export interface NearbyRoom {
  studio: Studio;
  distanceM: number;
}

interface Origin {
  lat: number;
  lng: number;
  room_type: string | null;
}

/** 같은 쓰임(월 대여 ↔ 시간제)인지. 'both'는 양쪽 다 맞는다 */
function sameUse(originType: string | null, roomType: string | null | undefined): boolean {
  if (!originType || originType === 'both') return true;
  return roomType === originType || roomType === 'both';
}

/**
 * 비공개된 연습실 대신 보여줄 근처 공개 연습실.
 * 같은 쓰임(월 대여였으면 M·both)을 가까운 순으로 먼저, 모자라면 나머지를 가까운 순으로 채운다.
 */
export function pickNearbyRooms(origin: Origin, candidates: Studio[], max = 6): NearbyRoom[] {
  const withDistance = candidates
    .filter((s) => s.lat != null && s.lng != null)
    .map((s) => ({ studio: s, distanceM: Math.round(getDistanceKm(origin.lat, origin.lng, s.lat!, s.lng!) * 1000) }))
    .sort((a, b) => a.distanceM - b.distanceM);
  const same = withDistance.filter((r) => sameUse(origin.room_type, r.studio.room_type));
  const rest = withDistance.filter((r) => !sameUse(origin.room_type, r.studio.room_type));
  return [...same, ...rest].slice(0, max);
}

/** 좌표에서 가장 가까운 지역 페이지(기준점이 있는 지역만). maxKm 밖이면 없음 */
export function nearestRegion(lat: number, lng: number, regions: RegionMeta[], maxKm = 3): RegionMeta | null {
  let best: { region: RegionMeta; km: number } | null = null;
  for (const region of regions) {
    if (!region.area) continue;
    const km = getDistanceKm(lat, lng, region.area.lat, region.area.lng);
    if (km <= maxKm && (!best || km < best.km)) best = { region, km };
  }
  return best?.region ?? null;
}
