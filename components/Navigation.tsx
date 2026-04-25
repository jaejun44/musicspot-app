'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { trackComingSoonClick } from '@/lib/analytics';
import { useAuth } from '@/hooks/useAuth';

export default function Navigation() {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, signOut } = useAuth();

  async function handleSignOut() {
    await signOut();
    router.push('/');
  }

  const menuItems: { label: string; path: string; trackAs?: 'band_matching' | 'community' }[] = [
    { label: '연습실', path: '/search' },
    { label: '밴드찾기', path: '/band-matching', trackAs: 'band_matching' },
    { label: '커뮤니티', path: '/community', trackAs: 'community' },
    { label: '마이', path: '/my-bookings' },
  ];

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
              src="/ms_character/cutout.png"
              alt="MUSIC SPOT"
              className="h-28 w-auto object-contain select-none"
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
                  className="absolute inset-0 bg-[#FFD600] -z-0 border-2 border-[#0A0A0A]"
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
                <Link href="/my-bookings" className="flex items-center gap-2 group">
                  {user.user_metadata?.avatar_url || user.user_metadata?.picture ? (
                    <img
                      src={user.user_metadata.avatar_url || user.user_metadata.picture}
                      alt="프로필"
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
                    {user.user_metadata?.full_name || user.email?.split('@')[0] || '회원'}
                  </span>
                </Link>
                <button
                  onClick={handleSignOut}
                  className="px-3 py-1.5 text-[12px] border-[2px] border-[#0A0A0A] rounded-[10px] text-[#0A0A0A]/60 hover:bg-[#0A0A0A] hover:text-white transition-colors"
                  style={{ fontFamily: 'Pretendard, sans-serif', fontWeight: 700, boxShadow: '2px 2px 0 #0A0A0A' }}
                >
                  로그아웃
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="hidden md:block px-4 py-2 text-[14px] font-bold text-[#0A0A0A]/70 hover:text-[#FF3D77] transition-colors"
                style={{ fontFamily: 'Pretendard, sans-serif' }}
              >
                로그인
              </Link>
            )
          )}
          <Link href="/search">
            <motion.button
              whileHover={{ y: 5, boxShadow: '2px 2px 0 #0A0A0A' }}
              whileTap={{ scale: 0.95 }}
              className="px-6 py-3 bg-[#FF3D77] text-white rounded-2xl border-[3px] border-[#0A0A0A]"
              style={{
                boxShadow: '4px 4px 0 #0A0A0A',
                fontFamily: 'Bungee, sans-serif',
                fontSize: '14px',
              }}
            >
              시작하기
            </motion.button>
          </Link>

          {/* Mobile Hamburger */}
          <button
            className="md:hidden flex flex-col gap-1.5 p-2"
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
              className="block px-8 py-4 border-b border-[#0A0A0A] hover:bg-[#FFD600] transition-colors"
              style={{ fontFamily: 'Pretendard, sans-serif', fontWeight: 700 }}
              onClick={() => { setMenuOpen(false); item.trackAs && trackComingSoonClick(item.trackAs); }}
            >
              {item.label}
            </Link>
          ))}
          {user ? (
            <>
              <Link
                href="/my-bookings"
                className="flex items-center gap-3 px-8 py-4 border-b border-[#0A0A0A]"
                style={{ fontFamily: 'Pretendard, sans-serif', fontWeight: 700 }}
                onClick={() => setMenuOpen(false)}
              >
                {user.user_metadata?.avatar_url || user.user_metadata?.picture ? (
                  <img
                    src={user.user_metadata.avatar_url || user.user_metadata.picture}
                    alt="프로필"
                    className="w-7 h-7 rounded-full border-[2px] border-[#0A0A0A] object-cover"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-[#FF3D77] border-[2px] border-[#0A0A0A] flex items-center justify-center">
                    <span className="text-white text-[12px] font-bold">
                      {(user.user_metadata?.full_name || user.email || '?')[0].toUpperCase()}
                    </span>
                  </div>
                )}
                {user.user_metadata?.full_name || user.email?.split('@')[0] || '내 프로필'}
              </Link>
              <button
                className="block w-full text-left px-8 py-4 text-[#0A0A0A]/50"
                style={{ fontFamily: 'Pretendard, sans-serif', fontWeight: 700 }}
                onClick={() => { setMenuOpen(false); handleSignOut(); }}
              >
                로그아웃
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="block px-8 py-4"
              style={{ fontFamily: 'Pretendard, sans-serif', fontWeight: 700 }}
              onClick={() => setMenuOpen(false)}
            >
              로그인
            </Link>
          )}
        </motion.div>
      )}
    </nav>
  );
}
