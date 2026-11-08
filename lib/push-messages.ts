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
function pushPath(path: string, campaign: 'vote' | 'split', content: string): string {
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
