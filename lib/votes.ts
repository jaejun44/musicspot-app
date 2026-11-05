import { supabase } from '@/lib/supabase';

/**
 * 합주 후보 투표 (/vote/[id]). DB는 supabase/10_votes.sql — 테이블 직접 접근 없이 RPC 4개로만.
 * 만든 사람 판별은 생성 때 받은 비밀 토큰(localStorage ms_vote_tokens),
 * 응답자 구분은 이 기기 전용 투표 키(ms_vk). anon_id(ms_aid)는 분석 이벤트에 실려 다른 사람이 볼 수 있어 키로 쓰지 않는다.
 */

export type VoteSlot = 'morning' | 'afternoon' | 'evening' | 'night';

export const VOTE_SLOTS: { key: VoteSlot; label: string }[] = [
  { key: 'morning', label: '오전' },
  { key: 'afternoon', label: '오후' },
  { key: 'evening', label: '저녁' },
  { key: 'night', label: '밤' },
];

export const MAX_DATE_OPTIONS = 7;

/** 밴드 일정으로 저장할 때 시간대 → 시작 시각(band_schedules.start_time) */
export const SLOT_START_TIME: Record<VoteSlot, string> = {
  morning: '10:00',
  afternoon: '14:00',
  evening: '18:00',
  night: '21:00',
};

export interface VoteResponse {
  nickname: string;
  picked_studio_ids: string[];
  picked_dates: string[];
  picked_slots: VoteSlot[];
  is_mine: boolean;
}

export interface Vote {
  id: string;
  studio_ids: string[];
  date_options: string[];
  decided_studio_id: string | null;
  decided_at: string | null;
  expires_at: string;
  is_expired: boolean;
  created_at: string;
  parent_vote_id: string | null;
  next_vote_id: string | null;
  is_creator: boolean;
  responses: VoteResponse[];
}

export type SubmitResult = 'saved' | 'not_found' | 'expired' | 'decided' | 'full' | 'invalid';
export type DecideResult = 'decided' | 'not_found' | 'forbidden' | 'invalid';

// ─── 순수 함수 (tests/votes.cjs) ─────────────────────────────────

export interface VoteTally {
  studios: Record<string, number>;
  dates: Record<string, number>;
  slots: Record<string, number>;
  /** 표가 가장 많은 후보(동점이면 여러 개). 아무도 안 골랐으면 빈 배열 */
  leaders: string[];
}

export function tallyVote(vote: Pick<Vote, 'studio_ids' | 'date_options' | 'responses'>): VoteTally {
  const studios: Record<string, number> = Object.fromEntries(vote.studio_ids.map((id) => [id, 0]));
  const dates: Record<string, number> = Object.fromEntries(vote.date_options.map((d) => [d, 0]));
  const slots: Record<string, number> = Object.fromEntries(VOTE_SLOTS.map((s) => [s.key, 0]));
  for (const r of vote.responses) {
    for (const id of r.picked_studio_ids) if (id in studios) studios[id] += 1;
    for (const d of r.picked_dates) if (d in dates) dates[d] += 1;
    for (const s of r.picked_slots) if (s in slots) slots[s] += 1;
  }
  const max = Math.max(0, ...Object.values(studios));
  const leaders = max === 0 ? [] : vote.studio_ids.filter((id) => studios[id] === max);
  return { studios, dates, slots, leaders };
}

/** 표가 가장 많은 항목(동점이면 order 앞쪽). 아무도 안 골랐으면 null */
export function topKey(counts: Record<string, number>, order: string[]): string | null {
  let best: string | null = null;
  for (const key of order) {
    if ((counts[key] ?? 0) > 0 && (best === null || counts[key] > counts[best])) best = key;
  }
  return best;
}

/** 내 투표 목록에 추가(최근 것이 앞, 중복 제거, 최대 max) */
export function addMyVote(list: string[], id: string, max = 10): string[] {
  return [id, ...list.filter((v) => v !== id)].slice(0, max);
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

/** 'YYYY-MM-DD' → '11/8(토)'. 시간대 영향 없이 날짜 글자만 읽는다 */
export function formatVoteDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${m}/${d}(${weekday})`;
}

/** 오늘(KST)부터 days일치 'YYYY-MM-DD'. 날짜 후보 고르기 칩 */
export function upcomingDates(now: Date, days = 14): string[] {
  const kst = new Date(now.getTime() + 9 * 3_600_000);
  const base = Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate());
  return Array.from({ length: days }, (_, i) => new Date(base + i * 86_400_000).toISOString().slice(0, 10));
}

// ─── 이 기기 저장값 ──────────────────────────────────────────────

const VOTER_KEY = 'ms_vk';
const TOKENS_KEY = 'ms_vote_tokens';
/** 내가 만들었거나 투표한 투표 id (홈 스트립 "진행 중인 투표") */
const MY_VOTES_KEY = 'ms_my_votes';

export function getMyVoteIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(MY_VOTES_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

export function rememberMyVote(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(MY_VOTES_KEY, JSON.stringify(addMyVote(getMyVoteIds(), id)));
  } catch (e) {
    console.warn('[votes] 내 투표 목록 저장 실패 — 홈 스트립에 안 보일 수 있음', e);
  }
}

/** 이 기기의 투표 키. 저장소가 막혔으면 null(투표 불가 안내) */
export function getVoterKey(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    let key = localStorage.getItem(VOTER_KEY);
    if (!key) {
      key = crypto.randomUUID().replace(/-/g, '');
      localStorage.setItem(VOTER_KEY, key);
    }
    return key;
  } catch {
    return null;
  }
}

function readTokens(): Record<string, string> {
  try {
    const parsed = JSON.parse(localStorage.getItem(TOKENS_KEY) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function getCreatorToken(voteId: string): string | null {
  if (typeof window === 'undefined') return null;
  return readTokens()[voteId] ?? null;
}

function saveCreatorToken(voteId: string, token: string): boolean {
  try {
    localStorage.setItem(TOKENS_KEY, JSON.stringify({ ...readTokens(), [voteId]: token }));
    return true;
  } catch {
    return false;
  }
}

// ─── RPC ─────────────────────────────────────────────────────────

/** 만들기. 실패하면 사람이 읽을 이유와 함께 throw */
export async function createVote(input: {
  anonId: string;
  studioIds: string[];
  dates: string[];
  country: string;
  parentVoteId?: string;
}): Promise<string> {
  const { data, error } = await supabase.rpc('create_vote', {
    p_anon_id: input.anonId,
    p_studio_ids: input.studioIds,
    p_date_options: input.dates,
    p_country: input.country,
    p_language: 'ko',
    p_parent_vote_id: input.parentVoteId ?? null,
  });
  if (error || !data) {
    const msg = error?.message ?? '';
    if (msg.includes('rate_limited')) throw new Error('잠시 뒤에 다시 만들어 주세요. 투표를 너무 많이 만들었어요.');
    if (msg.includes('invalid_studios')) throw new Error('지금 공개된 연습실이 후보에 없어요.');
    throw new Error(`투표를 만들지 못했어요. (${msg || '응답 없음'})`);
  }
  const { id, creator_token } = data as { id: string; creator_token: string };
  if (!saveCreatorToken(id, creator_token)) {
    console.warn('[votes] 만든 사람 토큰 저장 실패 — 이 기기에서 결정 버튼이 안 보일 수 있음');
  }
  rememberMyVote(id);
  return id;
}

export async function getVote(voteId: string, voterKey: string | null, creatorToken: string | null): Promise<Vote | null> {
  const { data, error } = await supabase.rpc('get_vote', {
    p_vote_id: voteId,
    p_anon_id: voterKey,
    p_creator_token: creatorToken,
  });
  if (error) throw new Error(`투표를 불러오지 못했어요. (${error.message})`);
  return (data as Vote | null) ?? null;
}

export async function submitVoteResponse(input: {
  voteId: string;
  voterKey: string;
  nickname: string;
  studioIds: string[];
  dates: string[];
  slots: VoteSlot[];
  country: string;
}): Promise<SubmitResult> {
  const { data, error } = await supabase.rpc('submit_vote_response', {
    p_vote_id: input.voteId,
    p_anon_id: input.voterKey,
    p_nickname: input.nickname,
    p_studio_ids: input.studioIds,
    p_dates: input.dates,
    p_slots: input.slots,
    p_country: input.country,
    p_language: 'ko',
  });
  if (error) throw new Error(`투표를 저장하지 못했어요. (${error.message})`);
  return data as SubmitResult;
}

export async function decideVote(voteId: string, creatorToken: string, studioId: string): Promise<DecideResult> {
  const { data, error } = await supabase.rpc('decide_vote', {
    p_vote_id: voteId,
    p_creator_token: creatorToken,
    p_studio_id: studioId,
  });
  if (error) throw new Error(`결정을 저장하지 못했어요. (${error.message})`);
  return data as DecideResult;
}
