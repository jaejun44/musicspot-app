'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import PositionFilter from './PositionFilter';
import MusicianCard from './MusicianCard';
import ChatModal from './ChatModal';
import OnboardingModal from '@/components/OnboardingModal';
import { MUSICIANS, Musician, Position } from '../_data/musicians';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

const POSITION_EMOJIS: Record<string, string> = {
  '보컬': '🎤', '기타': '🎸', '베이스': '🎵', '드럼': '🥁', '건반': '🎹', '기타(other)': '🎶',
};
const CARD_COLORS = ['#FF3D77', '#4FC3F7', '#F5FF4F', '#41C66B'];

function profileToMusician(p: {
  id: string;
  user_id: string;
  display_name: string | null;
  bio: string | null;
  instruments: string[];
  genres: string[];
  region: string | null;
  purposes: string[];
  looking_for: string | null;
  avatar_url: string | null;
}, idx: number): Musician {
  const pos = (p.instruments[0] ?? '기타(other)') as Position;
  return {
    id: p.user_id,
    name: p.display_name ?? '뮤지션',
    position: pos,
    genre: p.genres,
    location: p.region ?? '미정',
    level: '중급',
    bio: p.bio ?? (p.purposes.join(', ') || '밴드 멤버를 찾고 있어요 🎶'),
    lookingFor: p.looking_for || p.purposes.join(', ') || '함께 연주할 분 구해요',
    emoji: POSITION_EMOJIS[pos] ?? '🎶',
    color: CARD_COLORS[idx % CARD_COLORS.length],
    avatar_url: p.avatar_url ?? undefined,
  };
}

export default function BandMatchingClient() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [activePosition, setActivePosition] = useState<Position | 'all'>('all');
  const [contactTarget, setContactTarget] = useState<Musician | null>(null);
  const [musicians, setMusicians] = useState<Musician[]>(MUSICIANS);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [myProfile, setMyProfile] = useState<{ is_public: boolean } | null>(null);

  useEffect(() => {
    if (!user) { setMyProfile(null); return; }
    supabase
      .from('user_profiles')
      .select('is_public')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => setMyProfile(data ?? null));
  }, [user?.id]);

  useEffect(() => {
    async function fetchProfiles() {
      const { data } = await supabase
        .from('user_profiles')
        .select('id, user_id, display_name, bio, instruments, genres, region, purposes, looking_for, avatar_url')
        .eq('is_public', true)
        .not('instruments', 'eq', '{}');
      if (data && data.length > 0) {
        const real = data.map((p, i) => profileToMusician(p, i));
        // real profiles first, then dummy to fill gaps
        setMusicians([...real, ...MUSICIANS].slice(0, 20));
      }
    }
    fetchProfiles();
  }, []);

  async function handleCancelProfile() {
    if (!user) return;
    if (!confirm('밴드찾기 프로필을 숨길까요?\n언제든지 다시 등록할 수 있어요.')) return;
    await supabase.from('user_profiles').update({ is_public: false }).eq('user_id', user.id);
    setMyProfile({ is_public: false });
    setMusicians((prev) => prev.filter((m) => m.id !== user.id));
  }

  async function handleProfileRegister() {
    if (loading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    setShowOnboarding(true);
  }

  const filtered =
    activePosition === 'all'
      ? musicians
      : musicians.filter((m) => m.position === activePosition);

  return (
    <>
    <div className="min-h-screen bg-[#FFF8F0]">
      <Navigation />

      {/* 헤더 */}
      <div className="px-4 pt-6 pb-3 max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        >
          <h1
            className="text-[28px] font-bold text-[#0A0A0A]"
            style={{ fontFamily: 'Bungee, sans-serif' }}
          >
            BAND MATCHING 🎸
          </h1>
          <p
            className="text-[13px] text-[#0A0A0A]/50 mt-1 font-bold"
            style={{ fontFamily: 'Pretendard, sans-serif' }}
          >
            함께 연주할 뮤지션을 찾아보세요
          </p>
        </motion.div>
      </div>

      {/* 필터 */}
      <div className="px-4 pb-4 max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <PositionFilter active={activePosition} onChange={setActivePosition} />
        </motion.div>
      </div>

      {/* 카운트 */}
      <div className="px-4 pb-3 max-w-2xl mx-auto">
        <motion.p
          key={activePosition}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-[12px] text-[#0A0A0A]/40 font-bold"
          style={{ fontFamily: 'Pretendard, sans-serif' }}
        >
          {filtered.length}명의 뮤지션
        </motion.p>
      </div>

      {/* 카드 그리드 */}
      <div className="px-4 pb-16 max-w-2xl mx-auto">
        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filtered.map((m, i) => (
              <MusicianCard
                key={m.id}
                musician={m}
                index={i}
                onContact={setContactTarget}
                currentUserId={user?.id}
              />
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20"
          >
            <span className="text-[48px] mb-4">🔍</span>
            <p
              className="text-[16px] font-bold text-[#0A0A0A]/40 text-center"
              style={{ fontFamily: 'Bungee, sans-serif' }}
            >
              NO MUSICIANS FOUND
            </p>
          </motion.div>
        )}
      </div>

      {/* 프로필 등록/관리 배너 */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#FFF8F0] border-t-[3px] border-[#0A0A0A] px-4 py-3">
        <div className="max-w-2xl mx-auto">
          {user && myProfile?.is_public ? (
            <div className="flex gap-2">
              <motion.button
                whileTap={{ scale: 0.96, y: 2 }}
                onClick={handleProfileRegister}
                className="flex-1 py-4 bg-[#4FC3F7] rounded-[16px] border-[3px] border-[#0A0A0A] text-[#0A0A0A] font-bold text-[14px]"
                style={{ boxShadow: '4px 4px 0 #0A0A0A', fontFamily: 'Bungee, sans-serif' }}
              >
                ✏️ 프로필 수정
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.96, y: 2 }}
                onClick={handleCancelProfile}
                className="flex-1 py-4 bg-white rounded-[16px] border-[3px] border-[#0A0A0A] text-[#0A0A0A]/60 font-bold text-[14px]"
                style={{ boxShadow: '4px 4px 0 #0A0A0A', fontFamily: 'Bungee, sans-serif' }}
              >
                ❌ 밴드찾기 취소
              </motion.button>
            </div>
          ) : (
            <motion.button
              whileTap={{ scale: 0.96, y: 2 }}
              onClick={handleProfileRegister}
              className="w-full py-4 bg-[#242447] rounded-[16px] border-[3px] border-[#0A0A0A] text-white font-bold text-[15px]"
              style={{ boxShadow: '4px 4px 0 #0A0A0A', fontFamily: 'Bungee, sans-serif' }}
            >
              🎵 내 프로필 등록하기
            </motion.button>
          )}
        </div>
      </div>

      <ChatModal musician={contactTarget} user={user} onClose={() => setContactTarget(null)} />
    </div>

    {showOnboarding && user && (
      <OnboardingModal
        user={user}
        onClose={() => setShowOnboarding(false)}
        onComplete={() => {
          setShowOnboarding(false);
          supabase
            .from('user_profiles')
            .select('id, user_id, display_name, bio, instruments, genres, region, purposes, looking_for, avatar_url, is_public')
            .eq('is_public', true)
            .not('instruments', 'eq', '{}')
            .then(({ data }) => {
              if (data && data.length > 0) {
                setMusicians([...data.map((p, i) => profileToMusician(p, i)), ...MUSICIANS].slice(0, 20));
              }
              // refresh my own profile state
              if (user) {
                supabase.from('user_profiles').select('is_public').eq('user_id', user.id).single()
                  .then(({ data: pd }) => setMyProfile(pd ?? null));
              }
            });
        }}
      />
    )}
    </>
  );
}
