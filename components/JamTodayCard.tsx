'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { track } from '@/lib/analytics';
import { useT } from '@/lib/i18n';
import { kstToday } from '@/lib/ear/daily';
import { dailyJam, type DailyJam } from '@/lib/jam/daily';

const FONT = { fontFamily: 'Pretendard, sans-serif' };

/** 홈 히어로 아래 "오늘의 잼" 1장 → 그날 조합 페이지. 날짜는 브라우저에서만 정한다 */
export default function JamTodayCard() {
  const t = useT();
  const [daily, setDaily] = useState<DailyJam | null>(null);
  useEffect(() => setDaily(dailyJam(kstToday(new Date()))), []);
  if (!daily) return null;
  const mode = t(daily.key.mode === 'major' ? '메이저' : '마이너');

  return (
    <Link
      href={`/jam/${daily.slug}?p=${encodeURIComponent(daily.progression.id)}`}
      onClick={() => track('jam_entry_click', { from: 'home' })}
      className="flex items-center gap-3 bg-white rounded-[20px] border-[3px] border-[#0A0A0A] px-4 py-3 min-h-[64px] max-w-2xl"
      style={{ boxShadow: '4px 4px 0 #0A0A0A', ...FONT }}
    >
      <span className="text-[26px]" aria-hidden>
        🎸
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-[12px] font-bold text-[#FF3D77]">{t('오늘의 잼')} · {t('백킹 잼')}</span>
        <span className="block text-[15px] font-bold text-[#0A0A0A] break-keep">
          {daily.key.name} {mode} {t(daily.style.label)} · {daily.bpm} BPM
        </span>
        <span className="block text-[12px] font-bold text-[#0A0A0A]/60 break-keep">{t('반주 틀어 놓고 집에서 같이 치기')}</span>
      </span>
      <span className="text-[14px] font-bold text-[#0A0A0A] shrink-0">{t('같이 치기')} →</span>
    </Link>
  );
}
