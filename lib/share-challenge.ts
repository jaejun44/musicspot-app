// 8마디 챌린지 릴레이 공유 인텐트 빌더
// 일본 연주자는 X(트위터) 중심 → 프리필 텍스트 + 해시태그로 UGC/릴레이 확산.
// 한국은 카카오 SDK가 별도 처리(ProjectDetailModal). 여기선 X / LINE 인텐트만 담당.
import { buildShareUrl } from './share-utm';
import type { Locale } from './i18n/locale';

const HASHTAGS: Record<Locale, string[]> = {
  ja: ['8小節チャレンジ', 'MusicSpot'],
  ko: ['8마디챌린지', 'MusicSpot'],
};

interface TweetOpts {
  projectId: string;
  title: string;
  creatorName?: string;
  locale: Locale;
  /** 내가 마디를 막 이어붙인 직후면 true(자랑 톤), 단순 공유면 false */
  justAdded?: boolean;
}

/** X(트위터) 웹 인텐트 URL. 다음 주자 모집 릴레이 톤. */
export function buildTweetIntent({
  projectId,
  title,
  creatorName,
  locale,
  justAdded = false,
}: TweetOpts): string {
  const url = buildShareUrl(`/stems/${projectId}`, 'twitter', 'challenge', projectId);
  const tags = HASHTAGS[locale].map((h) => `#${h}`).join(' ');

  // 창작자 크레딧은 카카오 경로("{name} 님이 시작한 릴레이")와 톤을 맞춘다.
  // 내가 이어붙인 직후(justAdded)엔 주어가 '나'라 크레딧을 넣지 않는다.
  const starter =
    creatorName && !justAdded ? (locale === 'ja' ? `${creatorName}さんが始めた` : `${creatorName} 님이 시작한`) : '';

  const text =
    locale === 'ja'
      ? justAdded
        ? `🎸「${title}」に8小節つなげた！\n次の走者、募集中👇 一緒に1曲を完成させよう\n${tags}`
        : `🎸${starter}「${title}」の8小節リレー、参加者募集中！\n録音でもテキストでもOK、次はキミの番👇\n${tags}`
      : justAdded
        ? `🎸「${title}」에 내 8마디 이어붙였다!\n다음 주자 구함 👇 같이 한 곡 완성하자\n${tags}`
        : `🎸${starter ? `${starter} ` : ''}「${title}」 8마디 릴레이, 다음 주자 구함!\n녹음이든 텍스트든 OK, 이번엔 네 차례 👇\n${tags}`;

  const intent = new URL('https://twitter.com/intent/tweet');
  intent.searchParams.set('text', text);
  intent.searchParams.set('url', url);
  return intent.toString();
}

/** LINE 공유 인텐트 URL(일본 필수 채널). */
export function buildLineIntent(projectId: string): string {
  const url = buildShareUrl(`/stems/${projectId}`, 'link', 'challenge', projectId);
  const share = new URL('https://social-plugins.line.me/lineit/share');
  share.searchParams.set('url', url);
  return share.toString();
}
