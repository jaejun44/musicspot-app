'use client';

import Link from 'next/link';
import { track } from '@/lib/analytics';

// 연습실 상세 맨 아래(리뷰 아래) "오늘의 음감" 입구. 상세는 ja 차단 경로라 한국어만 쓴다.
// 문의·비교·후보 영역과 떨어진 곳에 작게 둔다.

const FONT = { fontFamily: 'Pretendard, sans-serif' };

export default function EarEntryCard() {
  return (
    <Link
      href="/ear"
      onClick={() => track('ear_entry_click', { from: 'room' })}
      className="flex items-center gap-3 bg-white rounded-[20px] border-[3px] border-[#0A0A0A] px-4 py-3 min-h-[56px]"
      style={{ boxShadow: '4px 4px 0 #0A0A0A', ...FONT }}
    >
      <span className="text-[24px]" aria-hidden>
        🎧
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-[14px] font-bold text-[#0A0A0A]">오늘의 음감 · 매일 5문제</span>
        <span className="block text-[12px] font-bold text-[#0A0A0A]/60">합주 전에 귀 풀기 — 음정·코드 듣고 맞히기</span>
      </span>
      <span className="text-[14px] font-bold text-[#0A0A0A]">→</span>
    </Link>
  );
}
