'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { getRecentStudioIds } from '@/lib/recentlyViewed';
import { getFavorites } from '@/lib/favorites';
import { supabase } from '@/lib/supabase';
import { track, type ReturnStripKind, type ReturnStripPlacement } from '@/lib/analytics';
import { formatVoteDate, getCreatorToken, getMyVoteIds, getVote, getVoterKey, type Vote } from '@/lib/votes';
import { Studio } from '@/types/studio';
import StudioMiniCard from '@/app/my-bookings/_components/StudioMiniCard';
import { kstToday } from '@/lib/ear/daily';
import { currentStreak, hasPlayed, isDone, loadRecord } from '@/lib/ear/streak';

const MAX_ITEMS = 6;
/** 투표는 하나씩 RPC로 읽으므로 최근 것만 */
const MAX_VOTES = 5;

const LABEL: Record<ReturnStripKind, string> = {
  vote: '진행 중인 투표',
  ear: '오늘의 음감',
  recent: '최근 본 연습실',
  favorite: '찜한 연습실',
};

const ICON: Record<ReturnStripKind, string> = { vote: '🗳️', ear: '🎧', recent: '👀', favorite: '❤️' };

/** 음감을 푼 적 있고 오늘 문제는 아직이면 [연속 기록] 1개, 아니면 빈 목록 */
function earCard(): number[] {
  const record = loadRecord();
  const today = kstToday(new Date());
  if (!hasPlayed(record) || isDone(record.days[today])) return [];
  return [currentStreak(record, today)];
}

/** 진행 중(마감·결정 전, 다음 투표로 넘어가지 않은) 내 투표 */
async function fetchOpenVotes(): Promise<Vote[]> {
  const ids = getMyVoteIds().slice(0, MAX_VOTES);
  if (ids.length === 0) return [];
  const voterKey = getVoterKey();
  const results = await Promise.all(
    ids.map((id) =>
      getVote(id, voterKey, getCreatorToken(id)).catch((e) => {
        console.error('[ReturnStrip] 투표 조회 실패', id, e);
        return null;
      }),
    ),
  );
  return results.filter((v): v is Vote => !!v && !v.is_expired && !v.decided_studio_id && !v.next_vote_id);
}

interface Props {
  /** 어디에 붙었나(이벤트 구분). 홈·검색은 상단 전체 폭, 지역·상세는 본문 카드 사이 */
  placement: ReturnStripPlacement;
  /** 상세에서는 지금 보는 연습실을 뺀다 */
  excludeId?: string;
}

/**
 * 홈·검색·지역·상세의 "진행 중인 투표 / 최근 본 / 찜한 연습실" 가로 스트립. 다시 온 사람이 클릭 없이 이어 보게 한다.
 * 목록이 비면 아무것도 그리지 않는다. 비공개로 바뀐 연습실은 조회에서 빠진다(눌러도 갈 곳이 없으므로).
 */
export default function ReturnStrip({ placement, excludeId }: Props) {
  const [lists, setLists] = useState<{ vote: Vote[]; ear: number[]; recent: Studio[]; favorite: Studio[] } | null>(null);
  const [studioMap, setStudioMap] = useState<Map<string, Studio>>(new Map());
  const [kind, setKind] = useState<ReturnStripKind>('recent');
  const viewed = useRef(new Set<ReturnStripKind>());

  useEffect(() => {
    let alive = true;
    (async () => {
      const recentIds = getRecentStudioIds().slice(0, MAX_ITEMS);
      // 찜은 추가한 순서로 쌓이므로 최근 것부터
      const favoriteIds = getFavorites().slice().reverse().slice(0, MAX_ITEMS);
      const votes = await fetchOpenVotes();
      // 투표 카드에는 첫 후보 이름을 보여 준다
      const ids = Array.from(new Set([...recentIds, ...favoriteIds, ...votes.map((v) => v.studio_ids[0])]));

      let map = new Map<string, Studio>();
      if (ids.length > 0) {
        const { data, error } = await supabase.from('studios').select('*').in('id', ids).eq('is_published', true);
        if (error) console.error('[ReturnStrip] 연습실 조회 실패', error.message);
        map = new Map(((data ?? []) as Studio[]).map((s) => [s.id, s]));
      }
      if (!alive) return;
      const pick = (list: string[]) =>
        list.filter((id) => id !== excludeId).map((id) => map.get(id)).filter(Boolean) as Studio[];
      const next = { vote: votes, ear: earCard(), recent: pick(recentIds), favorite: pick(favoriteIds) };
      setStudioMap(map);
      setLists(next);
      // 진행 중인 투표 → 오늘 안 푼 음감 → 최근 본 순으로 할 일이 분명하다
      setKind(next.vote.length > 0 ? 'vote' : next.ear.length > 0 ? 'ear' : next.recent.length > 0 ? 'recent' : 'favorite');
    })();
    return () => {
      alive = false;
    };
  }, [excludeId]);

  const count = lists ? lists[kind].length : 0;

  useEffect(() => {
    if (count === 0 || viewed.current.has(kind)) return;
    viewed.current.add(kind);
    track('return_strip_view', { count, kind, placement });
  }, [kind, count, placement]);

  if (!lists) return null;
  const kinds = (['vote', 'ear', 'recent', 'favorite'] as const).filter((k) => lists[k].length > 0);
  if (kinds.length === 0) return null;

  return (
    <section
      className={
        placement === 'home' || placement === 'search'
          ? 'relative z-10 px-4 pt-4 max-w-5xl mx-auto w-full'
          : placement === 'region'
            ? 'w-full mb-6'
            : 'w-full' // 상세: 카드 사이 간격은 부모(space-y)가 준다
      }
    >
      <div
        className="bg-white rounded-[20px] border-[3px] border-[#0A0A0A] pt-4 pb-2"
        style={{ boxShadow: '4px 4px 0 #0A0A0A' }}
      >
        <div className="flex items-center gap-2 px-4 mb-2 overflow-x-auto" style={{ fontFamily: 'Pretendard, sans-serif' }}>
          {kinds.length > 1 ? (
            kinds.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                aria-pressed={kind === k}
                className={`flex-shrink-0 px-3 py-1 rounded-[10px] border-[2px] border-[#0A0A0A] text-[13px] font-bold ${
                  kind === k ? 'bg-[#F5FF4F] text-[#0A0A0A]' : 'bg-white text-[#0A0A0A]/60'
                }`}
                style={kind === k ? { boxShadow: '2px 2px 0 #0A0A0A' } : undefined}
              >
                {ICON[k]} {LABEL[k]} {lists[k].length}
              </button>
            ))
          ) : (
            <h2 className="text-[15px] font-bold text-[#0A0A0A]">
              {ICON[kind]} {LABEL[kind]}
            </h2>
          )}
        </div>
        <div className="flex gap-3 overflow-x-auto px-4 pt-1 pb-3">
          {kind === 'ear'
            ? lists.ear.map((streak) => (
                <Link
                  key="ear"
                  href="/ear"
                  onClick={() => {
                    track('return_strip_click', { kind: 'ear', placement });
                    track('ear_entry_click', { from: 'strip' });
                  }}
                  className="w-[200px] flex-shrink-0 bg-[#FFF8F0] rounded-[16px] border-[3px] border-[#0A0A0A] p-3"
                  style={{ boxShadow: '4px 4px 0 #0A0A0A', fontFamily: 'Pretendard, sans-serif' }}
                >
                  <p className="text-[12px] font-bold text-[#FF3D77]">🎧 매일 5문제</p>
                  <p className="mt-1 text-[14px] font-bold text-[#0A0A0A] break-keep">
                    오늘의 음감 · {streak > 0 ? `🔥${streak}일째 이어가기` : '다시 시작하기'}
                  </p>
                  <p className="mt-2 text-[12px] font-bold text-[#0A0A0A]">오늘 문제 풀기 →</p>
                </Link>
              ))
            : kind === 'vote'
            ? lists.vote.map((vote) => {
                const first = studioMap.get(vote.studio_ids[0]);
                return (
                  <Link
                    key={vote.id}
                    href={`/vote/${vote.id}`}
                    onClick={() => track('return_strip_click', { kind: 'vote', vote_id: vote.id, placement })}
                    className="w-[200px] flex-shrink-0 bg-[#FFF8F0] rounded-[16px] border-[3px] border-[#0A0A0A] p-3"
                    style={{ boxShadow: '4px 4px 0 #0A0A0A', fontFamily: 'Pretendard, sans-serif' }}
                  >
                    <p className="text-[12px] font-bold text-[#FF3D77]">🗳️ 다음 합주 투표</p>
                    <p className="mt-1 text-[14px] font-bold text-[#0A0A0A] line-clamp-1">{first?.name ?? '합주 후보'}</p>
                    <p className="mt-1 text-[12px] text-[#0A0A0A]/60">
                      후보 {vote.studio_ids.length}곳 · {vote.responses.length}명 참여 · {formatVoteDate(vote.expires_at.slice(0, 10))}까지
                    </p>
                    <p className="mt-2 text-[12px] font-bold text-[#0A0A0A]">
                      {vote.responses.some((r) => r.is_mine) ? '결과 보기 →' : '투표하러 가기 →'}
                    </p>
                  </Link>
                );
              })
            : lists[kind].map((studio, i) => (
                <div
                  key={studio.id}
                  className="w-[148px] flex-shrink-0"
                  onClickCapture={() => track('return_strip_click', { kind, studio_id: studio.id, placement })}
                >
                  <StudioMiniCard studio={studio} index={i} />
                </div>
              ))}
        </div>
      </div>
    </section>
  );
}
