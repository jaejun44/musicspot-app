'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { track } from '@/lib/analytics';
import { buildShareUrl } from '@/lib/share-utm';

interface Props {
  voteId: string;
  count: number;
  studioNames: string[];
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.musicspotfest.com';

/** 만든 사람 화면: 밴드 단톡방에 투표 링크 올리기 (카카오 공유 / 링크 복사) */
export default function VoteShare({ voteId, count, studioNames }: Props) {
  const [copied, setCopied] = useState(false);
  const title = `다음 합주 어디서? 후보 ${count}곳 투표`;

  function shareKakao() {
    const url = buildShareUrl(`/vote/${voteId}`, 'kakao', 'vote', voteId);
    if (!window.Kakao?.isInitialized()) {
      console.warn('[VoteShare] 카카오 SDK 미초기화 — 링크 복사로 대신');
      void copyLink();
      return;
    }
    try {
      window.Kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
          title,
          description: studioNames.join(' · ') || '로그인 없이 바로 투표해요',
          imageUrl: `${SITE_URL}/vote/${voteId}/opengraph-image`,
          link: { mobileWebUrl: url, webUrl: url },
        },
        buttons: [{ title: '투표하러 가기', link: { mobileWebUrl: url, webUrl: url } }],
      });
      track('vote_share', { vote_id: voteId, channel: 'kakao' });
    } catch (e) {
      console.error('[VoteShare] 카카오 공유 실패 — 링크 복사로 대신', e);
      void copyLink();
    }
  }

  async function copyLink() {
    const url = buildShareUrl(`/vote/${voteId}`, 'link', 'vote', voteId);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      track('vote_share', { vote_id: voteId, channel: 'copy' });
    } catch (e) {
      console.error('[VoteShare] 링크 복사 실패', e);
    }
  }

  return (
    <div className="bg-white rounded-[20px] border-[3px] border-[#0A0A0A] p-5" style={{ boxShadow: '6px 6px 0 #0A0A0A' }}>
      <p className="text-[15px] font-bold text-[#0A0A0A]">📣 단톡방에 투표 링크를 올려 주세요</p>
      <p className="text-[12px] text-[#0A0A0A]/60 mt-0.5 mb-3">멤버는 로그인 없이 투표하고, 결과는 이 링크에서 같이 봐요.</p>
      <div className="flex gap-2">
        <motion.button
          type="button"
          onClick={shareKakao}
          whileTap={{ scale: 0.95, y: 1 }}
          className="flex-1 py-3 rounded-[14px] border-[2px] border-[#0A0A0A] bg-[#FFD600] text-[14px] font-bold text-[#0A0A0A]"
          style={{ boxShadow: '3px 3px 0 #0A0A0A' }}
        >
          💬 카카오톡 공유
        </motion.button>
        <motion.button
          type="button"
          onClick={copyLink}
          whileTap={{ scale: 0.95, y: 1 }}
          className="flex-1 py-3 rounded-[14px] border-[2px] border-[#0A0A0A] bg-white text-[14px] font-bold text-[#0A0A0A]"
          style={{ boxShadow: '3px 3px 0 #0A0A0A' }}
        >
          {copied ? '✓ 복사됨' : '🔗 링크 복사'}
        </motion.button>
      </div>
    </div>
  );
}
