'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { track } from '@/lib/analytics';
import { getCandidates, setCandidates } from '@/lib/candidates';
import { useCandidates } from '@/hooks/useCandidates';
import {
  ASK_OPEN_EVENT,
  CONTACT_EVENT,
  CONTACT_OUT_KEY,
  NUDGE_SHOWN_KEY,
  buildAskCandidates,
  parseContactOut,
  parseShown,
  shouldShowNudge,
  type AskFrom,
} from '@/lib/ask-members';
import { studioPriceLabel } from '@/lib/studio-price';
import { Studio } from '@/types/studio';
import VoteCreatePanel from './VoteCreatePanel';

interface Props {
  studioId: string;
  /** RoomCompare와 같은 근처 연습실(가까운 순) */
  nearbyIds: string[];
}

function readSession(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeSession(key: string, value: string | null): void {
  try {
    if (value === null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, value);
  } catch {
    // 저장소 차단 — 넛지만 안 뜬다
  }
}

/**
 * "멤버한테 물어보기" 시트 + 문의하고 돌아왔을 때 1회 넛지.
 * 후보는 기존 후보 저장소(ms_candidates)에 합쳐 저장 → 시트를 닫아도 후보 바로 이어진다.
 */
export default function AskMembersSheet({ studioId, nearbyIds }: Props) {
  const { ids: storedIds } = useCandidates();
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<string[]>([]);
  const [checked, setChecked] = useState<string[]>([]);
  const [studios, setStudios] = useState<Map<string, Studio>>(new Map());
  const [nudge, setNudge] = useState(false);

  const openWith = useCallback(
    (from: AskFrom) => {
      const next = buildAskCandidates(studioId, getCandidates(), nearbyIds);
      setCandidates(next);
      setList(next);
      setChecked(next);
      setOpen(true);
      track('ask_members_click', { studio_id: studioId, from, candidate_count: next.length });
    },
    [studioId, nearbyIds],
  );

  // 상세의 버튼들(AskMembersButton) → 열기
  useEffect(() => {
    const onOpen = (e: Event) => {
      const from = (e as CustomEvent<{ from: AskFrom }>).detail?.from ?? 'booking_widget';
      setNudge(false);
      openWith(from);
    };
    window.addEventListener(ASK_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(ASK_OPEN_EVENT, onOpen);
  }, [openWith]);

  // 후보 연습실 정보(이름·사진·요금)
  useEffect(() => {
    if (!open || list.length === 0) return;
    let alive = true;
    supabase
      .from('studios')
      .select('*')
      .in('id', list)
      .eq('is_published', true)
      .then(({ data, error }) => {
        if (error) {
          console.error('[AskMembersSheet] 후보 연습실 조회 실패', error.message);
          return;
        }
        if (alive) setStudios(new Map(((data ?? []) as Studio[]).map((s) => [s.id, s])));
      });
    return () => {
      alive = false;
    };
  }, [open, list]);

  function toggleChecked(id: string) {
    const next = checked.includes(id) ? checked.filter((v) => v !== id) : list.filter((v) => v === id || checked.includes(v));
    setChecked(next);
    setCandidates(next);
  }

  // 문의하러 나감 기록(전화는 앱 전환 흐름이 달라 제외 — 전화를 누르면 이전 기록도 지운다)
  useEffect(() => {
    const onContact = (e: Event) => {
      const detail = (e as CustomEvent<{ type: string; studioId: string }>).detail;
      if (!detail || detail.studioId !== studioId) return;
      writeSession(CONTACT_OUT_KEY, detail.type === 'phone' ? null : JSON.stringify({ studioId, at: Date.now() }));
    };
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      const shown = parseShown(readSession(NUDGE_SHOWN_KEY));
      if (!shouldShowNudge(parseContactOut(readSession(CONTACT_OUT_KEY)), studioId, Date.now(), shown)) return;
      // 다른 시트(후보 시트 등)가 열려 있으면 이번엔 건너뛴다
      if (document.querySelector('[role="dialog"]')) return;
      writeSession(NUDGE_SHOWN_KEY, JSON.stringify([...shown, studioId]));
      writeSession(CONTACT_OUT_KEY, null);
      setNudge(true);
      track('ask_members_nudge_view', { studio_id: studioId });
    };
    window.addEventListener(CONTACT_EVENT, onContact);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener(CONTACT_EVENT, onContact);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [studioId]);

  // 다른 연습실 상세로 옮기면(같은 컴포넌트 재사용) 넛지·시트를 닫는다
  useEffect(() => {
    setNudge(false);
    setOpen(false);
  }, [studioId]);

  const ordered = list.map((id) => studios.get(id)).filter(Boolean) as Studio[];

  return (
    <>
      {nudge && !open && (
        <div
          role="region"
          aria-label="멤버한테 물어보기 제안"
          className="fixed left-0 right-0 z-40 px-4 pb-2"
          // 문의 바·탭바 위, 후보 바가 있으면 그 위(후보 바 높이 ≈ 64px)
          style={{
            bottom: `calc(var(--contact-bar-h) + var(--tabbar-h) + var(--bottom-safe) + ${storedIds.length > 0 ? 64 : 0}px)`,
          }}
        >
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="w-full max-w-lg mx-auto bg-white rounded-[20px] border-[3px] border-[#0A0A0A] p-4"
            style={{ boxShadow: '4px 4px 0 #0A0A0A', fontFamily: 'Pretendard, sans-serif' }}
          >
            <p className="text-[15px] font-bold text-[#0A0A0A] break-keep">문의해 보셨나요? 멤버들한테도 물어보세요</p>
            <p className="text-[12px] text-[#0A0A0A]/60 mt-0.5 break-keep">
              후보를 묶어 투표 링크를 만들면 단톡방에서 로그인 없이 같이 골라요.
            </p>
            <div className="flex gap-2 mt-3">
              <motion.button
                type="button"
                onClick={() => {
                  setNudge(false);
                  openWith('return_nudge');
                }}
                whileTap={{ scale: 0.97, y: 1 }}
                className="flex-1 min-h-[44px] bg-[#FF3D77] text-white rounded-[14px] border-[2px] border-[#0A0A0A] text-[14px] font-bold"
                style={{ boxShadow: '3px 3px 0 #0A0A0A' }}
              >
                📣 멤버한테 물어보기
              </motion.button>
              <button
                type="button"
                onClick={() => {
                  setNudge(false);
                  track('ask_members_nudge_dismiss', { studio_id: studioId });
                }}
                className="min-h-[44px] px-4 bg-white rounded-[14px] border-[2px] border-[#0A0A0A] text-[14px] font-bold text-[#0A0A0A]/70"
              >
                닫기
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#0A0A0A]/40" onClick={() => setOpen(false)}>
          <motion.div
            role="dialog"
            aria-label="멤버한테 물어볼 후보"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg max-h-[80vh] overflow-y-auto bg-[#FFF8F0] rounded-t-[24px] border-[3px] border-b-0 border-[#0A0A0A] px-5 pt-5"
            style={{ paddingBottom: 'calc(20px + env(safe-area-inset-bottom))', fontFamily: 'Pretendard, sans-serif' }}
          >
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-[17px] font-bold text-[#0A0A0A]">📣 멤버한테 물어볼 후보</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="min-h-[36px] px-3 py-1 rounded-[10px] border-[2px] border-[#0A0A0A] bg-white text-[13px] font-bold"
              >
                닫기
              </button>
            </div>
            <p className="text-[12px] text-[#0A0A0A]/50 mb-4">체크한 곳으로 투표를 만들어요. 근처 연습실은 거리순으로 채웠어요.</p>

            <ul className="space-y-2">
              {ordered.map((studio) => {
                const on = checked.includes(studio.id);
                const photo = studio.photos?.[0] ?? null;
                return (
                  <li key={studio.id}>
                    <label
                      className={`flex items-center gap-3 rounded-[14px] border-[2px] border-[#0A0A0A] p-2 cursor-pointer ${
                        on ? 'bg-white' : 'bg-white/50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => toggleChecked(studio.id)}
                        className="w-5 h-5 flex-shrink-0 accent-[#FF3D77]"
                      />
                      <div className="relative w-12 h-12 flex-shrink-0 rounded-[10px] overflow-hidden border-[2px] border-[#0A0A0A] bg-[#0A0A0A]/5">
                        {photo ? (
                          <Image src={photo} alt={studio.name} fill className="object-cover" sizes="48px" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[20px]">🎸</div>
                        )}
                      </div>
                      <div className={`min-w-0 flex-1 ${on ? '' : 'opacity-50'}`}>
                        <p className="text-[14px] font-bold text-[#0A0A0A] line-clamp-1">
                          {studio.name}
                          {studio.id === studioId && <span className="ml-1 text-[12px] text-[#0A0A0A]/50">· 지금 보는 곳</span>}
                        </p>
                        <p className="text-[12px] font-bold text-[#FF3D77] line-clamp-1">{studioPriceLabel(studio)}</p>
                      </div>
                    </label>
                  </li>
                );
              })}
            </ul>

            {checked.length > 0 ? (
              <VoteCreatePanel studioIds={list.filter((id) => checked.includes(id) && studios.has(id))} askMembers />
            ) : (
              <p className="mt-5 text-[13px] font-bold text-[#0A0A0A]/60 text-center">한 곳 이상 체크해 주세요.</p>
            )}
          </motion.div>
        </div>
      )}
    </>
  );
}
