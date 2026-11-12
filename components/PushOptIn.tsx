'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { track } from '@/lib/analytics';
import { getClientCountry } from '@/lib/geo';
import { getVoterKey } from '@/lib/votes';
import { useT, useIsJapanMode } from '@/lib/i18n';
import { getPushSupport, isTopicOn, subscribeTopic, unsubscribeTopic, type PushKind, type PushSupport } from '@/lib/push';

export type PushWhere = 'vote_creator' | 'vote_member' | 'split' | 'ear';

interface Props {
  kind: PushKind;
  targetId: string;
  where: PushWhere;
  /** 만든 사람이면 그 투표·정산의 만든 사람 토큰(역할 확인용) */
  creatorToken?: string | null;
}

const COPY: Record<PushWhere, { title: string; desc: string }> = {
  vote_creator: { title: '🔔 멤버가 투표하면 알려 드릴까요?', desc: '단톡방을 계속 안 봐도 응답이 오면 이 브라우저로 알려 드려요.' },
  vote_member: { title: '🔔 연습실이 정해지면 알려 드릴까요?', desc: '결정되면 이 브라우저로 알려 드려요. 합주 전날에도 한 번.' },
  split: { title: '🔔 [냈어요] 잊지 않게 알려 드릴까요?', desc: '아직 안 눌렀으면 하루 뒤에 나한테만 한 번 알려 드려요.' },
  ear: { title: '🔔 내일 문제 알림 받기', desc: '매일 저녁 8시쯤 이 브라우저로 한 번만 알려 드려요.' },
};

const FAIL_MESSAGE: Record<string, string> = {
  denied: '브라우저에서 알림이 막혀 있어요. 주소창 왼쪽 자물쇠에서 알림을 허용해 주세요.',
  not_member: '먼저 투표해야 알림을 받을 수 있어요.',
  expired: '기간이 지나 알림을 켤 수 없어요.',
  not_found: '대상을 찾을 수 없어요.',
  limited: '이 브라우저에서 켤 수 있는 알림이 가득 찼어요.',
  invalid: '이 브라우저는 알림 구독 정보를 보내지 못했어요.',
};

/** 행동 직후(투표함·투표 만듦·정산 열람·음감 다 풂)에만 보이는 "알림 받기" 카드. 지원하지 않는 브라우저(카톡 인앱, 홈 화면 밖 iOS 등)에서는 숨긴다 */
export default function PushOptIn({ kind, targetId, where, creatorToken = null }: Props) {
  // 음감(/ear)은 일본어 모드에서도 열린다. 투표·정산은 ko 전용이라 t()가 원문 그대로 돌려준다
  const t = useT();
  const isJapanMode = useIsJapanMode();
  const [support, setSupport] = useState<PushSupport>('unsupported');
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const viewed = useRef(false);

  useEffect(() => {
    const s = getPushSupport();
    setSupport(s);
    setOn(s === 'granted' && isTopicOn(kind, targetId));
  }, [kind, targetId]);

  useEffect(() => {
    if (support === 'unsupported' || on || viewed.current) return;
    viewed.current = true;
    track('push_prompt_view', { where, permission: support });
  }, [support, on, where]);

  if (support === 'unsupported') return null;

  async function handleOn() {
    const deviceKey = getVoterKey();
    if (!deviceKey) {
      setNotice(t('이 브라우저는 저장소가 막혀 있어 알림을 켤 수 없어요.'));
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const result = await subscribeTopic({
        kind,
        targetId,
        deviceKey,
        creatorToken,
        country: getClientCountry() ?? 'KR',
        language: isJapanMode ? 'ja' : 'ko',
      });
      track('push_permission', { where, result: result === 'denied' ? 'denied' : 'granted' });
      if (result === 'saved') {
        track('push_subscribe', { kind, where });
        setOn(true);
      } else {
        if (result === 'denied') setSupport('denied');
        setNotice(t(FAIL_MESSAGE[result] ?? '알림을 켜지 못했어요.'));
      }
    } catch (e) {
      console.error('[PushOptIn] 알림 켜기 실패', e);
      setNotice(e instanceof Error ? e.message : t('알림을 켜지 못했어요.'));
    } finally {
      setBusy(false);
    }
  }

  async function handleOff() {
    setBusy(true);
    setNotice(null);
    try {
      await unsubscribeTopic(kind, targetId);
      setOn(false);
    } catch (e) {
      console.error('[PushOptIn] 알림 끄기 실패', e);
      setNotice(e instanceof Error ? e.message : t('알림을 끄지 못했어요.'));
    } finally {
      setBusy(false);
    }
  }

  const copy = COPY[where];

  if (on) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-[16px] border-[2px] border-[#0A0A0A] bg-white px-4 py-2" style={{ fontFamily: 'Pretendard, sans-serif' }}>
        <span className="text-[13px] font-bold text-[#0A0A0A]">{t('🔔 이 브라우저로 알림을 받아요')}</span>
        <button
          type="button"
          onClick={handleOff}
          disabled={busy}
          className="min-h-[44px] -my-2 px-2 text-[13px] font-bold text-[#0A0A0A]/60 underline underline-offset-2 disabled:opacity-60"
        >
          {busy ? t('끄는 중…') : t('끄기')}
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[20px] border-[3px] border-[#0A0A0A] p-5" style={{ boxShadow: '6px 6px 0 #0A0A0A', fontFamily: 'Pretendard, sans-serif' }}>
      <p className="text-[15px] font-bold text-[#0A0A0A] break-keep">{t(copy.title)}</p>
      <p className="text-[12px] text-[#0A0A0A]/50 mt-0.5 mb-3 break-keep">{t(copy.desc)}</p>
      {support === 'denied' ? (
        <p className="text-[13px] font-bold text-[#0A0A0A]/60">{t(FAIL_MESSAGE.denied)}</p>
      ) : (
        <motion.button
          type="button"
          onClick={handleOn}
          disabled={busy}
          whileTap={{ scale: 0.97, y: 1 }}
          className="w-full min-h-[44px] py-3 bg-[#F5FF4F] rounded-[14px] border-[2px] border-[#0A0A0A] text-[15px] font-bold text-[#0A0A0A] disabled:opacity-60"
          style={{ boxShadow: '3px 3px 0 #0A0A0A' }}
        >
          {busy ? t('켜는 중…') : t('🔔 알림 받기')}
        </motion.button>
      )}
      {notice && support !== 'denied' && (
        <p role="alert" className="mt-2 text-[13px] font-bold text-[#FF3D77]">
          {notice}
        </p>
      )}
    </div>
  );
}
