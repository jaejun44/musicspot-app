'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { trackComingSoonClick } from '@/lib/analytics';

export default function Navigation() {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

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
          <motion.div initial={{ rotate: 0 }} animate={{ rotate: -2 }} className="relative">
            <h1
              className="text-4xl uppercase select-none"
              style={{
                fontFamily: 'Bungee, sans-serif',
                color: '#FF3D77',
                WebkitTextStroke: '3px #0A0A0A',
                paintOrder: 'stroke fill',
              }}
            >
              MUSIC SPOT
            </h1>
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
          <Link
            href="/login"
            className="hidden md:block px-4 py-2"
            style={{ fontFamily: 'Pretendard, sans-serif', fontWeight: 700 }}
          >
            로그인
          </Link>
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
          <Link
            href="/login"
            className="block px-8 py-4"
            style={{ fontFamily: 'Pretendard, sans-serif', fontWeight: 700 }}
            onClick={() => setMenuOpen(false)}
          >
            로그인
          </Link>
        </motion.div>
      )}
    </nav>
  );
}
