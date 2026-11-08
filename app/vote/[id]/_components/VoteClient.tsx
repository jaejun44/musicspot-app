'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { track } from '@/lib/analytics';
import { SR_MASK_CLASS } from '@/lib/amplitude';
import { getClientCountry } from '@/lib/geo';
import { studioPriceLabel } from '@/lib/studio-price';
import {
  SLOT_START_TIME,
  VOTE_SLOTS,
  decideVote,
  formatVoteDate,
  getCreatorToken,
  getVote,
  getVoterKey,
  parseAdminHash,
  rememberMyVote,
  saveCreatorToken,
  submitVoteResponse,
  tallyVote,
  topKey,
  type SubmitResult,
  type Vote,
  type VoteSlot,
} from '@/lib/votes';
import type { Studio } from '@/types/studio';
import VoteShare from './VoteShare';
import VoteAdminLink from './VoteAdminLink';
import VoteSaveToBand from './VoteSaveToBand';
import VoteCreatePanel from '@/app/room/[id]/_components/VoteCreatePanel';
import AddToCalendar from '@/components/AddToCalendar';
import SplitSheet from '@/app/split/_components/SplitSheet';
import PushOptIn from '@/components/PushOptIn';
import { calendarDescription, type CalendarEvent } from '@/lib/calendar';
import { buildShareUrl } from '@/lib/share-utm';

type VoteStudio = Pick<Studio, 'id' | 'name' | 'photos' | 'price_info' | 'price_per_hour' | 'has_drum' | 'address' | 'is_published'>;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SUBMIT_MESSAGE: Record<Exclude<SubmitResult, 'saved'>, string> = {
  not_found: '투표를 찾을 수 없어요.',
  expired: '투표 기간이 끝났어요.',
  decided: '이미 연습실이 정해졌어요.',
  full: '이 투표는 50명까지만 참여할 수 있어요.',
  invalid: '닉네임을 1~20자로 적어 주세요.',
};

const card = 'bg-white rounded-[20px] border-[3px] border-[#0A0A0A] p-5';
const cardShadow = { boxShadow: '6px 6px 0 #0A0A0A' };

/**
 * 관리 링크(#k=)로 들어온 토큰. page.tsx 인라인 스크립트가 HTML 파싱 중 window에 꺼내 두고 해시를 지운다.
 * 클라이언트 이동처럼 그 스크립트가 안 돈 경우를 위해 여기서도 해시를 읽고 지운다.
 */
function takeAdminToken(): string | null {
  const w = window as Window & { __msVoteAdminToken?: string };
  const fromScript = w.__msVoteAdminToken ?? null;
  delete w.__msVoteAdminToken;
  const fromHash = parseAdminHash(window.location.hash);
  if (fromHash) window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search);
  return fromScript ?? fromHash;
}

function toggleIn<T>(list: T[], v: T): T[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

export default function VoteClient({ voteId }: { voteId: string }) {
  const router = useRouter();
  const [vote, setVote] = useState<Vote | null | undefined>(undefined);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [studios, setStudios] = useState<Map<string, VoteStudio>>(new Map());
  const [nickname, setNickname] = useState('');
  const [pickStudios, setPickStudios] = useState<string[]>([]);
  const [pickDates, setPickDates] = useState<string[]>([]);
  const [pickSlots, setPickSlots] = useState<VoteSlot[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [showNext, setShowNext] = useState(false);
  // 캘린더 메모의 "다음 합주 정하기" 링크(?next=1)로 들어오면 그 카드를 펼쳐 보여 준다
  const nextRef = useRef<HTMLDivElement>(null);
  const nextHandled = useRef(false);
  const [scrollToNext, setScrollToNext] = useState(false);
  const viewed = useRef(false);
  /** undefined = 아직 안 읽음, null = 관리 링크 아님(또는 처리 끝) */
  const adminToken = useRef<string | null | undefined>(undefined);
  const adminOpenTracked = useRef(false);
  // "멤버한테 물어보기"로 막 만든 투표(?new=1): 공유 카드로 스크롤하고 한 번 강조
  const shareRef = useRef<HTMLDivElement>(null);
  const newHandled = useRef(false);
  const [highlightShare, setHighlightShare] = useState(false);

  const load = useCallback(async () => {
    if (!UUID_RE.test(voteId)) {
      setVote(null);
      return;
    }
    try {
      if (adminToken.current === undefined) adminToken.current = takeAdminToken();
      const pending = adminToken.current;
      const voterKey = getVoterKey();
      let v = await getVote(voteId, voterKey, pending ?? getCreatorToken(voteId));
      if (pending) {
        // 맞는 토큰만 이 기기에 저장. 틀리면 저장하지 않고 멤버 화면 그대로(이미 가진 토큰이 있으면 그것으로)
        const valid = !!v?.is_creator;
        if (valid) {
          saveCreatorToken(voteId, pending);
        } else {
          const prev = getCreatorToken(voteId);
          if (v && prev && prev !== pending) v = await getVote(voteId, voterKey, prev);
        }
        if (v && !adminOpenTracked.current) {
          adminOpenTracked.current = true;
          track('vote_admin_link_open', { vote_id: voteId, valid });
        }
        adminToken.current = null;
      }
      setVote(v);
      if (!v) return;
      const { data, error } = await supabase
        .from('studios')
        .select('id, name, photos, price_info, price_per_hour, has_drum, address, is_published')
        .in('id', v.studio_ids);
      if (error) console.error('[VoteClient] 후보 연습실 조회 실패', error.message);
      setStudios(new Map(((data ?? []) as VoteStudio[]).map((s) => [s.id, s])));
    } catch (e) {
      console.error('[VoteClient] 투표 조회 실패', e);
      setLoadError(e instanceof Error ? e.message : '투표를 불러오지 못했어요.');
    }
  }, [voteId]);

  useEffect(() => {
    load();
  }, [load]);

  // 첫 로드: 열람 이벤트 + 내가 낸 표로 폼 채우기
  useEffect(() => {
    if (!vote || viewed.current) return;
    viewed.current = true;
    track('vote_view', { vote_id: vote.id, is_creator: vote.is_creator });
    const mine = vote.responses.find((r) => r.is_mine);
    if (mine) {
      setNickname(mine.nickname);
      setPickStudios(mine.picked_studio_ids);
      setPickDates(mine.picked_dates);
      setPickSlots(mine.picked_slots);
    }
  }, [vote]);

  useEffect(() => {
    if (!vote?.is_creator || newHandled.current) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('new') !== '1') return;
    newHandled.current = true;
    // 새로고침·재방문 때 다시 강조되지 않게 지운다
    params.delete('new');
    const qs = params.toString();
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`);
    requestAnimationFrame(() => shareRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
    setHighlightShare(true);
  }, [vote]);

  useEffect(() => {
    if (!vote || nextHandled.current) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('next') !== '1') return;
    nextHandled.current = true;
    params.delete('next');
    const qs = params.toString();
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`);
    // 이미 다음 투표가 있으면 맨 위 "다음 투표로" 안내가 보인다
    if (vote.next_vote_id || !(vote.is_expired || vote.decided_studio_id)) return;
    setShowNext(true);
    setScrollToNext(true);
  }, [vote]);

  // 펼친 패널·연습실 사진이 자리를 잡은 뒤 스크롤(투표가 다시 불러와져도 취소되지 않게 별도 상태로)
  useEffect(() => {
    if (!scrollToNext) return;
    const t = setTimeout(() => {
      nextRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setScrollToNext(false);
    }, 600);
    return () => clearTimeout(t);
  }, [scrollToNext]);

  // 투표가 다시 불러와져도(vote 갱신) 강조는 정해진 시간 뒤 꺼진다
  useEffect(() => {
    if (!highlightShare) return;
    const t = setTimeout(() => setHighlightShare(false), 2400);
    return () => clearTimeout(t);
  }, [highlightShare]);

  async function handleSubmit() {
    if (!vote) return;
    const voterKey = getVoterKey();
    if (!voterKey) {
      setNotice({ kind: 'error', text: '이 브라우저는 저장소가 막혀 있어 투표할 수 없어요. 일반 창에서 열어 주세요.' });
      return;
    }
    const isUpdate = vote.responses.some((r) => r.is_mine);
    setBusy(true);
    setNotice(null);
    try {
      const result = await submitVoteResponse({
        voteId: vote.id,
        voterKey,
        nickname,
        studioIds: pickStudios,
        dates: pickDates,
        slots: pickSlots,
        country: getClientCountry() ?? 'KR',
      });
      if (result === 'saved') {
        track('vote_submit', { vote_id: vote.id, is_update: isUpdate });
        rememberMyVote(vote.id);
        setNotice({ kind: 'ok', text: isUpdate ? '투표를 고쳤어요.' : '투표했어요! 결과는 아래에서 같이 봐요.' });
        await load();
      } else {
        setNotice({ kind: 'error', text: SUBMIT_MESSAGE[result] ?? '투표를 저장하지 못했어요.' });
      }
    } catch (e) {
      console.error('[VoteClient] 투표 저장 실패', e);
      setNotice({ kind: 'error', text: e instanceof Error ? e.message : '투표를 저장하지 못했어요.' });
    } finally {
      setBusy(false);
    }
  }

  async function handleDecide(studioId: string) {
    if (!vote) return;
    const token = getCreatorToken(vote.id);
    if (!token) return;
    setBusy(true);
    try {
      const result = await decideVote(vote.id, token, studioId);
      if (result !== 'decided') {
        setNotice({ kind: 'error', text: '정하지 못했어요. 이 투표를 만든 기기에서만 정할 수 있어요.' });
        setBusy(false);
        return;
      }
      track('vote_decide', { vote_id: vote.id, studio_id: studioId });
      router.push(`/room/${studioId}`);
    } catch (e) {
      console.error('[VoteClient] 결정 저장 실패', e);
      setNotice({ kind: 'error', text: e instanceof Error ? e.message : '정하지 못했어요.' });
      setBusy(false);
    }
  }

  /* ── 로딩 / 없음 / 오류 ── */
  if (loadError) {
    return (
      <main className="min-h-screen bg-comic-cream px-4 py-8 max-w-2xl mx-auto">
        <div role="alert" className={card} style={cardShadow}>
          <p className="text-[15px] font-bold">{loadError}</p>
          <button
            type="button"
            onClick={() => { setLoadError(null); load(); }}
            className="mt-3 px-4 py-2 bg-[#F5FF4F] border-[3px] border-[#0A0A0A] rounded-[12px] font-bold"
          >
            다시 시도
          </button>
        </div>
      </main>
    );
  }
  if (vote === undefined) {
    return (
      <main className="min-h-screen bg-comic-cream flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-[3px] border-[#FF3D77] border-t-transparent animate-spin" />
      </main>
    );
  }
  if (vote === null) {
    return (
      <main className="min-h-screen bg-comic-cream px-4 py-8 max-w-2xl mx-auto">
        <div className={card} style={cardShadow}>
          <h1 className="text-[18px] font-bold text-[#0A0A0A]">투표를 찾을 수 없어요</h1>
          <p className="mt-1 text-[14px] text-[#0A0A0A]/60">링크가 잘못됐거나 지워진 투표예요.</p>
          <Link
            href="/search"
            className="inline-block mt-4 px-4 py-2 bg-comic-blue rounded-[12px] border-[2px] border-comic-black text-[14px] font-bold"
            style={{ boxShadow: '3px 3px 0 #0A0A0A' }}
          >
            연습실 찾아보기
          </Link>
        </div>
      </main>
    );
  }

  const tally = tallyVote(vote);
  const decided = vote.decided_studio_id ? studios.get(vote.decided_studio_id) : null;
  const closed = vote.is_expired || !!vote.decided_studio_id;
  // 캘린더: 표가 가장 많은 날짜·시간대(밴드 일정 저장과 같은 기준). 둘 중 하나라도 없으면 안내만
  const topDate = topKey(tally.dates, vote.date_options);
  const topSlot = topKey(tally.slots, VOTE_SLOTS.map((s) => s.key)) as VoteSlot | null;
  const calendarEvent: CalendarEvent | null =
    decided && topDate && topSlot
      ? {
          uid: `vote-${vote.id}`,
          title: `합주 · ${decided.name}`,
          location: decided.address ?? decided.name,
          date: topDate,
          startTime: SLOT_START_TIME[topSlot],
          // 관리 토큰(#k=)은 절대 넣지 않는다 — 멤버용 링크만
          description: calendarDescription([
            { label: '🗳️ 투표 결과', url: buildShareUrl(`/vote/${vote.id}`, 'calendar', 'vote') },
            { label: '🔁 다음 합주 정하기', url: buildShareUrl(`/vote/${vote.id}?next=1`, 'calendar', 'vote') },
          ]),
        }
      : null;
  const voterCount = vote.responses.length;
  const nicknamesFor = (studioId: string) =>
    vote.responses.filter((r) => r.picked_studio_ids.includes(studioId)).map((r) => r.nickname);

  return (
    <main
      className="min-h-screen px-4 py-6 max-w-2xl mx-auto space-y-5"
      style={{ fontFamily: 'Pretendard, sans-serif' }}
    >
      {/* 이어진 새 투표 안내 — 단톡방의 옛 링크로 들어온 사람 */}
      {vote.next_vote_id && (
        <Link
          href={`/vote/${vote.next_vote_id}`}
          className="flex items-center justify-between gap-2 bg-comic-blue rounded-[16px] border-[3px] border-comic-black px-5 py-3 text-[14px] font-bold"
          style={{ boxShadow: '4px 4px 0 #0A0A0A' }}
        >
          <span>🆕 다음 합주 투표가 새로 열렸어요</span>
          <span aria-hidden>→</span>
        </Link>
      )}

      <header className={card} style={cardShadow}>
        <p className="text-[12px] font-bold text-[#0A0A0A]/50">🗳️ 합주 후보 투표</p>
        <h1 className="mt-1 text-[22px] text-[#0A0A0A] break-keep" style={{ fontWeight: 900 }}>
          다음 합주 어디서?
        </h1>
        <p className="mt-1 text-[13px] text-[#0A0A0A]/60">
          후보 {vote.studio_ids.length}곳 · {voterCount}명 참여
          {vote.is_expired ? ' · 마감됨' : ` · ${formatVoteDate(vote.expires_at.slice(0, 10))}까지`}
        </p>
      </header>

      {/* 결정됨 */}
      {decided && (
        <div className="bg-[#41C66B] rounded-[20px] border-[3px] border-[#0A0A0A] p-5" style={cardShadow}>
          <p className="text-[13px] font-bold text-white">✅ 여기로 정했어요</p>
          <p className="mt-1 text-[20px] text-white break-keep" style={{ fontWeight: 900 }}>{decided.name}</p>
          <Link
            href={`/room/${decided.id}`}
            onClick={() => track('vote_to_contact', { vote_id: vote.id, studio_id: decided.id })}
            className="mt-3 flex items-center justify-center gap-2 w-full py-3 bg-white rounded-[14px] border-[2px] border-[#0A0A0A] text-[15px] font-bold text-[#0A0A0A]"
            style={{ boxShadow: '3px 3px 0 #0A0A0A' }}
          >
            문의·예약하러 가기 →
          </Link>
        </div>
      )}

      {decided && <VoteSaveToBand vote={vote} tally={tally} studio={decided} />}

      {/* 결정된 곳 → 내 캘린더(하루 전 알림 + 메모의 링크가 다음 방문 입구). 멤버·만든 사람 모두 */}
      {decided && (
        <section className={card} style={cardShadow}>
          <p className="text-[15px] font-bold text-[#0A0A0A]">📅 내 캘린더에 넣기</p>
          <p className="text-[12px] text-[#0A0A0A]/50 mt-0.5 mb-3 break-keep">
            하루 전에 알림이 와요. 메모의 링크로 결과를 다시 보고 다음 합주도 정할 수 있어요.
          </p>
          <AddToCalendar event={calendarEvent} from="vote" />
        </section>
      )}

      {/* 합주비 N빵 → 정산 링크(단톡방). 정산 화면의 "다음 합주 정하기"가 이 투표에 잇는다 */}
      {decided && <SplitSheet variant="wide" from="vote" studio={decided} voteId={vote.id} playedOn={topDate} />}

      {/* 다음 합주도 같은 후보로 — 새 투표를 이 투표에 잇는다(단톡방의 이 링크가 다음 방문의 입구) */}
      {closed && !vote.next_vote_id && (
        <div ref={nextRef} className={card} style={cardShadow}>
          {showNext ? (
            <>
              <p className="text-[15px] font-bold text-[#0A0A0A]">🔁 다음 합주도 여기서 정하기</p>
              <VoteCreatePanel
                studioIds={vote.studio_ids.filter((id) => studios.get(id)?.is_published)}
                parentVoteId={vote.id}
              />
            </>
          ) : (
            <button
              type="button"
              onClick={() => setShowNext(true)}
              className="w-full flex items-center justify-between gap-2 text-left"
            >
              <span>
                <span className="block text-[15px] font-bold text-[#0A0A0A]">🔁 다음 합주도 여기서 정하기</span>
                <span className="block text-[12px] text-[#0A0A0A]/50 mt-0.5">같은 후보로 새 투표를 열어요</span>
              </span>
              <span aria-hidden className="text-[18px] font-bold">→</span>
            </button>
          )}
        </div>
      )}

      {vote.is_creator && !closed && (
        <motion.div
          ref={shareRef}
          animate={highlightShare ? { scale: [1, 1.03, 1] } : { scale: 1 }}
          transition={{ duration: 0.6 }}
          className={`rounded-[20px] transition-[outline-color] duration-500 outline outline-[3px] outline-offset-4 ${
            highlightShare ? 'outline-[#FF3D77]' : 'outline-transparent'
          }`}
        >
          <VoteShare
            voteId={vote.id}
            count={vote.studio_ids.length}
            studioNames={vote.studio_ids.map((id) => studios.get(id)?.name).filter(Boolean) as string[]}
          />
        </motion.div>
      )}

      {/* 웹 푸시: 만든 사람 = 멤버 응답 알림 (지원 안 하는 브라우저에선 안 보임) */}
      {vote.is_creator && !closed && (
        <PushOptIn kind="vote" targetId={vote.id} where="vote_creator" creatorToken={getCreatorToken(vote.id)} />
      )}

      {/* 만든 사람에게만 — 결정 후에도(다음 투표를 이어 가려면 필요) */}
      {vote.is_creator && <VoteAdminLink voteId={vote.id} />}

      {/* 후보 연습실 */}
      <section className={card} style={cardShadow}>
        <h2 className="text-[15px] font-bold text-[#0A0A0A] mb-3">
          🏠 연습실 {closed ? '결과' : '고르기 (여러 곳 가능)'}
        </h2>
        <ul className="space-y-2">
          {vote.studio_ids.map((id) => {
            const s = studios.get(id);
            const on = pickStudios.includes(id);
            const n = tally.studios[id] ?? 0;
            const names = nicknamesFor(id);
            const isLeader = tally.leaders.includes(id);
            return (
              <li
                key={id}
                className={`rounded-[14px] border-[2px] border-[#0A0A0A] p-2 ${on ? 'bg-[#F5FF4F]/40' : 'bg-[#FFF8F0]'}`}
              >
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={closed}
                    onClick={() => setPickStudios((p) => toggleIn(p, id))}
                    aria-pressed={on}
                    className="flex items-center gap-3 flex-1 min-w-0 text-left disabled:cursor-default"
                  >
                    <span
                      className={`w-6 h-6 flex-shrink-0 rounded-[6px] border-[2px] border-[#0A0A0A] flex items-center justify-center text-[13px] font-bold ${
                        on ? 'bg-[#FF3D77] text-white' : 'bg-white'
                      } ${closed ? 'hidden' : ''}`}
                      aria-hidden
                    >
                      {on ? '✓' : ''}
                    </span>
                    <span className="relative w-14 h-14 flex-shrink-0 rounded-[10px] overflow-hidden border-[2px] border-[#0A0A0A] bg-[#0A0A0A]/5">
                      {s?.photos?.[0] ? (
                        <Image src={s.photos[0]} alt={s.name} fill className="object-cover" sizes="56px" />
                      ) : (
                        <span className="w-full h-full flex items-center justify-center text-[22px]">🎸</span>
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] font-bold text-[#0A0A0A] line-clamp-1">
                        {s?.name ?? '연습실 정보 없음'}
                        {s && !s.is_published && <span className="ml-1 text-[12px] text-[#0A0A0A]/50">(운영 종료)</span>}
                      </span>
                      {s && (
                        <span className="block text-[12px] font-bold text-[#FF3D77] line-clamp-1">
                          {studioPriceLabel(s)}
                          {s.has_drum && <span className="text-[#0A0A0A]/60"> · 🥁 드럼</span>}
                        </span>
                      )}
                    </span>
                  </button>
                  <span
                    className={`flex-shrink-0 min-w-[44px] text-center px-2 py-1 rounded-[10px] border-[2px] border-[#0A0A0A] text-[13px] font-bold ${
                      isLeader ? 'bg-[#FF3D77] text-white' : 'bg-white'
                    }`}
                  >
                    {n}표
                  </span>
                </div>
                {names.length > 0 && (
                  <p className={`mt-1.5 pl-1 text-[12px] text-[#0A0A0A]/60 break-keep ${SR_MASK_CLASS}`}>
                    {names.join(', ')}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap gap-2 pl-1">
                  <Link href={`/room/${id}`} className="text-[12px] font-bold text-[#0A0A0A]/60 underline underline-offset-2">
                    상세 보기
                  </Link>
                  {vote.is_creator && !vote.is_expired && s?.is_published && vote.decided_studio_id !== id && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleDecide(id)}
                      className="ml-auto px-3 py-1 rounded-[10px] border-[2px] border-[#0A0A0A] bg-[#41C66B] text-white text-[12px] font-bold disabled:opacity-60"
                      style={{ boxShadow: '2px 2px 0 #0A0A0A' }}
                    >
                      {vote.decided_studio_id ? '이 곳으로 바꾸기' : '이 곳으로 정하기'}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* 날짜 */}
      {vote.date_options.length > 0 && (
        <section className={card} style={cardShadow}>
          <h2 className="text-[15px] font-bold text-[#0A0A0A] mb-3">📅 되는 날짜</h2>
          <div className="flex flex-wrap gap-2">
            {vote.date_options.map((d) => {
              const on = pickDates.includes(d);
              return (
                <button
                  key={d}
                  type="button"
                  disabled={closed}
                  onClick={() => setPickDates((p) => toggleIn(p, d))}
                  aria-pressed={on}
                  className={`px-3 py-1.5 rounded-[10px] border-[2px] border-[#0A0A0A] text-[13px] font-bold disabled:cursor-default ${
                    on ? 'bg-[#F5FF4F]' : 'bg-white'
                  }`}
                >
                  {formatVoteDate(d)} <span className="text-[#0A0A0A]/50">{tally.dates[d] ?? 0}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* 시간대 */}
      <section className={card} style={cardShadow}>
        <h2 className="text-[15px] font-bold text-[#0A0A0A] mb-3">🕐 되는 시간대</h2>
        <div className="grid grid-cols-4 gap-2">
          {VOTE_SLOTS.map(({ key, label }) => {
            const on = pickSlots.includes(key);
            return (
              <button
                key={key}
                type="button"
                disabled={closed}
                onClick={() => setPickSlots((p) => toggleIn(p, key))}
                aria-pressed={on}
                className={`py-2 rounded-[10px] border-[2px] border-[#0A0A0A] text-[13px] font-bold disabled:cursor-default ${
                  on ? 'bg-[#F5FF4F]' : 'bg-white'
                }`}
              >
                {label} <span className="text-[#0A0A0A]/50">{tally.slots[key] ?? 0}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 제출 */}
      {!closed && (
        <section className={card} style={cardShadow}>
          <label htmlFor="vote-nickname" className="block text-[15px] font-bold text-[#0A0A0A] mb-2">
            ✍️ 내 이름 (단톡방에서 쓰는 이름)
          </label>
          <input
            id="vote-nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={20}
            placeholder="예: 기타 민수"
            className={`w-full px-4 py-3 rounded-[12px] border-[2px] border-[#0A0A0A] bg-white text-[15px] ${SR_MASK_CLASS}`}
          />
          {notice && (
            <p
              role={notice.kind === 'error' ? 'alert' : 'status'}
              className={`mt-2 text-[13px] font-bold ${notice.kind === 'error' ? 'text-[#FF3D77]' : 'text-[#41C66B]'}`}
            >
              {notice.text}
            </p>
          )}
          <motion.button
            type="button"
            onClick={handleSubmit}
            disabled={busy || nickname.trim().length === 0}
            whileTap={{ scale: 0.97, y: 1 }}
            className="mt-3 w-full py-3 bg-[#FF3D77] text-white rounded-[14px] border-[3px] border-[#0A0A0A] text-[15px] font-bold disabled:opacity-60"
            style={{ boxShadow: '4px 4px 0 #0A0A0A' }}
          >
            {busy ? '저장 중…' : vote.responses.some((r) => r.is_mine) ? '투표 고치기' : '투표하기'}
          </motion.button>
          <p className="mt-2 text-[12px] text-[#0A0A0A]/50 text-center">로그인 없이 투표해요. 이 기기에서 다시 열면 고칠 수 있어요.</p>
        </section>
      )}

      {/* 웹 푸시: 투표한 멤버 = 결정·전날 알림 */}
      {!vote.is_creator && !closed && vote.responses.some((r) => r.is_mine) && (
        <PushOptIn kind="vote" targetId={vote.id} where="vote_member" />
      )}

      {closed && notice && (
        <p role="alert" className="text-[13px] font-bold text-[#FF3D77]">{notice.text}</p>
      )}
    </main>
  );
}
