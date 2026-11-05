'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { track } from '@/lib/analytics';
import { buildAdminLink, getCreatorToken } from '@/lib/votes';

interface Props {
  voteId: string;
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.musicspotfest.com';

/**
 * 만든 사람에게만: 다른 기기(휴대폰)에서 결과를 보고 결정할 수 있는 관리 링크(#k=토큰).
 * PC에서 만들고 단톡방(휴대폰)에서 정하는 흐름을 잇는다. 멤버 공유 링크(VoteShare)와 달리 UTM을 붙이지 않는다.
 * 토큰 값은 이벤트·콘솔에 남기지 않는다.
 */
export default function VoteAdminLink({ voteId }: Props) {
  const [copied, setCopied] = useState(false);

  function adminLink(): string | null {
    const token = getCreatorToken(voteId);
    return token ? buildAdminLink(window.location.origin, voteId, token) : null;
  }

  async function copyLink(method: 'kakao' | 'copy') {
    const link = adminLink();
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      track('vote_admin_link_copy', { vote_id: voteId, method });
    } catch {
      console.error('[VoteAdminLink] 관리 링크 복사 실패');
    }
  }

  function sendKakao() {
    const link = adminLink();
    if (!link) return;
    if (!window.Kakao?.isInitialized()) {
      console.warn('[VoteAdminLink] 카카오 SDK 미초기화 — 링크 복사로 대신');
      void copyLink('copy');
      return;
    }
    try {
      // "나와의 채팅"은 사용자가 공유 대상에서 고른다
      window.Kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
          title: '🔑 내 합주 투표 관리 링크',
          description: '이 링크로 열면 결과를 보고 연습실을 정할 수 있어요. 멤버에게는 공유하지 마세요.',
          imageUrl: `${SITE_URL}/vote/${voteId}/opengraph-image`,
          link: { mobileWebUrl: link, webUrl: link },
        },
        buttons: [{ title: '투표 관리하기', link: { mobileWebUrl: link, webUrl: link } }],
      });
      track('vote_admin_link_copy', { vote_id: voteId, method: 'kakao' });
    } catch {
      console.error('[VoteAdminLink] 카카오 공유 실패 — 링크 복사로 대신');
      void copyLink('copy');
    }
  }

  return (
    <div className="bg-white rounded-[20px] border-[3px] border-[#0A0A0A] p-5" style={{ boxShadow: '6px 6px 0 #0A0A0A' }}>
      <p className="text-[15px] font-bold text-[#0A0A0A]">🔑 내 관리 링크</p>
      <p className="text-[12px] text-[#0A0A0A]/60 mt-0.5 mb-3 break-keep">
        다른 기기(휴대폰)에서 결과를 보고 결정하려면 이 링크를 나에게 보내 두세요. 멤버에게는 공유하지 마세요.
      </p>
      <div className="flex gap-2">
        <motion.button
          type="button"
          onClick={sendKakao}
          whileTap={{ scale: 0.95, y: 1 }}
          className="flex-1 py-3 rounded-[14px] border-[2px] border-[#0A0A0A] bg-[#FFD600] text-[14px] font-bold text-[#0A0A0A]"
          style={{ boxShadow: '3px 3px 0 #0A0A0A' }}
        >
          💬 나에게 카톡 보내기
        </motion.button>
        <motion.button
          type="button"
          onClick={() => copyLink('copy')}
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
