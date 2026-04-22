'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

const INSTRUMENTS = [
  { id: '보컬', label: '보컬', emoji: '🎤' },
  { id: '기타', label: '기타', emoji: '🎸' },
  { id: '베이스', label: '베이스', emoji: '🎵' },
  { id: '드럼', label: '드럼', emoji: '🥁' },
  { id: '건반', label: '건반', emoji: '🎹' },
  { id: '기타(other)', label: '그 외', emoji: '🎶' },
];

const GENRES = ['록', '인디', '재즈', '팝', '메탈', 'R&B', '블루스', '클래식', '힙합', '기타'];

const REGIONS = [
  '서울 홍대/합정', '서울 강남', '서울 신촌/이대', '서울 기타',
  '경기/인천', '부산', '대구', '기타',
];

const PURPOSES = [
  { id: '합주 파트너', label: '합주 파트너 구하기', emoji: '🤝' },
  { id: '밴드 결성', label: '밴드 결성', emoji: '🎸' },
  { id: '세션/공연', label: '세션/공연 활동', emoji: '🎪' },
  { id: '연습실 정보', label: '연습실 정보 공유', emoji: '📍' },
];

interface Props {
  user: User;
  onComplete: () => void;
}

function toggle(arr: string[], item: string): string[] {
  return arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];
}

export default function OnboardingModal({ user, onComplete }: Props) {
  const [instruments, setInstruments] = useState<string[]>([]);
  const [genres, setGenres] = useState<string[]>([]);
  const [region, setRegion] = useState('');
  const [purposes, setPurposes] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const displayName =
    user.user_metadata?.full_name || user.email?.split('@')[0] || '뮤지션';

  async function upsertProfile(opts: { isPublic: boolean }) {
    await supabase.from('user_profiles').upsert(
      {
        user_id: user.id,
        display_name: displayName,
        instruments,
        genres,
        region,
        purposes,
        is_public: opts.isPublic,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );
  }

  async function handleSave() {
    setSaving(true);
    await upsertProfile({ isPublic: instruments.length > 0 });
    setSaving(false);
    onComplete();
  }

  async function handleSkip() {
    await upsertProfile({ isPublic: false });
    onComplete();
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#0A0A0A]/60 flex items-end sm:items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 80 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="w-full sm:max-w-lg bg-[#FFF8F0] rounded-t-[24px] sm:rounded-[24px] border-[3px] border-[#0A0A0A] max-h-[90vh] overflow-y-auto"
        style={{ boxShadow: '0 -6px 0 #0A0A0A' }}
      >
        {/* 헤더 */}
        <div className="sticky top-0 bg-[#FFF8F0] px-5 pt-5 pb-3 border-b-[2px] border-[#0A0A0A]/10 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2
                className="text-[20px] font-bold text-[#0A0A0A]"
                style={{ fontFamily: 'Bungee, sans-serif' }}
              >
                MY PROFILE 🎸
              </h2>
              <p
                className="text-[12px] text-[#0A0A0A]/50 font-bold mt-0.5"
                style={{ fontFamily: 'Pretendard, sans-serif' }}
              >
                연습실 필터 · 밴드 매칭에 활용돼요
              </p>
            </div>
            <button
              onClick={handleSkip}
              className="text-[12px] font-bold text-[#0A0A0A]/40 px-3 py-1.5 rounded-[8px] border-[2px] border-[#0A0A0A]/20"
              style={{ fontFamily: 'Pretendard, sans-serif' }}
            >
              건너뛰기
            </button>
          </div>
        </div>

        <div className="px-5 py-5 flex flex-col gap-6">
          {/* 악기/포지션 */}
          <section>
            <p
              className="text-[13px] font-bold text-[#0A0A0A] mb-3"
              style={{ fontFamily: 'Pretendard, sans-serif' }}
            >
              🎼 주 포지션 <span className="text-[#0A0A0A]/40">(복수 선택)</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {INSTRUMENTS.map((item) => {
                const active = instruments.includes(item.id);
                return (
                  <motion.button
                    key={item.id}
                    onClick={() => setInstruments(toggle(instruments, item.id))}
                    whileTap={{ scale: 0.94 }}
                    className={[
                      'px-3 py-2 rounded-[12px] border-[2px] border-[#0A0A0A] text-[13px] font-bold',
                      active ? 'bg-[#FF3D77] text-white' : 'bg-white text-[#0A0A0A]',
                    ].join(' ')}
                    style={{
                      boxShadow: active ? '2px 2px 0 #0A0A0A' : '2px 2px 0 #0A0A0A',
                      fontFamily: 'Pretendard, sans-serif',
                    }}
                  >
                    {item.emoji} {item.label}
                  </motion.button>
                );
              })}
            </div>
          </section>

          {/* 장르 */}
          <section>
            <p
              className="text-[13px] font-bold text-[#0A0A0A] mb-3"
              style={{ fontFamily: 'Pretendard, sans-serif' }}
            >
              🎵 선호 장르 <span className="text-[#0A0A0A]/40">(복수 선택)</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {GENRES.map((g) => {
                const active = genres.includes(g);
                return (
                  <motion.button
                    key={g}
                    onClick={() => setGenres(toggle(genres, g))}
                    whileTap={{ scale: 0.94 }}
                    className={[
                      'px-3 py-2 rounded-[12px] border-[2px] border-[#0A0A0A] text-[13px] font-bold',
                      active ? 'bg-[#FFD600] text-[#0A0A0A]' : 'bg-white text-[#0A0A0A]',
                    ].join(' ')}
                    style={{ boxShadow: '2px 2px 0 #0A0A0A', fontFamily: 'Pretendard, sans-serif' }}
                  >
                    {g}
                  </motion.button>
                );
              })}
            </div>
          </section>

          {/* 지역 */}
          <section>
            <p
              className="text-[13px] font-bold text-[#0A0A0A] mb-3"
              style={{ fontFamily: 'Pretendard, sans-serif' }}
            >
              📍 주 활동 지역
            </p>
            <div className="flex flex-wrap gap-2">
              {REGIONS.map((r) => {
                const active = region === r;
                return (
                  <motion.button
                    key={r}
                    onClick={() => setRegion(active ? '' : r)}
                    whileTap={{ scale: 0.94 }}
                    className={[
                      'px-3 py-2 rounded-[12px] border-[2px] border-[#0A0A0A] text-[13px] font-bold',
                      active ? 'bg-[#4FC3F7] text-[#0A0A0A]' : 'bg-white text-[#0A0A0A]',
                    ].join(' ')}
                    style={{ boxShadow: '2px 2px 0 #0A0A0A', fontFamily: 'Pretendard, sans-serif' }}
                  >
                    {r}
                  </motion.button>
                );
              })}
            </div>
          </section>

          {/* 목적 */}
          <section>
            <p
              className="text-[13px] font-bold text-[#0A0A0A] mb-3"
              style={{ fontFamily: 'Pretendard, sans-serif' }}
            >
              🎯 이용 목적 <span className="text-[#0A0A0A]/40">(복수 선택)</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {PURPOSES.map((p) => {
                const active = purposes.includes(p.id);
                return (
                  <motion.button
                    key={p.id}
                    onClick={() => setPurposes(toggle(purposes, p.id))}
                    whileTap={{ scale: 0.94 }}
                    className={[
                      'px-3 py-2 rounded-[12px] border-[2px] border-[#0A0A0A] text-[13px] font-bold',
                      active ? 'bg-[#00D26A] text-white' : 'bg-white text-[#0A0A0A]',
                    ].join(' ')}
                    style={{ boxShadow: '2px 2px 0 #0A0A0A', fontFamily: 'Pretendard, sans-serif' }}
                  >
                    {p.emoji} {p.label}
                  </motion.button>
                );
              })}
            </div>
          </section>

          {/* 저장 */}
          <motion.button
            onClick={handleSave}
            disabled={saving}
            whileTap={{ scale: 0.96, y: 2 }}
            className="w-full py-4 bg-[#FF3D77] text-white rounded-[16px] border-[3px] border-[#0A0A0A] font-bold text-[15px] flex items-center justify-center gap-2 disabled:opacity-60"
            style={{ boxShadow: '4px 4px 0 #0A0A0A', fontFamily: 'Bungee, sans-serif' }}
          >
            {saving ? (
              <>
                <span className="w-4 h-4 rounded-full border-[2px] border-white border-t-transparent animate-spin" />
                저장 중...
              </>
            ) : (
              '프로필 저장하기 💥'
            )}
          </motion.button>

          <div className="h-2" />
        </div>
      </motion.div>
    </div>
  );
}
