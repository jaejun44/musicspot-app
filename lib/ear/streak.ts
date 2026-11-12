/**
 * 오늘의 음감 기록 — localStorage `ms_ear` (순수 함수 — 테스트 tests/ear-streak.cjs).
 * 서버에 저장하지 않는다(로그인 없음). 브라우저를 바꾸면 연속 기록은 새로 시작한다.
 * 날짜는 모두 KST 'YYYY-MM-DD'(lib/ear/daily.ts kstToday).
 */

export const EAR_STORAGE_KEY = 'ms_ear';
export const EAR_QUESTION_COUNT = 5;
/** 날짜별 결과는 최근 것만 남긴다(저장소가 끝없이 커지지 않게) */
const MAX_DAYS = 60;

export interface EarDay {
  /** 문제별 고른 보기 key. 5개가 다 차면 그날은 끝 */
  picks: string[];
  /** 문제별 정오 */
  marks: boolean[];
}

export interface EarRecord {
  days: Record<string, EarDay>;
  /** 마지막으로 다 푼 날의 연속 기록 */
  current: number;
  best: number;
  /** 마지막으로 다 푼 날 */
  last: string | null;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function emptyRecord(): EarRecord {
  return { days: {}, current: 0, best: 0, last: null };
}

/** 저장된 값이 깨졌거나 다른 모양이면 버리고 빈 기록으로 */
export function parseRecord(raw: unknown): EarRecord {
  if (!raw || typeof raw !== 'object') return emptyRecord();
  const r = raw as Partial<EarRecord>;
  const days: Record<string, EarDay> = {};
  if (r.days && typeof r.days === 'object') {
    for (const [date, day] of Object.entries(r.days)) {
      if (!DATE_RE.test(date) || !day || !Array.isArray(day.picks) || !Array.isArray(day.marks)) continue;
      const picks = day.picks.filter((p): p is string => typeof p === 'string').slice(0, EAR_QUESTION_COUNT);
      const marks = day.marks.filter((m): m is boolean => typeof m === 'boolean').slice(0, picks.length);
      if (marks.length === picks.length) days[date] = { picks, marks };
    }
  }
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0);
  const last = typeof r.last === 'string' && DATE_RE.test(r.last) ? r.last : null;
  return { days, current: num(r.current), best: num(r.best), last };
}

/** 'YYYY-MM-DD' 하루 전 */
export function prevDate(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function isDone(day: EarDay | undefined): boolean {
  return !!day && day.picks.length >= EAR_QUESTION_COUNT;
}

/** 오늘 기준 이어지고 있는 연속 기록. 어제나 오늘 다 풀었으면 유지, 하루라도 건너뛰면 0 */
export function currentStreak(record: EarRecord, today: string): number {
  if (!record.last) return 0;
  return record.last === today || record.last === prevDate(today) ? record.current : 0;
}

/**
 * 오늘 문제에 답 하나를 더한다. 이미 답한 문제(같은 순번)·다 푼 날은 그대로 둔다(하루 1회).
 * 5번째 답으로 그날이 끝나면 연속·최장 기록을 올린다.
 */
export function addAnswer(record: EarRecord, today: string, pickKey: string, correct: boolean): EarRecord {
  const day = record.days[today] ?? { picks: [], marks: [] };
  if (isDone(day)) return record;
  const nextDay: EarDay = { picks: [...day.picks, pickKey], marks: [...day.marks, correct] };
  const days = trimDays({ ...record.days, [today]: nextDay });
  if (!isDone(nextDay)) return { ...record, days };

  const current = record.last === prevDate(today) ? record.current + 1 : record.last === today ? record.current : 1;
  return { days, current, best: Math.max(record.best, current), last: today };
}

function trimDays(days: Record<string, EarDay>): Record<string, EarDay> {
  const dates = Object.keys(days).sort();
  if (dates.length <= MAX_DAYS) return days;
  const keep = dates.slice(-MAX_DAYS);
  return Object.fromEntries(keep.map((d) => [d, days[d]]));
}

/** 음감을 한 번이라도 끝까지 푼 브라우저인가 (스트립 카드 조건) */
export function hasPlayed(record: EarRecord): boolean {
  return record.last !== null;
}

/**
 * 공유 텍스트. 정답 내용은 넣지 않는다(다른 사람도 같은 문제를 푼다).
 * 예: 오늘의 음감 11/12 · 4/5 🟩🟩🟥🟩🟩 · 🔥3일째
 */
export function buildShareText(date: string, day: EarDay, streak: number, locale: 'ko' | 'ja'): string {
  const [, m, d] = date.split('-');
  const md = `${Number(m)}/${Number(d)}`;
  const score = day.marks.filter(Boolean).length;
  const grid = day.marks.map((ok) => (ok ? '🟩' : '🟥')).join('');
  const title = locale === 'ja' ? '今日の音感' : '오늘의 음감';
  const fire = streak > 0 ? ` · 🔥${streak}${locale === 'ja' ? '日連続' : '일째'}` : '';
  return `${title} ${md} · ${score}/${day.marks.length} ${grid}${fire}`;
}

// ─── localStorage 래퍼 (브라우저 전용) ───────────────────────────

export function loadRecord(): EarRecord {
  try {
    return parseRecord(JSON.parse(localStorage.getItem(EAR_STORAGE_KEY) || 'null'));
  } catch {
    return emptyRecord();
  }
}

export function saveRecord(record: EarRecord): boolean {
  try {
    localStorage.setItem(EAR_STORAGE_KEY, JSON.stringify(record));
    return true;
  } catch (e) {
    console.warn('[ear] 기록 저장 실패 — 새로고침하면 오늘 문제를 다시 풀 수 있음', e);
    return false;
  }
}
