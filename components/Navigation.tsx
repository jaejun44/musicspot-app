'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Bell } from 'lucide-react';
import { trackComingSoonClick } from '@/lib/analytics';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import NotificationDropdown from '@/components/NotificationDropdown';
import LocaleToggle from '@/components/LocaleToggle';
import { useT, useIsJapanMode } from '@/lib/i18n';

export default function Navigation() {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, signOut } = useAuth();
  const { unreadCount } = useNotifications();
  const t = useT();
  const isJapanMode = useIsJapanMode();

  async function handleSignOut() {
    await signOut();
    router.push('/');
  }

  // 일본 모드에서는 연습실 관련 메뉴(연습실 찾기, 예약 기반 '마이') 숨김
  const menuItems: { label: string; path: string; jaHidden?: boolean; trackAs?: 'band_matching' | 'community' }[] = [
    { label: t('연습실'), path: '/search', jaHidden: true },
    { label: t('밴드찾기'), path: '/band-matching', trackAs: 'band_matching' as const },
    { label: t('내 밴드'), path: '/my-band' },
    { label: t('8마디'), path: '/stems' },
    { label: t('피드'), path: '/feed' },
    { label: t('커뮤니티'), path: '/community', trackAs: 'community' as const },
    { label: t('마이'), path: '/my-bookings', jaHidden: true },
  ].filter((item) => !(isJapanMode && item.jaHidden));

  // 일본 모드에서는 /my-bookings가 차단되므로 프로필 링크를 공개 프로필로 대체
  const profileHref = isJapanMode && user ? `/u/${user.id}` : '/my-bookings';

  return (
    <nav className="sticky top-0 z-50 bg-[#FFF8F0] border-b-[3px] border-[#0A0A0A] h-20">
      <div className="max-w-[1440px] mx-auto px-8 h-full flex items-center justify-between">
        {/* Logo */}
        <Link href="/">
          <motion.div
            initial={{ rotate: 0 }}
            animate={{ rotate: -2 }}
            whileHover={{ rotate: 0, scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <img
              src="/ms_character/cutout_clean.png"
              alt="MUSIC SPOT"
              className="h-[75px] w-auto object-contain select-none"
            />
          </motion.div>
        </Link>

        {/* Menu Items - Desktop */}
        <div className="hidden md:flex items-center gap-8">
          {menuItems.map((item) => (
            <Link
              key={item.label}
              href={item.path}
              className="relative"
              onMouseEnter={() => setHoveredItem(item.label)}
              onMouseLeave={() => setHoveredItem(null)}
              onClick={() => item.trackAs && trackComingSoonClick(item.trackAs)}
            >
              <span
                className={`cursor-pointer relative z-10 px-3 py-1 ${
                  pathname === item.path ? 'text-[#FF3D77]' : ''
                }`}
                style={{ fontFamily: 'Pretendard, sans-serif', fontWeight: 700 }}
              >
                {item.label}
              </span>
              {hoveredItem === item.label && (
                <motion.div
                  layoutId="hover-bg"
                  className="absolute inset-0 bg-[#F5FF4F] -z-0 border-2 border-[#0A0A0A]"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.2 }}
                  style={{ originX: 0 }}
                />
              )}
            </Link>
          ))}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-4">
          {!loading && (
            user ? (
              <div className="hidden md:flex items-center gap-3">
                {/* 알림 벨 */}
                <div className="relative">
                  <motion.button
                    whileTap={{ scale: 0.88 }}
                    onClick={() => setNotifOpen((v) => !v)}
                    className="relative w-9 h-9 flex items-center justify-center rounded-full border-[2px] border-[#0A0A0A] bg-white"
                    style={{ boxShadow: '2px 2px 0 #0A0A0A' }}
                    aria-label={t('알림')}
                  >
                    <Bell className="w-4 h-4 text-[#0A0A0A]" />
                    {unreadCount > 0 && (
                      <span
                        className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-[#FF3D77] text-white text-[10px] font-bold rounded-full border-[1.5px] border-white"
                        style={{ fontFamily: 'Bungee, sans-serif' }}
                      >
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </motion.button>
                  <NotificationDropdown open={notifOpen} onClose={() => setNotifOpen(false)} />
                </div>

                <Link href={profileHref} className="flex items-center gap-2 group">
                  {user.user_metadata?.avatar_url || user.user_metadata?.picture ? (
                    <img
                      src={user.user_metadata.avatar_url || user.user_metadata.picture}
                      alt={t('프로필')}
                      className="w-9 h-9 rounded-full border-[2px] border-[#0A0A0A] object-cover"
                      style={{ boxShadow: '2px 2px 0 #0A0A0A' }}
                    />
                  ) : (
                    <div
                      className="w-9 h-9 rounded-full bg-[#FF3D77] border-[2px] border-[#0A0A0A] flex items-center justify-center"
                      style={{ boxShadow: '2px 2px 0 #0A0A0A' }}
                    >
                      <span className="text-white text-[14px] font-bold" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                        {(user.user_metadata?.full_name || user.email || '?')[0].toUpperCase()}
                      </span>
                    </div>
                  )}
                  <span
                    className="text-[13px] text-[#0A0A0A]/70 max-w-[100px] truncate group-hover:text-[#FF3D77] transition-colors"
                    style={{ fontFamily: 'Pretendard, sans-serif', fontWeight: 700 }}
                  >
                    {user.user_metadata?.full_name || user.email?.split('@')[0] || t('회원')}
                  </span>
                </Link>
                <LocaleToggle />
                <button
                  onClick={handleSignOut}
                  className="px-3 py-2 text-[12px] border-[2px] border-[#0A0A0A] rounded-[10px] text-[#0A0A0A]/60 hover:bg-[#0A0A0A] hover:text-white transition-colors"
                  style={{ fontFamily: 'Pretendard, sans-serif', fontWeight: 700, boxShadow: '2px 2px 0 #0A0A0A' }}
                >
                  {t('로그아웃')}
                </button>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-3">
                <LocaleToggle />
                <Link
                  href="/login"
                  className="px-4 py-2 text-[14px] font-bold text-[#0A0A0A]/70 hover:text-[#FF3D77] transition-colors"
                  style={{ fontFamily: 'Pretendard, sans-serif' }}
                >
                  {t('로그인')}
                </Link>
              </div>
            )
          )}


          {/* Mobile Hamburger */}
          <button
            className="md:hidden flex flex-col gap-1.5 w-11 h-11 items-center justify-center"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <span className="w-6 h-0.5 bg-[#0A0A0A] block" />
            <span className="w-6 h-0.5 bg-[#0A0A0A] block" />
            <span className="w-6 h-0.5 bg-[#0A0A0A] block" />
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden absolute top-20 left-0 right-0 bg-[#FFF8F0] border-b-[3px] border-[#0A0A0A] z-50"
        >
          {menuItems.map((item) => (
            <Link
              key={item.label}
              href={item.path}
              className="block px-8 py-4 border-b border-[#0A0A0A] hover:bg-[#F5FF4F] transition-colors"
              style={{ fontFamily: 'Pretendard, sans-serif', fontWeight: 700 }}
              onClick={() => { setMenuOpen(false); item.trackAs && trackComingSoonClick(item.trackAs); }}
            >
              {item.label}
            </Link>
          ))}
          {user ? (
            <>
              <Link
                href={profileHref}
                className="flex items-center gap-3 px-8 py-4 border-b border-[#0A0A0A]"
                style={{ fontFamily: 'Pretendard, sans-serif', fontWeight: 700 }}
                onClick={() => setMenuOpen(false)}
              >
                {user.user_metadata?.avatar_url || user.user_metadata?.picture ? (
                  <img
                    src={user.user_metadata.avatar_url || user.user_metadata.picture}
                    alt={t('프로필')}
                    className="w-7 h-7 rounded-full border-[2px] border-[#0A0A0A] object-cover"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-[#FF3D77] border-[2px] border-[#0A0A0A] flex items-center justify-center">
                    <span className="text-white text-[12px] font-bold">
                      {(user.user_metadata?.full_name || user.email || '?')[0].toUpperCase()}
                    </span>
                  </div>
                )}
                {user.user_metadata?.full_name || user.email?.split('@')[0] || t('내 프로필')}
              </Link>
              <button
                className="block w-full text-left px-8 py-4 text-[#0A0A0A]/50"
                style={{ fontFamily: 'Pretendard, sans-serif', fontWeight: 700 }}
                onClick={() => { setMenuOpen(false); handleSignOut(); }}
              >
                {t('로그아웃')}
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="block px-8 py-4"
              style={{ fontFamily: 'Pretendard, sans-serif', fontWeight: 700 }}
              onClick={() => setMenuOpen(false)}
            >
              {t('로그인')}
            </Link>
          )}
          <div className="px-8 py-4 flex justify-end">
            <LocaleToggle />
          </div>
        </motion.div>
      )}
    </nav>
  );
}
