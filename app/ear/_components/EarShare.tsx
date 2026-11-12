'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { track } from '@/lib/analytics';
import { useT, useIsJapanMode } from '@/lib/i18n';
import { buildShareUrl } from '@/lib/share-utm';
import { buildShareText, type EarDay } from '@/lib/ear/streak';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.musicspotfest.com';

interface Props {
  date: string;
  day: EarDay;
  streak: number;
}

/** 결과 공유. 텍스트는 점수·정오 칸·연속만 — 정답은 넣지 않는다(lib/ear/streak.ts buildShareText) */
export default function EarShare({ date, day, streak }: Props) {
  const t = useT();
  const isJapanMode = useIsJapanMode();
  const [copied, setCopied] = useState(false);
  const [canNative, setCanNative] = useState(false);
  const text = buildShareText(date, day, streak, isJapanMode ? 'ja' : 'ko');

  useEffect(() => setCanNative(typeof navigator !== 'undefined' && typeof navigator.share === 'function'), []);

  function shareKakao() {
    const url = buildShareUrl('/ear', 'kakao', 'ear', date);
    if (!window.Kakao?.isInitialized()) {
      console.warn('[EarShare] 카카오 SDK 미초기화 — 링크 복사로 대신');
      void copyLink();
      return;
    }
    try {
      window.Kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
          title: text,
          description: '하루 한 번, 모두 같은 5문제. 너도 풀어 볼래?',
          imageUrl: `${SITE_URL}/ear/opengraph-image`,
          link: { mobileWebUrl: url, webUrl: url },
        },
        buttons: [{ title: '오늘 문제 풀기', link: { mobileWebUrl: url, webUrl: url } }],
      });
      track('ear_share', { channel: 'kakao' });
    } catch (e) {
      console.error('[EarShare] 카카오 공유 실패 — 링크 복사로 대신', e);
      void copyLink();
    }
  }

  async function shareNative() {
    const url = buildShareUrl('/ear', 'link', 'ear', date);
    try {
      await navigator.share({ text, url });
      track('ear_share', { channel: 'native' });
    } catch (e) {
      // 사용자가 공유 창을 닫은 경우(AbortError)는 정상
      if ((e as DOMException)?.name !== 'AbortError') console.error('[EarShare] 공유 실패', e);
    }
  }

  async function copyLink() {
    const url = buildShareUrl('/ear', 'link', 'ear', date);
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      track('ear_share', { channel: 'copy' });
    } catch (e) {
      console.error('[EarShare] 링크 복사 실패', e);
    }
  }

  const btn = 'flex-1 min-h-[48px] py-3 rounded-[14px] border-[2px] border-[#0A0A0A] text-[14px] font-bold text-[#0A0A0A]';

  return (
    <section className="bg-white rounded-[20px] border-[3px] border-[#0A0A0A] p-5" style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>
      <p className="text-[15px] font-bold text-[#0A0A0A]">📣 {t('밴드 단톡방에 결과 자랑하기')}</p>
      <p className="mt-2 px-3 py-2 rounded-[12px] bg-[#FFF8F0] border-[2px] border-[#0A0A0A]/20 text-[14px] font-bold text-[#0A0A0A] break-keep">{text}</p>
      <div className="mt-3 flex gap-2">
        {!isJapanMode && (
          <motion.button type="button" onClick={shareKakao} whileTap={{ scale: 0.95, y: 1 }} className={`${btn} bg-[#FFD600]`} style={{ boxShadow: '3px 3px 0 #0A0A0A' }}>
            💬 카카오톡
          </motion.button>
        )}
        <motion.button type="button" onClick={copyLink} whileTap={{ scale: 0.95, y: 1 }} className={`${btn} bg-white`} style={{ boxShadow: '3px 3px 0 #0A0A0A' }}>
          {copied ? t('✓ 복사됨') : t('🔗 링크 복사')}
        </motion.button>
        {canNative && (
          <motion.button type="button" onClick={shareNative} whileTap={{ scale: 0.95, y: 1 }} className={`${btn} bg-white`} style={{ boxShadow: '3px 3px 0 #0A0A0A' }}>
            {t('📤 공유')}
          </motion.button>
        )}
      </div>
    </section>
  );
}
