'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { track } from '@/lib/analytics';
import { getAnonId } from '@/lib/analytics/context';
import { getClientCountry } from '@/lib/geo';
import { MAX_DATE_OPTIONS, createVote, formatVoteDate, upcomingDates } from '@/lib/votes';

interface Props {
  studioIds: string[];
  /** "다음 합주도 여기서 정하기": 이전 투표에서 이어 만든다(옛 링크가 새 투표로 안내) */
  parentVoteId?: string;
}

/** 날짜 후보(선택)를 고르고 투표 링크를 만든다 → /vote/[id]. 후보 시트와 결정된 투표 화면에서 쓴다 */
export default function VoteCreatePanel({ studioIds, parentVoteId }: Props) {
  const router = useRouter();
  const days = useMemo(() => upcomingDates(new Date(), 14), []);
  const [dates, setDates] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleDate(d: string) {
    setDates((prev) =>
      prev.includes(d) ? prev.filter((v) => v !== d) : prev.length >= MAX_DATE_OPTIONS ? prev : [...prev, d].sort(),
    );
  }

  async function handleCreate() {
    const anonId = getAnonId();
    if (!anonId) {
      setError('이 브라우저는 저장소가 막혀 있어 투표를 만들 수 없어요. 일반 창에서 열어 주세요.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const id = await createVote({ anonId, studioIds, dates, country: getClientCountry() ?? 'KR', parentVoteId });
      track('vote_create', { vote_id: id, count: studioIds.length, is_followup: !!parentVoteId });
      router.push(`/vote/${id}`);
    } catch (e) {
      console.error('[VoteCreatePanel] 투표 생성 실패', e);
      setError(e instanceof Error ? e.message : '투표를 만들지 못했어요.');
      setBusy(false);
    }
  }

  return (
    <div className="mt-5 pt-4 border-t-[2px] border-dashed border-[#0A0A0A]/20">
      <p className="text-[14px] font-bold text-[#0A0A0A]">📅 날짜 후보 (선택, 최대 {MAX_DATE_OPTIONS}개)</p>
      <p className="text-[12px] text-[#0A0A0A]/50 mb-2">고르지 않으면 연습실만 투표해요.</p>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {days.map((d) => {
          const on = dates.includes(d);
          return (
            <button
              key={d}
              type="button"
              onClick={() => toggleDate(d)}
              aria-pressed={on}
              className={`flex-shrink-0 px-3 py-1.5 rounded-[10px] border-[2px] border-[#0A0A0A] text-[13px] font-bold ${
                on ? 'bg-[#F5FF4F]' : 'bg-white text-[#0A0A0A]/70'
              }`}
              style={on ? { boxShadow: '2px 2px 0 #0A0A0A' } : undefined}
            >
              {formatVoteDate(d)}
            </button>
          );
        })}
      </div>

      {error && (
        <p role="alert" className="mt-2 text-[13px] font-bold text-[#FF3D77]">
          {error}
        </p>
      )}

      <motion.button
        type="button"
        onClick={handleCreate}
        disabled={busy || studioIds.length === 0}
        whileTap={{ scale: 0.97, y: 1 }}
        className="mt-3 w-full py-3 bg-[#FF3D77] text-white rounded-[14px] border-[3px] border-[#0A0A0A] text-[15px] font-bold disabled:opacity-60"
        style={{ boxShadow: '4px 4px 0 #0A0A0A' }}
      >
        {busy
          ? '만드는 중…'
          : parentVoteId
            ? `🔁 같은 후보 ${studioIds.length}곳으로 새 투표 만들기`
            : `🗳️ 후보 ${studioIds.length}곳으로 투표 링크 만들기`}
      </motion.button>
      <p className="mt-2 text-[12px] text-[#0A0A0A]/50 text-center">
        {parentVoteId
          ? '단톡방에 있던 이 링크로 들어온 멤버도 새 투표로 안내돼요.'
          : '링크를 밴드 단톡방에 올리면 멤버가 로그인 없이 투표해요.'}
      </p>
    </div>
  );
}
