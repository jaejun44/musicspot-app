'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

// leaderboard_throwers(p_since_days, p_limit) RPC 반환 행
interface LeaderboardEntry {
  user_id: string;
  thrown: number;
  display_name: string | null;
  avatar_url: string | null;
}

const RANK_BADGE = ['🥇', '🥈', '🥉'];

export default function LeaderboardThrowers() {
  const [rows, setRows] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .rpc('leaderboard_throwers', { p_since_days: 7, p_limit: 10 })
      .then(({ data }) => {
        const list = Array.isArray(data) ? (data as LeaderboardEntry[]) : [];
        setRows(
          list.map((r) => ({
            user_id: r.user_id,
            thrown: Number(r.thrown) || 0,
            display_name: r.display_name,
            avatar_url: r.avatar_url,
          })),
        );
        setLoading(false);
      });
  }, []);

  // 로딩 중엔 자리 차지 않게 숨김 (프로필 로딩 체감 유지)
  if (loading) return null;

  const isEmpty = rows.length <= 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      className="bg-white rounded-[20px] border-[3px] border-[#0A0A0A] px-5 py-4"
      style={{ boxShadow: '6px 6px 0 #0A0A0A' }}
    >
      <p className="text-[16px] text-[#0A0A0A]" style={{ fontFamily: 'Bungee, sans-serif' }}>
        이번 주 많이 던진 사람 🔥
      </p>

      {isEmpty ? (
        <div className="mt-3">
          <p className="text-[13px] font-bold text-[#0A0A0A]/60 leading-relaxed" style={{ fontFamily: 'Pretendard, sans-serif' }}>
            아직 이번 주 주자가 적어요.
            <br />
            지금 던지면 바로 1위에 오를 수 있어요.
          </p>
          <Link
            href="/stems"
            className="inline-block mt-3 px-4 py-2 bg-[#FF3D77] text-white rounded-[12px] border-[3px] border-[#0A0A0A] text-[13px] font-bold"
            style={{ fontFamily: 'Bungee, sans-serif', boxShadow: '3px 3px 0 #0A0A0A' }}
          >
            지금 던지고 1위 →
          </Link>
        </div>
      ) : (
        <div className="mt-3 flex flex-col divide-y divide-[#0A0A0A]/10">
          {rows.map((r, i) => (
            <Link
              key={r.user_id}
              href={`/u/${r.user_id}`}
              className="flex items-center gap-3 py-2.5 group"
            >
              {/* 순위 */}
              <span
                className="w-7 text-center text-[15px] font-bold text-[#0A0A0A] shrink-0"
                style={{ fontFamily: 'Bungee, sans-serif' }}
              >
                {RANK_BADGE[i] ?? i + 1}
              </span>

              {/* 아바타 */}
              {r.avatar_url ? (
                <img
                  src={r.avatar_url}
                  alt=""
                  className="w-8 h-8 rounded-full border-[2px] border-[#0A0A0A] object-cover shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-full border-[2px] border-[#0A0A0A] bg-[#FFF8F0] flex items-center justify-center text-[14px] shrink-0">
                  🎸
                </div>
              )}

              {/* 닉네임 */}
              <p
                className="flex-1 min-w-0 truncate text-[13px] font-bold text-[#0A0A0A] group-hover:text-[#FF3D77] transition-colors"
                style={{ fontFamily: 'Pretendard, sans-serif' }}
              >
                {r.display_name?.trim() || '익명 뮤지션'}
              </p>

              {/* 던진 수 */}
              <span
                className="text-[13px] font-bold text-[#0A0A0A] shrink-0"
                style={{ fontFamily: 'Bungee, sans-serif' }}
              >
                {r.thrown}
              </span>
              <span className="text-[11px] font-bold text-[#0A0A0A]/40 shrink-0" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                던짐
              </span>
            </Link>
          ))}
        </div>
      )}
    </motion.div>
  );
}
