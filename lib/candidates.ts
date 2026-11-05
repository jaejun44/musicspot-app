/**
 * 합주 후보 연습실 (localStorage, 비로그인 가능). 멤버와 정할 곳을 최대 5곳까지 담는다.
 * Phase C 투표 링크가 이 목록으로 만들어진다.
 */
export const CANDIDATES_KEY = 'ms_candidates';
export const MAX_CANDIDATES = 5;
/** 같은 탭 안의 다른 컴포넌트에 변경을 알리는 window 이벤트 (storage 이벤트는 다른 탭에만 온다) */
export const CANDIDATES_EVENT = 'ms:candidates';

export interface ToggleResult {
  list: string[];
  added: boolean;
  /** 가득 차서 추가를 거부했음 */
  full: boolean;
}

/** 저장값 → id 목록. 깨진 값·문자열 아닌 항목·중복은 버리고 최대 개수로 자른다 */
export function parseCandidates(raw: string | null, max = MAX_CANDIDATES): string[] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const ids = parsed.filter((v): v is string => typeof v === 'string' && v.length > 0);
  return Array.from(new Set(ids)).slice(0, max);
}

/** 있으면 빼고, 없으면 끝에 추가. 가득 찼으면 그대로 두고 full */
export function toggleCandidate(list: string[], id: string, max = MAX_CANDIDATES): ToggleResult {
  if (list.includes(id)) return { list: list.filter((v) => v !== id), added: false, full: false };
  if (list.length >= max) return { list, added: false, full: true };
  return { list: [...list, id], added: true, full: false };
}

export function getCandidates(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return parseCandidates(localStorage.getItem(CANDIDATES_KEY));
  } catch {
    return [];
  }
}

export function setCandidates(list: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CANDIDATES_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn('[candidates] 저장 실패 — 이번 화면에서만 유지', e);
  }
  window.dispatchEvent(new Event(CANDIDATES_EVENT));
}
