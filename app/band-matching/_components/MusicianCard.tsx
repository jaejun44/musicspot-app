'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Musician } from '../_data/musicians';
import { trackBandContact } from '@/lib/analytics';
import { supabase } from '@/lib/supabase';

const LEVEL_COLOR: Record<Musician['level'], string> = {
  입문: '#41C66B',
  중급: '#4FC3F7',
  고급: '#FF3D77',
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface Props {
  musician: Musician;
  index: number;
  onContact: (m: Musician) => void;
  currentUserId?: string;
  currentUserName?: string;
}

export default function MusicianCard({ musician, index, onContact, currentUserId, currentUserName }: Props) {
  const rotate = index % 3 === 0 ? -1.5 : index % 3 === 1 ? 0 : 1.5;
  const isRealUser = UUID_RE.test(musician.id);
  const canFollow = !!(currentUserId && isRealUser && currentUserId !== musician.id);

  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    if (!canFollow) return;
    supabase
      .from('user_follows')
      .select('follower_id')
      .eq('follower_id', currentUserId!)
      .eq('following_id', musician.id)
      .maybeSingle()
      .then(({ data }) => setIsFollowing(!!data));
  }, [canFollow, currentUserId, musician.id]);

  async function handleFollow(e: React.MouseEvent) {
    e.stopPropagation();
    if (!canFollow || followLoading) return;
    setFollowLoading(true);
    if (isFollowing) {
      await supabase.from('user_follows')
        .delete()
        .eq('follower_id', currentUserId!)
        .eq('following_id', musician.id);
      setIsFollowing(false);
    } else {
      await supabase.from('user_follows')
        .insert({ follower_id: currentUserId!, following_id: musician.id });
      setIsFollowing(true);
      // 팔로우 대상에게 알림 삽입 (오류 무시)
      supabase.from('notifications').insert({
        user_id: musician.id,
        type: 'follow',
        title: '새 팔로워',
        body: `${currentUserName ?? '누군가'}님이 회원님을 팔로우했습니다`,
        payload: { follower_id: currentUserId },
      }).then(() => {});
    }
    setFollowLoading(false);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, type: 'spring', stiffness: 260, damping: 22 }}
      whileHover={{ y: -6, rotate: rotate + 1, boxShadow: '8px 8px 0 #0A0A0A' }}
      style={{ rotate, boxShadow: '5px 5px 0 #0A0A0A' }}
      className="bg-white rounded-[20px] border-[3px] border-[#0A0A0A] p-4 flex flex-col gap-3"
    >
      {/* 아바타 + 이름 */}
      <div className="flex items-center gap-3">
        {musician.avatar_url ? (
          <img
            src={musician.avatar_url}
            alt={musician.name}
            className="w-12 h-12 rounded-full border-[3px] border-[#0A0A0A] flex-shrink-0 object-cover"
            style={{ boxShadow: '2px 2px 0 #0A0A0A' }}
          />
        ) : (
          <div
            className="w-12 h-12 rounded-full border-[3px] border-[#0A0A0A] flex items-center justify-center text-[22px] flex-shrink-0"
            style={{ backgroundColor: musician.color, boxShadow: '2px 2px 0 #0A0A0A' }}
          >
            {musician.emoji}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p
            className="text-[14px] font-bold text-[#0A0A0A] leading-tight"
            style={{ fontFamily: 'Pretendard, sans-serif' }}
          >
            {musician.name}
          </p>
          <p
            className="text-[11px] text-[#0A0A0A]/50 font-bold mt-0.5"
            style={{ fontFamily: 'Pretendard, sans-serif' }}
          >
            📍 {musician.location}
          </p>
        </div>
      </div>

      {/* 뱃지 행 */}
      <div className="flex flex-wrap gap-1.5">
        <span
          className="px-2 py-0.5 bg-[#0A0A0A] text-white text-[11px] font-bold rounded-[6px]"
          style={{ fontFamily: 'Pretendard, sans-serif' }}
        >
          {musician.position}
        </span>
        <span
          className="px-2 py-0.5 border-[2px] border-[#0A0A0A] text-[#0A0A0A] text-[11px] font-bold rounded-[6px]"
          style={{ backgroundColor: LEVEL_COLOR[musician.level] + '33', fontFamily: 'Pretendard, sans-serif' }}
        >
          {musician.level}
        </span>
        {musician.genre.map((g) => (
          <span
            key={g}
            className="px-2 py-0.5 bg-[#FFF8F0] border-[2px] border-[#0A0A0A]/20 text-[#0A0A0A]/60 text-[11px] font-bold rounded-[6px]"
            style={{ fontFamily: 'Pretendard, sans-serif' }}
          >
            {g}
          </span>
        ))}
      </div>

      {/* 소개 */}
      <p
        className="text-[12px] text-[#0A0A0A]/60 font-bold leading-relaxed"
        style={{ fontFamily: 'Pretendard, sans-serif' }}
      >
        {musician.bio}
      </p>

      {/* 구인 메시지 */}
      <div className="bg-[#FFF8F0] rounded-[10px] px-3 py-2">
        <p
          className="text-[11px] text-[#0A0A0A]/50 font-bold"
          style={{ fontFamily: 'Pretendard, sans-serif' }}
        >
          💬 {musician.lookingFor}
        </p>
      </div>

      {/* 버튼 행 */}
      <div className="flex gap-2">
        {canFollow && (
          <motion.button
            onClick={handleFollow}
            whileTap={{ scale: 0.95, y: 1 }}
            disabled={followLoading}
            className={[
              'flex-shrink-0 px-3 py-2.5 rounded-[12px] border-[2px] border-[#0A0A0A] font-bold text-[12px] transition-colors disabled:opacity-60',
              isFollowing
                ? 'bg-[#41C66B] text-white'
                : 'bg-white text-[#0A0A0A]',
            ].join(' ')}
            style={{ boxShadow: '2px 2px 0 #0A0A0A', fontFamily: 'Pretendard, sans-serif' }}
          >
            {isFollowing ? '✓ 팔로잉' : '+ 팔로우'}
          </motion.button>
        )}
        {isRealUser && (
          <Link
            href={`/u/${musician.id}`}
            onClick={(e) => e.stopPropagation()}
            className="flex-shrink-0 px-3 py-2.5 bg-[#F5FF4F] rounded-[12px] border-[2px] border-[#0A0A0A] text-[#0A0A0A] font-bold text-[12px] text-center"
            style={{ boxShadow: '2px 2px 0 #0A0A0A', fontFamily: 'Pretendard, sans-serif' }}
          >
            프로필
          </Link>
        )}
        <motion.button
          onClick={() => { trackBandContact('open_modal', musician.name, musician.position); onContact(musician); }}
          whileTap={{ scale: 0.95, y: 1 }}
          className="flex-1 py-2.5 bg-[#FF3D77] rounded-[12px] border-[2px] border-[#0A0A0A] text-white font-bold text-[13px]"
          style={{ boxShadow: '2px 2px 0 #0A0A0A', fontFamily: 'Bungee, sans-serif' }}
        >
          연락하기 💥
        </motion.button>
      </div>
    </motion.div>
  );
}
