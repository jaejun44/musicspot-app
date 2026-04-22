'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import BookingsTab from './BookingsTab';
import FavoritesTab from './FavoritesTab';
import RecentTab from './RecentTab';
import { useAuth } from '@/hooks/useAuth';
import OnboardingModal from '@/components/OnboardingModal';
import { supabase } from '@/lib/supabase';

type Tab = 'bookings' | 'favorites' | 'recent';

const TABS: { id: Tab; label: string; emoji: string }[] = [
  { id: 'bookings', label: '예약현황', emoji: '📋' },
  { id: 'favorites', label: '즐겨찾기', emoji: '❤️' },
  { id: 'recent', label: '최근 본', emoji: '👀' },
];

export default function MyBookingsClient() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('bookings');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { user, loading, signOut } = useAuth();

  useEffect(() => {
    if (!user || loading) return;
    supabase
      .from('user_profiles')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) setShowOnboarding(true);
      });
  }, [user, loading]);

  async function handleSignOut() {
    await signOut();
    router.push('/');
  }

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'GUEST';
  const isLoggedIn = !!user;

  return (
    <>
    <div className="min-h-screen bg-[#FFF8F0]">
      <Navigation />

      {/* 프로필 영역 */}
      <div className="px-4 pt-6 pb-4 max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 22 }}
          className="bg-white rounded-[20px] border-[3px] border-[#0A0A0A] p-5 flex items-center gap-4"
          style={{ boxShadow: '6px 6px 0 #0A0A0A' }}
        >
          <div
            className="w-14 h-14 rounded-full bg-[#FFD600] border-[3px] border-[#0A0A0A] flex items-center justify-center flex-shrink-0"
            style={{ boxShadow: '3px 3px 0 #0A0A0A' }}
          >
            <span className="text-[24px]">🎸</span>
          </div>
          <div className="flex-1 min-w-0">
            <p
              className="text-[16px] font-bold text-[#0A0A0A] truncate"
              style={{ fontFamily: 'Bungee, sans-serif' }}
            >
              {loading ? '...' : displayName.toUpperCase()}
            </p>
            <p
              className="text-[12px] text-[#0A0A0A]/50 font-bold mt-0.5"
              style={{ fontFamily: 'Pretendard, sans-serif' }}
            >
              {isLoggedIn ? (user?.email ?? '') : '로그인하면 더 많은 기능을 이용할 수 있어요'}
            </p>
          </div>
          {!loading && (
            isLoggedIn ? (
              <motion.button
                onClick={handleSignOut}
                whileTap={{ scale: 0.95, y: 1 }}
                className="flex-shrink-0 px-4 py-2 bg-white rounded-[12px] border-[2px] border-[#0A0A0A] text-[#0A0A0A] font-bold text-[13px]"
                style={{ boxShadow: '2px 2px 0 #0A0A0A', fontFamily: 'Pretendard, sans-serif' }}
              >
                로그아웃
              </motion.button>
            ) : (
              <motion.button
                onClick={() => router.push('/login')}
                whileTap={{ scale: 0.95, y: 1 }}
                className="flex-shrink-0 px-4 py-2 bg-[#FF3D77] rounded-[12px] border-[2px] border-[#0A0A0A] text-white font-bold text-[13px]"
                style={{ boxShadow: '2px 2px 0 #0A0A0A', fontFamily: 'Bungee, sans-serif' }}
              >
                로그인
              </motion.button>
            )
          )}
        </motion.div>
      </div>

      {/* 탭 */}
      <div className="px-4 max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex gap-2 mb-5"
        >
          {TABS.map((tab) => (
            <motion.button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              whileTap={{ scale: 0.95 }}
              className={[
                'flex-1 py-2.5 rounded-[12px] border-[2px] border-[#0A0A0A] font-bold text-[13px] transition-colors',
                activeTab === tab.id
                  ? 'bg-[#0A0A0A] text-white'
                  : 'bg-white text-[#0A0A0A]',
              ].join(' ')}
              style={{
                boxShadow: activeTab === tab.id ? '3px 3px 0 #FF3D77' : '2px 2px 0 #0A0A0A',
                fontFamily: 'Pretendard, sans-serif',
              }}
            >
              {tab.emoji} {tab.label}
            </motion.button>
          ))}
        </motion.div>

        {/* 탭 콘텐츠 */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.18 }}
          >
            {activeTab === 'bookings' && <BookingsTab />}
            {activeTab === 'favorites' && <FavoritesTab />}
            {activeTab === 'recent' && <RecentTab />}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="h-12" />
    </div>

    {showOnboarding && user && (
      <OnboardingModal user={user} onComplete={() => setShowOnboarding(false)} />
    )}
    </>
  );
}
