const STORAGE_KEY = 'musicspot_recently_viewed';
const MAX_ITEMS = 10;

interface RecentItem {
  studioId: string;
  viewedAt: number;
}

export function getRecentlyViewed(): RecentItem[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function addRecentlyViewed(studioId: string): void {
  const items = getRecentlyViewed().filter((item) => item.studioId !== studioId);
  items.unshift({ studioId, viewedAt: Date.now() });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
}

export function getRecentStudioIds(): string[] {
  return getRecentlyViewed().map((item) => item.studioId);
}
