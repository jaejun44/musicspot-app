import { Studio } from '@/types/studio';
import { getDistanceKm } from './distance';

interface StudioWithDistance extends Studio {
  distance: number;
}

function getDistanceBucket(km: number): number {
  if (km <= 0.5) return 0;
  if (km <= 1) return 1;
  if (km <= 2) return 2;
  return 3;
}

/** GPS 검색: 거리 구간 → 같은 구간 내 완성도순 */
export function sortByDistanceAndQuality(
  studios: Studio[],
  userLat: number,
  userLng: number
): StudioWithDistance[] {
  return studios
    .map((s) => ({
      ...s,
      distance:
        s.lat != null && s.lng != null
          ? getDistanceKm(userLat, userLng, s.lat, s.lng)
          : 999,
    }))
    .sort((a, b) => {
      const bucketA = getDistanceBucket(a.distance);
      const bucketB = getDistanceBucket(b.distance);
      if (bucketA !== bucketB) return bucketA - bucketB;
      return (b.data_quality_score || 0) - (a.data_quality_score || 0);
    });
}

