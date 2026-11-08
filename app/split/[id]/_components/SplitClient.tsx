'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { track } from '@/lib/analytics';
import { SR_MASK_CLASS } from '@/lib/amplitude';
import { getClientCountry } from '@/lib/geo';
import { buildShareUrl } from '@/lib/share-utm';
import { pickNearbyRooms } from '@/lib/nearby-rooms';
import { formatVoteDate, getVoterKey } from '@/lib/votes';
import { formatWon, getSplit, getSplitCreatorToken, toggleSplitPaid, type Split, type TogglePaidResult } from '@/lib/split';
import type { Studio } from '@/types/studio';
import VoteCreatePanel from '@/app/room/[id]/_components/VoteCreatePanel';

interface Props {
  splitId: string;
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.musicspotfest.com';
const NEXT_NEARBY = 2;

const TOGGLE_MESSAGE: Partial<Record<TogglePaidResult, string>> = {
  expired: '정산 기간(60일)이 지나 더 체크할 수 없어요.',
  full: '이 정산은 20명까지 체크할 수 있어요.',
  invalid: '이름을 1~20자로 적어 주세요.',
  not_found: '정산을 찾을 수 없어요.',
};

type SplitStudio = Pick<Studio, 'id' | 'name' | 'address' | 'lat' | 'lng' | 'room_type' | 'is_published'>;

/** 정산 연습실 근처 공개 연습실(다음 합주 후보). 상세 페이지 fetchNearbyRooms와 같은 상자 검색 */
async function fetchNearbyIds(studio: SplitStudio): Promise<string[]> {
  if (studio.lat == null || studio.lng == null) return [];
  const center = { lat: studio.lat, lng: studio.lng, room_type: studio.room_type ?? null };
  for (const box of [0.03, 0.1]) {
    const { data, error } = await supabase
      .from('studios')
      .select('*')
      .eq('is_published', true)
      .gte('lat', center.lat - box)
      .lte('lat', center.lat + box)
      .gte('lng', center.lng - box * 1.25)
      .lte('lng', center.lng + box * 1.25)
      .range(0, 999);
    if (error) {
      console.error('[SplitClient] 근처 연습실 조회 실패', error.message);
      return [];
    }
    const rooms = pickNearbyRooms(center, ((data ?? []) as Studio[]).filter((s) => s.id !== studio.id));
    if (rooms.length >= NEXT_NEARBY || box === 0.1) return rooms.slice(0, NEXT_NEARBY).map((r) => r.studio.id);
  }
  return [];
}

export default function SplitClient({ splitId }: Props) {
  const [split, setSplit] = useState<Split | null | undefined>(undefined);
  const [studio, setStudio] = useState<SplitStudio | null>(null);
  const [nearbyIds, setNearbyIds] = useState<string[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [nickname, setNickname] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const viewed = useRef(false);

  const load = useCallback(async () => {
    try {
      const s = await getSplit(splitId, getVoterKey(), getSplitCreatorToken(splitId));
      setSplit(s);
      if (s?.studio_id) {
        const { data, error } = await supabase
          .from('studios')
          .select('id, name, address, lat, lng, room_type, is_published')
          .eq('id', s.studio_id)
          .maybeSingle();
        if (error) console.error('[SplitClient] 연습실 조회 실패', error.message);
        setStudio((data as SplitStudio | null) ?? null);
      }
    } catch (e) {
      console.error('[SplitClient] 정산 조회 실패', e);
      setLoadError(e instanceof Error ? e.message : '정산을 불러오지 못했어요.');
    }
  }, [splitId]);

  useEffect(() => {
    load();
  }, [load]);

  // 첫 로드: 열람 이벤트 + 내가 적은 이름 채우기
  useEffect(() => {
    if (!split || viewed.current) return;
    viewed.current = true;
    track('split_view', { is_creator: split.is_creator });
    const mine = split.payers.find((p) => p.is_mine);
    if (mine) setNickname(mine.nickname);
  }, [split]);

  useEffect(() => {
    if (!studio) return;
    let alive = true;
    fetchNearbyIds(studio).then((ids) => alive && setNearbyIds(ids));
    return () => {
      alive = false;
    };
  }, [studio]);

  async function handleToggle(paid: boolean) {
    if (!split) return;
    const key = getVoterKey();
    if (!key) {
      setNotice('이 브라우저는 저장소가 막혀 있어 체크할 수 없어요. 일반 창에서 열어 주세요.');
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const result = await toggleSplitPaid({
        splitId: split.id,
        payerKey: key,
        nickname: nickname.trim(),
        paid,
        country: getClientCountry() ?? 'KR',
      });
      if (result === 'saved') {
        track('split_paid_toggle', { on: paid });
        await load();
      } else {
        setNotice(TOGGLE_MESSAGE[result] ?? '저장하지 못했어요.');
      }
    } catch (e) {
      console.error('[SplitClient] 냈어요 저장 실패', e);
      setNotice(e instanceof Error ? e.message : '저장하지 못했어요.');
    } finally {
      setBusy(false);
    }
  }

  function shareKakao() {
    if (!split) return;
    const url = buildShareUrl(`/split/${split.id}`, 'kakao', 'split', split.id);
    if (!window.Kakao?.isInitialized()) {
      console.warn('[SplitClient] 카카오 SDK 미초기화 — 링크 복사로 대신');
      void copyLink();
      return;
    }
    try {
      window.Kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
          title: `합주비 1인당 ${formatWon(split.per_person)}`,
          description: `${studio?.name ?? '이번 합주'} · 총 ${formatWon(split.total)} ÷ ${split.people}명. 냈으면 "냈어요"를 눌러 주세요`,
          imageUrl: `${SITE_URL}/opengraph-image`,
          link: { mobileWebUrl: url, webUrl: url },
        },
        buttons: [{ title: '냈어요 체크하기', link: { mobileWebUrl: url, webUrl: url } }],
      });
      track('split_share', { channel: 'kakao' });
    } catch (e) {
      console.error('[SplitClient] 카카오 공유 실패 — 링크 복사로 대신', e);
      void copyLink();
    }
  }

  async function copyLink() {
    if (!split) return;
    const url = buildShareUrl(`/split/${split.id}`, 'link', 'split', split.id);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      track('split_share', { channel: 'copy' });
    } catch (e) {
      console.error('[SplitClient] 링크 복사 실패', e);
    }
  }

  const card = 'bg-white rounded-[20px] border-[3px] border-[#0A0A0A] p-5';
  const cardShadow = { boxShadow: '6px 6px 0 #0A0A0A', fontFamily: 'Pretendard, sans-serif' };

  /* ── 로딩 / 없음 / 오류 ── */
  if (loadError) {
    return (
      <main className="min-h-screen bg-comic-cream px-4 py-8 max-w-2xl mx-auto">
        <div role="alert" className={card} style={cardShadow}>
          <p className="text-[15px] font-bold">{loadError}</p>
          <button
            type="button"
            onClick={() => {
              setLoadError(null);
              load();
            }}
            className="mt-3 px-4 py-2 bg-[#F5FF4F] border-[3px] border-[#0A0A0A] rounded-[12px] font-bold"
          >
            다시 시도
          </button>
        </div>
      </main>
    );
  }
  if (split === undefined) {
    return (
      <main className="min-h-screen bg-comic-cream flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-[3px] border-[#FF3D77] border-t-transparent animate-spin" />
      </main>
    );
  }
  if (split === null) {
    return (
      <main className="min-h-screen bg-comic-cream px-4 py-8 max-w-2xl mx-auto">
        <div className={card} style={cardShadow}>
          <h1 className="text-[18px] font-bold text-[#0A0A0A]">정산을 찾을 수 없어요</h1>
          <p className="mt-1 text-[14px] text-[#0A0A0A]/60">링크가 잘못됐거나 지워진 정산이에요.</p>
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

  const mine = split.payers.find((p) => p.is_mine);
  const paidCount = split.payers.filter((p) => p.paid).length;
  const nextIds = studio?.is_published ? [studio.id, ...nearbyIds] : nearbyIds;

  return (
    <main className="min-h-screen bg-comic-cream px-4 py-8 max-w-2xl mx-auto space-y-5" style={{ fontFamily: 'Pretendard, sans-serif' }}>
      {/* 합주 정보 + 금액 */}
      <header className={card} style={cardShadow}>
        <p className="text-[13px] font-bold text-[#FF3D77]">💸 합주비 정산</p>
        <h1 className="mt-1 text-[18px] font-bold text-[#0A0A0A] break-keep">
          {studio?.name ?? '이번 합주'}
          {split.played_on && <span className="ml-1 text-[14px] text-[#0A0A0A]/50">· {formatVoteDate(split.played_on)}</span>}
        </h1>
        <div className="mt-4 rounded-[16px] border-[3px] border-[#0A0A0A] bg-[#F5FF4F] p-4 text-center" style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>
          <p className="text-[12px] font-bold text-[#0A0A0A]/60">1인당</p>
          <p className="mt-1 text-[32px] text-[#0A0A0A]" style={{ fontWeight: 900 }}>
            {formatWon(split.per_person)}
          </p>
          <p className="text-[12px] font-bold text-[#0A0A0A]/60">
            총 {formatWon(split.total)} = 시간당 {formatWon(split.hourly_price)} × {split.hours}시간
            {split.extra > 0 && ` + 추가 ${formatWon(split.extra)}`} · {split.people}명
          </p>
        </div>
        <p className="mt-2 text-[12px] text-[#0A0A0A]/50 text-center">금액은 안내용이에요(100원 단위 올림). 실제 요금은 업체 기준.</p>
      </header>

      {/* 만든 사람: 단톡방에 올리기 */}
      {split.is_creator && !split.is_expired && (
        <div className={card} style={cardShadow}>
          <p className="text-[15px] font-bold text-[#0A0A0A]">📣 단톡방에 정산 링크를 올려 주세요</p>
          <p className="text-[12px] text-[#0A0A0A]/60 mt-0.5 mb-3">멤버는 로그인 없이 &quot;냈어요&quot;를 누르고, 누가 냈는지 여기서 같이 봐요.</p>
          <div className="flex gap-2">
            <motion.button
              type="button"
              onClick={shareKakao}
              whileTap={{ scale: 0.95, y: 1 }}
              className="flex-1 min-h-[44px] py-3 rounded-[14px] border-[2px] border-[#0A0A0A] bg-[#FFD600] text-[14px] font-bold text-[#0A0A0A]"
              style={{ boxShadow: '3px 3px 0 #0A0A0A' }}
            >
              💬 카카오톡 공유
            </motion.button>
            <motion.button
              type="button"
              onClick={copyLink}
              whileTap={{ scale: 0.95, y: 1 }}
              className="flex-1 min-h-[44px] py-3 rounded-[14px] border-[2px] border-[#0A0A0A] bg-white text-[14px] font-bold text-[#0A0A0A]"
              style={{ boxShadow: '3px 3px 0 #0A0A0A' }}
            >
              {copied ? '✓ 복사됨' : '🔗 링크 복사'}
            </motion.button>
          </div>
        </div>
      )}

      {/* 냈어요 체크리스트 */}
      <section className={card} style={cardShadow}>
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-bold text-[#0A0A0A]">✅ 냈어요 체크</h2>
          <span className="text-[13px] font-bold text-[#0A0A0A]/60">
            {paidCount} / {split.people}명
          </span>
        </div>

        {split.payers.length > 0 ? (
          <ul className={`mt-3 space-y-2 ${SR_MASK_CLASS}`}>
            {split.payers.map((p, i) => (
              <li
                key={`${p.nickname}-${i}`}
                className="flex items-center justify-between gap-2 rounded-[12px] border-[2px] border-[#0A0A0A] bg-[#FFF8F0] px-3 py-2"
              >
                <span className="text-[14px] font-bold text-[#0A0A0A] line-clamp-1">
                  {p.nickname}
                  {p.is_mine && <span className="ml-1 text-[12px] text-[#0A0A0A]/50">(나)</span>}
                </span>
                <span
                  className={`flex-shrink-0 px-2 py-0.5 rounded-[8px] border-[2px] border-[#0A0A0A] text-[12px] font-bold ${
                    p.paid ? 'bg-[#41C66B] text-white' : 'bg-white text-[#0A0A0A]/60'
                  }`}
                >
                  {p.paid ? '냈어요' : '아직'}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-[13px] text-[#0A0A0A]/50">아직 체크한 사람이 없어요.</p>
        )}

        {split.is_expired ? (
          <p className="mt-4 text-[13px] font-bold text-[#0A0A0A]/60">정산 기간(60일)이 지나 더 체크할 수 없어요.</p>
        ) : (
          <div className="mt-4 space-y-2">
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={20}
              placeholder="✍️ 내 이름 (단톡방에서 쓰는 이름)"
              aria-label="내 이름"
              className={`w-full min-h-[44px] px-4 rounded-[12px] border-[2px] border-[#0A0A0A] bg-white text-[15px] ${SR_MASK_CLASS}`}
            />
            <motion.button
              type="button"
              onClick={() => handleToggle(!mine?.paid)}
              disabled={busy || !nickname.trim()}
              whileTap={{ scale: 0.97, y: 1 }}
              className={`w-full min-h-[44px] py-3 rounded-[14px] border-[3px] border-[#0A0A0A] text-[15px] font-bold disabled:opacity-60 ${
                mine?.paid ? 'bg-white text-[#0A0A0A]' : 'bg-[#41C66B] text-white'
              }`}
              style={{ boxShadow: '4px 4px 0 #0A0A0A' }}
            >
              {busy ? '저장 중…' : mine?.paid ? '↩️ 냈어요 취소' : `💸 냈어요 (${formatWon(split.per_person)})`}
            </motion.button>
            {notice && (
              <p role="alert" className="text-[13px] font-bold text-[#FF3D77]">
                {notice}
              </p>
            )}
            <p className="text-[12px] text-[#0A0A0A]/50">송금은 평소처럼 각자 해 주세요. 여기서는 낸 사람만 표시해요.</p>
          </div>
        )}
      </section>

      {/* 다음 합주 — 같은 연습실 + 근처 후보로 새 투표 */}
      {nextIds.length > 0 && (
        <div className={card} style={cardShadow}>
          {showNext ? (
            <>
              <p className="text-[15px] font-bold text-[#0A0A0A]">🔁 다음 합주 정하기</p>
              <p className="text-[12px] text-[#0A0A0A]/50 mt-0.5">
                {studio?.is_published ? '이번 연습실과 근처 ' : '근처 '}
                {nextIds.length}곳으로 투표를 열어요.
              </p>
              <VoteCreatePanel studioIds={nextIds} parentVoteId={split.vote_id ?? undefined} fromSplit />
            </>
          ) : (
            <button
              type="button"
              onClick={() => {
                setShowNext(true);
                track('split_next_vote_click');
              }}
              className="w-full min-h-[44px] flex items-center justify-between gap-2 text-left"
            >
              <span>
                <span className="block text-[15px] font-bold text-[#0A0A0A]">🔁 다음 합주 정하기</span>
                <span className="block text-[12px] text-[#0A0A0A]/50 mt-0.5">같은 연습실·근처 후보로 멤버 투표를 열어요</span>
              </span>
              <span aria-hidden className="text-[18px] font-bold">
                →
              </span>
            </button>
          )}
        </div>
      )}

      {split.vote_id && (
        <Link href={`/vote/${split.vote_id}`} className="block text-center text-[13px] font-bold text-[#0A0A0A]/60 underline underline-offset-2">
          이번 합주 투표 다시 보기
        </Link>
      )}
    </main>
  );
}
