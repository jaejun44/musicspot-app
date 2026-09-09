const KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'] as const;
type Attribution = Partial<Record<(typeof KEYS)[number], string>>;
const STORAGE_KEY = 'ms_campaign_v1';

/** 탭 세션의 가장 최근 명시적 캠페인. 내부 이동에서 유지, 새 캠페인에서는 교체. */
export function getAttribution(search: string, storage?: Pick<Storage, 'getItem' | 'setItem'>): Attribution {
  const params = new URLSearchParams(search);
  const current: Attribution = {};
  for (const key of KEYS) {
    const value = params.get(key)?.trim().slice(0, 200);
    if (value) current[key] = value;
  }
  if (Object.keys(current).length) {
    try { storage?.setItem(STORAGE_KEY, JSON.stringify(current)); } catch { /* storage 차단 */ }
    return current;
  }
  try {
    const stored: unknown = JSON.parse(storage?.getItem(STORAGE_KEY) ?? '{}');
    if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return {};
    const result: Attribution = {};
    for (const key of KEYS) {
      const value = (stored as Record<string, unknown>)[key];
      if (typeof value === 'string' && value.trim()) result[key] = value.trim().slice(0, 200);
    }
    return result;
  } catch { return {}; }
}
