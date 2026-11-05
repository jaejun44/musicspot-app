'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useCandidates } from '@/hooks/useCandidates';
import { supabase } from '@/lib/supabase';
import { setCandidates } from '@/lib/candidates';
import { studioPriceLabel } from '@/lib/studio-price';
import { Studio } from '@/types/studio';

/**
 * 후보가 1곳 이상이면 뜨는 하단 바 + 후보 목록 시트.
 * 문의 바(RoomContactBar) 위에 선다: --contact-bar-h(globals.css)만큼 비켜 선다.
 */
export default function CandidateBar() {
  const { ids, toggle } = useCandidates();
  const [open, setOpen] = useState(false);
  const [studios, setStudios] = useState<Studio[]>([]);

  useEffect(() => {
    if (!open || ids.length === 0) return;
    let alive = true;
    supabase
      .from('studios')
      .select('*')
      .in('id', ids)
      .eq('is_published', true)
      .then(({ data, error }) => {
        if (error) {
          console.error('[CandidateBar] 후보 연습실 조회 실패', error.message);
          return;
        }
        if (!alive) return;
        const map = new Map(((data ?? []) as Studio[]).map((s) => [s.id, s]));
        const found = ids.map((id) => map.get(id)).filter(Boolean) as Studio[];
        setStudios(found);
        // 그사이 비공개된 곳은 목록에서 뺀다(시트에 안 보여 뺄 수도 없으므로)
        if (found.length < ids.length) setCandidates(found.map((s) => s.id));
      });
    return () => {
      alive = false;
    };
  }, [open, ids]);

  useEffect(() => {
    if (ids.length === 0) setOpen(false);
  }, [ids.length]);

  if (ids.length === 0) return null;

  return (
    <>
      {/* 고정 바에 마지막 내용이 가리지 않게 */}
      <div className="h-16" aria-hidden />

      <div
        className="fixed left-0 right-0 z-40 px-4 pb-2"
        style={{ bottom: 'calc(var(--contact-bar-h) + var(--tabbar-h) + var(--bottom-safe))' }}
      >
        <motion.button
          type="button"
          onClick={() => setOpen(true)}
          whileTap={{ scale: 0.97, y: 1 }}
          className="w-full max-w-lg mx-auto flex items-center justify-between gap-2 px-5 py-3 bg-[#FF3D77] text-white rounded-[16px] border-[3px] border-[#0A0A0A] text-[15px] font-bold"
          style={{ boxShadow: '4px 4px 0 #0A0A0A', fontFamily: 'Pretendard, sans-serif' }}
        >
          <span>후보 {ids.length}곳 · 멤버랑 정하기</span>
          <span aria-hidden>→</span>
        </motion.button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#0A0A0A]/40" onClick={() => setOpen(false)}>
          <motion.div
            role="dialog"
            aria-label="합주 후보"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg max-h-[75vh] overflow-y-auto bg-[#FFF8F0] rounded-t-[24px] border-[3px] border-b-0 border-[#0A0A0A] px-5 pt-5"
            style={{ paddingBottom: 'calc(20px + env(safe-area-inset-bottom))', fontFamily: 'Pretendard, sans-serif' }}
          >
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-[17px] font-bold text-[#0A0A0A]">🎯 합주 후보 {ids.length}곳</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-3 py-1 rounded-[10px] border-[2px] border-[#0A0A0A] bg-white text-[13px] font-bold"
              >
                닫기
              </button>
            </div>
            <p className="text-[12px] text-[#0A0A0A]/50 mb-4">이 기기에만 저장돼요. 최대 5곳까지 담을 수 있어요.</p>

            <ul className="space-y-2">
              {studios.map((studio) => {
                const photo = studio.photos?.[0] ?? null;
                return (
                  <li
                    key={studio.id}
                    className="flex items-center gap-3 rounded-[14px] border-[2px] border-[#0A0A0A] bg-white p-2"
                  >
                    <Link href={`/room/${studio.id}`} onClick={() => setOpen(false)} className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="relative w-12 h-12 flex-shrink-0 rounded-[10px] overflow-hidden border-[2px] border-[#0A0A0A] bg-[#0A0A0A]/5">
                        {photo ? (
                          <Image src={photo} alt={studio.name} fill className="object-cover" sizes="48px" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[20px]">🎸</div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-bold text-[#0A0A0A] line-clamp-1">{studio.name}</p>
                        <p className="text-[12px] font-bold text-[#FF3D77] line-clamp-1">{studioPriceLabel(studio)}</p>
                      </div>
                    </Link>
                    <button
                      type="button"
                      onClick={() => toggle(studio.id)}
                      className="flex-shrink-0 px-3 py-1.5 rounded-[10px] border-[2px] border-[#0A0A0A] bg-white text-[12px] font-bold text-[#0A0A0A]/70"
                    >
                      빼기
                    </button>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        </div>
      )}
    </>
  );
}
