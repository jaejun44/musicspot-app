/**
 * "멤버한테 물어보기": 연습실 상세에서 문의하려는 순간 → 후보를 채워 단톡방 투표로 잇는다.
 * 후보 저장소는 lib/candidates.ts(ms_candidates)를 그대로 쓴다.
 */
import { MAX_CANDIDATES } from './candidates';

/** 근처 연습실로 채워 넣는 최소 후보 수 (투표가 "고르기"가 되려면 2곳 이상, 기본 3곳) */
export const ASK_MIN_FILL = 3;

/** 상세의 버튼 → 시트를 여는 window 이벤트. detail: { from } */
export const ASK_OPEN_EVENT = 'ms:ask-members';
/** trackContactClick이 보내는 같은 탭 신호. detail: { type, studioId } */
export const CONTACT_EVENT = 'ms:contact';

/** 외부 문의로 나간 기록 (sessionStorage) */
export const CONTACT_OUT_KEY = 'ms_contact_out';
/** 이번 세션에 넛지를 띄운 연습실 id 목록 (sessionStorage) */
export const NUDGE_SHOWN_KEY = 'ms_ask_nudged';

export const NUDGE_MIN_MS = 10_000;
export const NUDGE_MAX_MS = 30 * 60_000;

export type AskFrom = 'booking_widget' | 'info_card' | 'return_nudge';

export interface ContactOut {
  studioId: string;
  at: number;
}

/**
 * 현재 연습실 → 이미 담은 후보 → (min개 미만이면) 근처 연습실 순서. 중복 제거, 최대 max곳.
 */
export function buildAskCandidates(
  currentId: string,
  existing: string[],
  nearbyIds: string[],
  max = MAX_CANDIDATES,
  min = ASK_MIN_FILL,
): string[] {
  const list: string[] = [];
  const add = (id: string) => {
    if (id && !list.includes(id) && list.length < max) list.push(id);
  };
  add(currentId);
  existing.forEach(add);
  for (const id of nearbyIds) {
    if (list.length >= min) break;
    add(id);
  }
  return list;
}

/** 문의하러 나갔다가 같은 연습실로 10초~30분 안에 돌아왔고, 이번 세션에 아직 안 띄웠으면 true */
export function shouldShowNudge(out: ContactOut | null, studioId: string, now: number, shown: string[]): boolean {
  if (!out || out.studioId !== studioId) return false;
  if (shown.includes(studioId)) return false;
  const elapsed = now - out.at;
  return elapsed >= NUDGE_MIN_MS && elapsed <= NUDGE_MAX_MS;
}

export function parseContactOut(raw: string | null): ContactOut | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<ContactOut>;
    return typeof v?.studioId === 'string' && typeof v?.at === 'number' ? { studioId: v.studioId, at: v.at } : null;
  } catch {
    return null;
  }
}

export function parseShown(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

/** 상세의 "멤버한테 물어보기" 버튼들이 부른다 → AskMembersSheet가 연다 */
export function openAskMembers(from: AskFrom): void {
  window.dispatchEvent(new CustomEvent(ASK_OPEN_EVENT, { detail: { from } }));
}
