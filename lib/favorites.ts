const STORAGE_KEY = 'musicspot_favorites';

export function getFavorites(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function toggleFavorite(studioId: string): boolean {
  const favs = getFavorites();
  const index = favs.indexOf(studioId);
  if (index > -1) {
    favs.splice(index, 1);
  } else {
    favs.push(studioId);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(favs));
  return index === -1;
}

export function isFavorite(studioId: string): boolean {
  return getFavorites().includes(studioId);
}
