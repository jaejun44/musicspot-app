import { supabase } from '@/lib/supabase';

/**
 * 합주비 N빵 정산 (/split/[id]). DB는 supabase/13_splits.sql — 테이블 직접 접근 없이 RPC 3개로만.
 * 송금·결제·계좌는 없다(계산과 "냈어요" 체크만). 금액은 안내용 — 실제 요금은 업체 기준.
 * 만든 사람 판별은 생성 때 받은 비밀 토큰(localStorage ms_split_tokens), 체크하는 사람 구분은 투표와 같은 기기 키(ms_vk).
 */

export const SPLIT_MIN_PEOPLE = 2;
export const SPLIT_MAX_PEOPLE = 20;
export const SPLIT_MAX_AMOUNT = 1_000_000;
export const SPLIT_DEFAULT_HOURS = 2;
export const SPLIT_DEFAULT_PEOPLE = 4;

const TOKENS_KEY = 'ms_split_tokens';

/**
 * 1인당 금액: (시간당 × 시간 + 추가) ÷ 인원, 100원 단위 올림.
 * 서버 split_per_person과 같은 규칙 — 소수 오차가 없게 시간을 0.5 단위 정수(×2)로 바꿔 정수로만 계산한다.
 * 입력이 범위를 벗어나면 null
 */
export function calcPerPerson(hourly: number, hours: number, people: number, extra = 0): number | null {
  const halfHours = Math.round(hours * 2);
  if (!Number.isInteger(hourly) || !Number.isInteger(extra) || !Number.isInteger(people)) return null;
  if (hourly < 0 || extra < 0 || people < SPLIT_MIN_PEOPLE || people > SPLIT_MAX_PEOPLE) return null;
  if (halfHours < 1 || halfHours > 48 || Math.abs(hours * 2 - halfHours) > 1e-9) return null;
  const twiceTotal = hourly * halfHours + extra * 2; // 총액 × 2
  if (twiceTotal > SPLIT_MAX_AMOUNT * 2) return null;
  return Math.ceil(twiceTotal / (people * 200)) * 100;
}

/** 총액(원). 시간당 × 시간 + 추가 */
export function splitTotal(hourly: number, hours: number, extra = 0): number {
  return Math.round((hourly * Math.round(hours * 2)) / 2) + extra;
}

export function formatWon(n: number): string {
  return `${n.toLocaleString('ko-KR')}원`;
}

export interface SplitPayer {
  nickname: string;
  paid: boolean;
  is_mine: boolean;
}

export interface Split {
  id: string;
  studio_id: string | null;
  vote_id: string | null;
  hourly_price: number;
  hours: number;
  people: number;
  extra: number;
  total: number;
  per_person: number;
  played_on: string | null;
  created_at: string;
  expires_at: string;
  is_expired: boolean;
  is_creator: boolean;
  payers: SplitPayer[];
}

function readTokens(): Record<string, string> {
  try {
    const parsed = JSON.parse(localStorage.getItem(TOKENS_KEY) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function getSplitCreatorToken(splitId: string): string | null {
  if (typeof window === 'undefined') return null;
  return readTokens()[splitId] ?? null;
}

function saveSplitCreatorToken(splitId: string, token: string): boolean {
  try {
    localStorage.setItem(TOKENS_KEY, JSON.stringify({ ...readTokens(), [splitId]: token }));
    return true;
  } catch {
    return false;
  }
}

// ─── RPC ─────────────────────────────────────────────────────────

/** 만들기. 1인당 금액은 서버가 다시 계산한다. 실패하면 사람이 읽을 이유와 함께 throw */
export async function createSplit(input: {
  creatorKey: string;
  hourlyPrice: number;
  hours: number;
  people: number;
  extra: number;
  studioId?: string | null;
  voteId?: string | null;
  playedOn?: string | null;
  country: string;
}): Promise<string> {
  const { data, error } = await supabase.rpc('create_split', {
    p_creator_key: input.creatorKey,
    p_hourly_price: input.hourlyPrice,
    p_hours: input.hours,
    p_people: input.people,
    p_extra: input.extra,
    p_studio_id: input.studioId ?? null,
    p_vote_id: input.voteId ?? null,
    p_played_on: input.playedOn ?? null,
    p_country: input.country,
    p_language: 'ko',
  });
  if (error || !data) {
    const msg = error?.message ?? '';
    if (msg.includes('rate_limited')) throw new Error('잠시 뒤에 다시 만들어 주세요. 정산을 너무 많이 만들었어요.');
    if (msg.includes('invalid_people')) throw new Error(`인원은 ${SPLIT_MIN_PEOPLE}~${SPLIT_MAX_PEOPLE}명으로 적어 주세요.`);
    if (msg.includes('invalid_amount')) throw new Error(`금액은 총 ${formatWon(SPLIT_MAX_AMOUNT)}까지 계산할 수 있어요.`);
    if (msg.includes('invalid_hours')) throw new Error('시간은 0.5시간 단위로 적어 주세요.');
    throw new Error(`정산 링크를 만들지 못했어요. (${msg || '응답 없음'})`);
  }
  const { id, creator_token } = data as { id: string; creator_token: string };
  if (!saveSplitCreatorToken(id, creator_token)) {
    console.warn('[split] 만든 사람 토큰 저장 실패 — 이 기기에서 만든 사람 표시가 안 될 수 있음');
  }
  return id;
}

export async function getSplit(splitId: string, payerKey: string | null, creatorToken: string | null): Promise<Split | null> {
  const { data, error } = await supabase.rpc('get_split', {
    p_split_id: splitId,
    p_payer_key: payerKey,
    p_creator_token: creatorToken,
  });
  if (error) throw new Error(`정산을 불러오지 못했어요. (${error.message})`);
  return (data as Split | null) ?? null;
}

export type TogglePaidResult = 'saved' | 'not_found' | 'expired' | 'full' | 'invalid';

export async function toggleSplitPaid(input: {
  splitId: string;
  payerKey: string;
  nickname: string;
  paid: boolean;
  country: string;
}): Promise<TogglePaidResult> {
  const { data, error } = await supabase.rpc('toggle_split_paid', {
    p_split_id: input.splitId,
    p_payer_key: input.payerKey,
    p_nickname: input.nickname,
    p_paid: input.paid,
    p_country: input.country,
    p_language: 'ko',
  });
  if (error) throw new Error(`저장하지 못했어요. (${error.message})`);
  return data as TogglePaidResult;
}
