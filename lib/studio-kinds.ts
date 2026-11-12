// 연습실 종류(밴드용 우선, 댄스 전용은 뒤로) — 정렬·배지 공용. 값은 DB studios.kinds·band_rank(scripts/studio_rules.py)
import type { Studio } from '@/types/studio';

const BADGES: { kind: string; label: string }[] = [
  { kind: 'band', label: '🎸 밴드 합주' },
  { kind: 'drum', label: '🥁 드럼' },
  { kind: 'piano', label: '🎹 피아노' },
  { kind: 'vocal', label: '🎤 보컬' },
  { kind: 'recording', label: '🎙️ 녹음' },
];

/** 값이 없으면(옛 캐시 등) 1 = 중간 */
export function bandRank(s: Pick<Studio, 'band_rank'>): number {
  return s.band_rank ?? 1;
}

export function isDanceOnly(s: Pick<Studio, 'band_rank'>): boolean {
  return bandRank(s) === 2;
}

/** 카드·상세 배지 최대 2개. 댄스 전용은 배지 없음 */
export function studioBadges(s: Pick<Studio, 'kinds' | 'band_rank'>, max = 2): string[] {
  if (isDanceOnly(s)) return [];
  const kinds = new Set(s.kinds ?? []);
  return BADGES.filter((b) => kinds.has(b.kind)).slice(0, max).map((b) => b.label);
}

/** band_rank 오름차순 안정 정렬 — 같은 등급 안에선 들어온 순서(기존 기준) 유지 */
export function sortByBandRank<T>(items: T[], get: (item: T) => Pick<Studio, 'band_rank'>): T[] {
  return items
    .map((item, i) => ({ item, i }))
    .sort((a, b) => bandRank(get(a.item)) - bandRank(get(b.item)) || a.i - b.i)
    .map(({ item }) => item);
}

/** 사용자가 고른 정렬(가격순 등)은 그대로 두고 댄스 전용만 맨 뒤로 */
export function danceOnlyLast<T>(items: T[], get: (item: T) => Pick<Studio, 'band_rank'>): T[] {
  return [...items.filter((x) => !isDanceOnly(get(x))), ...items.filter((x) => isDanceOnly(get(x)))];
}
