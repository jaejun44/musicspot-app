'use client';

import { motion } from 'framer-motion';
import { track } from '@/lib/analytics';
import { useT } from '@/lib/i18n';
import { buildGoogleCalendarUrl, buildIcs, type CalendarEvent } from '@/lib/calendar';

interface Props {
  /** null이면 날짜·시간이 안 정해진 것 → 안내만 */
  event: CalendarEvent | null;
  from: 'vote' | 'band';
  /** compact: 밴드 일정 카드 안 작은 버튼 */
  compact?: boolean;
}

/** [구글 캘린더] [아이폰·기타(.ics)] — 서버 없이 링크·파일을 만든다 */
export default function AddToCalendar({ event, from, compact = false }: Props) {
  const t = useT();

  if (!event) {
    return (
      <p className="text-[12px] font-bold text-[#0A0A0A]/50" style={{ fontFamily: 'Pretendard, sans-serif' }}>
        📅 {t('날짜를 정하면 캘린더에 넣을 수 있어요')}
      </p>
    );
  }

  function openGoogle() {
    if (!event) return;
    track('calendar_add', { from, method: 'google' });
    window.open(buildGoogleCalendarUrl(event), '_blank', 'noopener,noreferrer');
  }

  function downloadIcs() {
    if (!event) return;
    try {
      const blob = new Blob([buildIcs(event)], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `musicspot-jam-${event.date.replace(/-/g, '')}.ics`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      track('calendar_add', { from, method: 'ics' });
    } catch (e) {
      console.error('[AddToCalendar] .ics 만들기 실패', e);
    }
  }

  const btn = `flex-1 min-h-[44px] px-3 rounded-[12px] border-[2px] border-[#0A0A0A] bg-white font-bold text-[#0A0A0A] ${
    compact ? 'text-[12px]' : 'text-[14px]'
  }`;

  return (
    <div className="flex gap-2" style={{ fontFamily: 'Pretendard, sans-serif' }}>
      <motion.button type="button" onClick={openGoogle} whileTap={{ scale: 0.96, y: 1 }} className={btn} style={{ boxShadow: '2px 2px 0 #0A0A0A' }}>
        📅 {t('구글 캘린더')}
      </motion.button>
      <motion.button type="button" onClick={downloadIcs} whileTap={{ scale: 0.96, y: 1 }} className={btn} style={{ boxShadow: '2px 2px 0 #0A0A0A' }}>
        🍎 {t('아이폰·기타(.ics)')}
      </motion.button>
    </div>
  );
}
