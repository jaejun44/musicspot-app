import { buildShareUrl } from '@/lib/share-utm';

/**
 * 웹 푸시 알림 문구·중복 방지 키 (순수 함수 — 테스트 tests/push-messages.cjs).
 * 발송은 lib/push-server.ts. 이름 등 개인정보는 알림에 넣지 않는다(잠금화면에 뜬다).
 */

export interface PushPayload {
  title: string;
  body: string;
  /** 같은 사이트 경로(sw.js가 다른 사이트 주소는 버린다) */
  url: string;
  /** 같은 tag면 새 알림이 이전 것을 덮는다 */
  tag: string;
}

/** 멤버 응답 알림은 만든 사람에게 10분에 1번 */
export const RESPONSE_WINDOW_MS = 10 * 60 * 1000;

export function responseEvent(now: Date): string {
  return `response:${Math.floor(now.getTime() / RESPONSE_WINDOW_MS)}`;
}

export function decidedEvent(studioId: string): string {
  return `decided:${studioId}`;
}

/** buildShareUrl의 절대 주소 → 경로+쿼리 (미리보기 배포에서도 같은 사이트로 열리게) */
function pushPath(path: string, campaign: 'vote' | 'split' | 'ear', content: string): string {
  const u = new URL(buildShareUrl(path, 'push', campaign, content));
  return `${u.pathname}${u.search}`;
}

export function voteResponsePayload(voteId: string, responseCount: number): PushPayload {
  return {
    title: '🗳️ 멤버가 투표했어요',
    body: `지금 ${responseCount}명 응답했어요. 눌러서 결과를 보세요.`,
    url: pushPath(`/vote/${voteId}`, 'vote', 'response'),
    tag: `vote-${voteId}`,
  };
}

export function voteDecidedPayload(voteId: string, studioName: string | null): PushPayload {
  return {
    title: '📍 합주 연습실이 정해졌어요',
    body: `${studioName ?? '연습실'} — 눌러서 확인하고 캘린더에 넣어 두세요.`,
    url: pushPath(`/vote/${voteId}`, 'vote', 'decided'),
    tag: `vote-${voteId}`,
  };
}

/** 한국 시간 기준 오늘 날짜 'YYYY-MM-DD' */
export function kstDate(now: Date): string {
  return new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** 한국 시간 기준 내일 날짜 'YYYY-MM-DD' (Cron은 UTC로 돈다) */
export function kstTomorrow(now: Date): string {
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  kst.setUTCDate(kst.getUTCDate() + 1);
  return kst.toISOString().slice(0, 10);
}

export function reminderEvent(date: string): string {
  return `reminder:${date}`;
}

/** 정산 미납 알림은 정산당 1번 */
export const UNPAID_EVENT = 'unpaid';

const SLOT_LABEL: Record<string, string> = { morning: '오전', afternoon: '오후', evening: '저녁', night: '밤' };

export function rehearsalReminderPayload(voteId: string, studioName: string | null, slot: string | null): PushPayload {
  const when = slot && SLOT_LABEL[slot] ? `내일 ${SLOT_LABEL[slot]}` : '내일';
  return {
    title: `🥁 ${when} 합주예요`,
    body: `${studioName ?? '정한 연습실'} — 눌러서 장소·시간을 다시 확인하세요.`,
    url: pushPath(`/vote/${voteId}`, 'vote', 'reminder'),
    tag: `vote-${voteId}`,
  };
}

/** 본인에게만 간다. 다른 사람 이름·납부 상태는 넣지 않는다 */
export function unpaidPayload(splitId: string, perPerson: number): PushPayload {
  return {
    title: '💸 합주비 정산 링크 다시 보기',
    body: `1인당 ${perPerson.toLocaleString('ko-KR')}원 — 냈으면 [냈어요]를 눌러 두세요.`,
    url: pushPath(`/split/${splitId}`, 'split', 'unpaid'),
    tag: `split-${splitId}`,
  };
}

// ─── 오늘의 음감 (매일 1번, 2026-11-12) ─────────────────────────

/** 음감은 대상이 하나뿐 — push_topics.target_id에 넣는 고정 id (supabase/16_push_ear.sql) */
export const EAR_TARGET_ID = '00000000-0000-0000-0000-000000000000';

/** 하루 1건 */
export function earEvent(date: string): string {
  return `ear:${date}`;
}

/** 서버는 누가 풀었는지 모른다 → 구독자 전원에게 "아직 안 풀었으면" 문구로 */
export function earPayload(language: string): PushPayload {
  const ja = language === 'ja';
  return {
    title: ja ? '🎧 今日の音感、まだ解いてない？' : '🎧 오늘의 음감 아직 안 풀었어요',
    body: ja ? '5問・1分で終わります。連続記録をつなごう。' : '5문제, 1분이면 끝나요. 연속 기록을 이어 가세요.',
    url: pushPath('/ear', 'ear', 'daily'),
    tag: 'ear-daily',
  };
}
