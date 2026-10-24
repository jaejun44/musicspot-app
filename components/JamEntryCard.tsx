'use client';

import Link from 'next/link';
import { track } from '@/lib/analytics';

// 방문이 몰리는 연습실 상세·지역 페이지에서 밴드찾기 > 온라인 잼으로 보내는 입구.
// 두 페이지 모두 ja 모드 차단 경로라 한국어만 쓴다.

interface Props {
  from: 'room' | 'region';
  className?: string;
}

const FONT = { fontFamily: 'Pretendard, sans-serif' };

export default function JamEntryCard({ from, className = '' }: Props) {
  return (
    <div
      className={`bg-[#242447] rounded-[20px] border-[3px] border-[#0A0A0A] p-5 ${className}`}
      style={{ boxShadow: '6px 6px 0 #0A0A0A' }}
    >
      <h2 className="text-[16px] font-bold text-white" style={FONT}>
        🎧 같이 칠 사람 찾고 있나요?
      </h2>
      <p className="text-[13px] font-bold text-white/70 mt-1.5 leading-relaxed" style={FONT}>
        합주실 잡기 전에, 각자 집에서 온라인으로 먼저 맞춰봐요.
        <br />
        무료 앱 SonoBus로 바로 잼할 수 있어요.
      </p>
      <Link
        href="/band-matching?tab=jam"
        onClick={() => track('match_jam_entry_click', { from })}
        className="block w-full mt-4 py-3.5 bg-[#FF3D77] rounded-[14px] border-[2px] border-[#0A0A0A] text-center text-[14px] font-bold text-white active:scale-95 transition-transform"
        style={{ boxShadow: '3px 3px 0 #0A0A0A', ...FONT }}
      >
        온라인 잼 방 보러가기 →
      </Link>
    </div>
  );
}
