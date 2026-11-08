'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { track } from '@/lib/analytics';
import { getClientCountry } from '@/lib/geo';
import { hourlyPrice } from '@/lib/studio-price';
import { getVoterKey } from '@/lib/votes';
import {
  SPLIT_DEFAULT_HOURS,
  SPLIT_DEFAULT_PEOPLE,
  SPLIT_MAX_PEOPLE,
  SPLIT_MIN_PEOPLE,
  calcPerPerson,
  createSplit,
  formatWon,
  splitTotal,
} from '@/lib/split';
import type { Studio } from '@/types/studio';

interface Props {
  studio: Pick<Studio, 'id' | 'name' | 'price_per_hour' | 'price_info'>;
  from: 'vote' | 'room';
  /** 결정된 투표에서 열었으면 그 투표(정산 → 다음 합주 투표를 잇는다) */
  voteId?: string | null;
  /** 합주 날짜(YYYY-MM-DD). 투표의 가장 많이 고른 날짜 */
  playedOn?: string | null;
  /** wide: 투표 화면 카드 / link: 상세 정보 카드 요금 줄 옆 */
  variant: 'wide' | 'link';
}

/** 숫자만 남겨 정수로. 빈칸이면 null */
function toInt(value: string): number | null {
  const digits = value.replace(/[^\d]/g, '');
  return digits ? Number(digits) : null;
}

/** "합주비 나누기" 버튼 + 입력 시트 → /split/[id] */
export default function SplitSheet({ studio, from, voteId = null, playedOn = null, variant }: Props) {
  const router = useRouter();
  const defaultHourly = hourlyPrice(studio);
  const [open, setOpen] = useState(false);
  const [hourlyText, setHourlyText] = useState(defaultHourly ? String(defaultHourly) : '');
  const [hours, setHours] = useState(SPLIT_DEFAULT_HOURS);
  const [people, setPeople] = useState(SPLIT_DEFAULT_PEOPLE);
  const [extraText, setExtraText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hourly = toInt(hourlyText);
  const extra = toInt(extraText) ?? 0;
  const perPerson = useMemo(
    () => (hourly == null ? null : calcPerPerson(hourly, hours, people, extra)),
    [hourly, hours, people, extra],
  );

  function openSheet() {
    setOpen(true);
    setError(null);
    track('split_open', { from });
  }

  async function handleCreate() {
    if (hourly == null || perPerson == null) return;
    const key = getVoterKey();
    if (!key) {
      setError('이 브라우저는 저장소가 막혀 있어 정산 링크를 만들 수 없어요. 일반 창에서 열어 주세요.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const id = await createSplit({
        creatorKey: key,
        hourlyPrice: hourly,
        hours,
        people,
        extra,
        studioId: studio.id,
        voteId,
        playedOn,
        country: getClientCountry() ?? 'KR',
      });
      track('split_create', { people, has_vote: !!voteId });
      router.push(`/split/${id}`);
    } catch (e) {
      console.error('[SplitSheet] 정산 만들기 실패', e);
      setError(e instanceof Error ? e.message : '정산 링크를 만들지 못했어요.');
      setBusy(false);
    }
  }

  const stepBtn =
    'w-11 h-11 flex items-center justify-center rounded-[12px] border-[2px] border-[#0A0A0A] bg-white text-[18px] font-bold disabled:opacity-40';
  const input =
    'w-full min-h-[44px] px-4 rounded-[12px] border-[2px] border-[#0A0A0A] bg-white text-[15px] font-bold text-[#0A0A0A]';

  return (
    <>
      {variant === 'wide' ? (
        <div className="bg-white rounded-[20px] border-[3px] border-[#0A0A0A] p-5" style={{ boxShadow: '6px 6px 0 #0A0A0A' }}>
          <p className="text-[15px] font-bold text-[#0A0A0A]">💸 합주비 나누기</p>
          <p className="text-[12px] text-[#0A0A0A]/50 mt-0.5 mb-3 break-keep">1인당 금액을 계산해 단톡방에 올리고, 낸 사람을 같이 체크해요.</p>
          <motion.button
            type="button"
            onClick={openSheet}
            whileTap={{ scale: 0.97, y: 1 }}
            className="w-full min-h-[44px] py-3 bg-[#F5FF4F] rounded-[14px] border-[2px] border-[#0A0A0A] text-[15px] font-bold text-[#0A0A0A]"
            style={{ boxShadow: '3px 3px 0 #0A0A0A' }}
          >
            🧮 1인당 얼마? 계산하기
          </motion.button>
        </div>
      ) : (
        <button
          type="button"
          onClick={openSheet}
          className="min-h-[44px] -my-3 px-1 text-[13px] font-bold text-[#0A0A0A] underline underline-offset-2"
          style={{ fontFamily: 'Pretendard, sans-serif' }}
        >
          🧮 합주비 계산
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#0A0A0A]/40" onClick={() => setOpen(false)}>
          <motion.div
            role="dialog"
            aria-label="합주비 나누기"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg max-h-[85vh] overflow-y-auto bg-[#FFF8F0] rounded-t-[24px] border-[3px] border-b-0 border-[#0A0A0A] px-5 pt-5"
            style={{ paddingBottom: 'calc(20px + env(safe-area-inset-bottom))', fontFamily: 'Pretendard, sans-serif' }}
          >
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-[17px] font-bold text-[#0A0A0A]">💸 합주비 나누기</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="min-h-[36px] px-3 py-1 rounded-[10px] border-[2px] border-[#0A0A0A] bg-white text-[13px] font-bold"
              >
                닫기
              </button>
            </div>
            <p className="text-[12px] text-[#0A0A0A]/50 mb-4 line-clamp-1">🎸 {studio.name}</p>

            <div className="space-y-4">
              <label className="block">
                <span className="block text-[13px] font-bold text-[#0A0A0A] mb-1">시간당 요금</span>
                <input
                  inputMode="numeric"
                  value={hourlyText}
                  onChange={(e) => setHourlyText(e.target.value.replace(/[^\d]/g, ''))}
                  placeholder="예: 15000"
                  aria-label="시간당 요금(원)"
                  className={input}
                />
                {!defaultHourly && (
                  <span className="block mt-1 text-[12px] text-[#0A0A0A]/50">이 연습실은 시간당 요금 정보가 없어요. 직접 적어 주세요.</span>
                )}
              </label>

              <div className="flex gap-4">
                <div className="flex-1">
                  <span className="block text-[13px] font-bold text-[#0A0A0A] mb-1">시간</span>
                  <div className="flex items-center gap-2">
                    <button type="button" className={stepBtn} aria-label="30분 줄이기" disabled={hours <= 0.5} onClick={() => setHours((h) => Math.max(0.5, h - 0.5))}>
                      −
                    </button>
                    <span className="flex-1 text-center text-[16px] font-bold">{hours}시간</span>
                    <button type="button" className={stepBtn} aria-label="30분 늘리기" disabled={hours >= 24} onClick={() => setHours((h) => Math.min(24, h + 0.5))}>
                      +
                    </button>
                  </div>
                </div>
                <div className="flex-1">
                  <span className="block text-[13px] font-bold text-[#0A0A0A] mb-1">인원</span>
                  <div className="flex items-center gap-2">
                    <button type="button" className={stepBtn} aria-label="한 명 줄이기" disabled={people <= SPLIT_MIN_PEOPLE} onClick={() => setPeople((p) => Math.max(SPLIT_MIN_PEOPLE, p - 1))}>
                      −
                    </button>
                    <span className="flex-1 text-center text-[16px] font-bold">{people}명</span>
                    <button type="button" className={stepBtn} aria-label="한 명 늘리기" disabled={people >= SPLIT_MAX_PEOPLE} onClick={() => setPeople((p) => Math.min(SPLIT_MAX_PEOPLE, p + 1))}>
                      +
                    </button>
                  </div>
                </div>
              </div>

              <label className="block">
                <span className="block text-[13px] font-bold text-[#0A0A0A] mb-1">추가 비용 (선택)</span>
                <input
                  inputMode="numeric"
                  value={extraText}
                  onChange={(e) => setExtraText(e.target.value.replace(/[^\d]/g, ''))}
                  placeholder="장비 대여·음료 등"
                  aria-label="추가 비용(원)"
                  className={input}
                />
              </label>
            </div>

            <div className="mt-5 rounded-[16px] border-[3px] border-[#0A0A0A] bg-white p-4 text-center" style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>
              <p className="text-[12px] font-bold text-[#0A0A0A]/60">1인당 (100원 단위 올림)</p>
              <p className="mt-1 text-[28px] text-[#FF3D77]" style={{ fontWeight: 900 }} aria-live="polite">
                {perPerson == null ? '—' : formatWon(perPerson)}
              </p>
              {hourly != null && (
                <p className="text-[12px] text-[#0A0A0A]/60">
                  총 {formatWon(splitTotal(hourly, hours, extra))} ÷ {people}명
                </p>
              )}
              {hourly != null && perPerson == null && (
                <p className="mt-1 text-[12px] font-bold text-[#FF3D77]">총액은 100만원까지 계산할 수 있어요.</p>
              )}
            </div>
            <p className="mt-2 text-[12px] text-[#0A0A0A]/50 text-center">금액은 안내용이에요. 실제 요금은 업체 기준.</p>

            {error && (
              <p role="alert" className="mt-3 text-[13px] font-bold text-[#FF3D77]">
                {error}
              </p>
            )}

            <motion.button
              type="button"
              onClick={handleCreate}
              disabled={busy || perPerson == null}
              whileTap={{ scale: 0.97, y: 1 }}
              className="mt-4 w-full py-3 bg-[#FF3D77] text-white rounded-[14px] border-[3px] border-[#0A0A0A] text-[15px] font-bold disabled:opacity-60"
              style={{ boxShadow: '4px 4px 0 #0A0A0A' }}
            >
              {busy ? '만드는 중…' : '🔗 정산 링크 만들기'}
            </motion.button>
            <p className="mt-2 text-[12px] text-[#0A0A0A]/50 text-center">링크를 단톡방에 올리면 멤버가 로그인 없이 &quot;냈어요&quot;를 눌러요.</p>
          </motion.div>
        </div>
      )}
    </>
  );
}
