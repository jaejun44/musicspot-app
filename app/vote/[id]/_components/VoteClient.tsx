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
  VOTE_SLOTS,
  decideVote,
  formatVoteDate,
  getCreatorToken,
  getVote,
  getVoterKey,
  rememberMyVote,
  submitVoteResponse,
  tallyVote,
  type SubmitResult,
  type Vote,
  type VoteSlot,
} from '@/lib/votes';
import type { Studio } from '@/types/studio';
import VoteShare from './VoteShare';
import VoteSaveToBand from './VoteSaveToBand';
import VoteCreatePanel from '@/app/room/[id]/_components/VoteCreatePanel';

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
  const viewed = useRef(false);

  const load = useCallback(async () => {
    if (!UUID_RE.test(voteId)) {
      setVote(null);
      return;
    }
    try {
      const v = await getVote(voteId, getVoterKey(), getCreatorToken(voteId));
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

      {/* 다음 합주도 같은 후보로 — 새 투표를 이 투표에 잇는다(단톡방의 이 링크가 다음 방문의 입구) */}
      {closed && !vote.next_vote_id && (
        <div className={card} style={cardShadow}>
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
        <VoteShare
          voteId={vote.id}
          count={vote.studio_ids.length}
          studioNames={vote.studio_ids.map((id) => studios.get(id)?.name).filter(Boolean) as string[]}
        />
      )}

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

      {closed && notice && (
        <p role="alert" className="text-[13px] font-bold text-[#FF3D77]">{notice.text}</p>
      )}
    </main>
  );
}
