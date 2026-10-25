'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MapPin, Guitar, Music, MessageSquare, Newspaper, User, type LucideIcon } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useT, useIsJapanMode } from '@/lib/i18n';
import { track } from '@/lib/analytics';
import type { NavTab } from '@/lib/analytics/events';

// 모바일 하단 탭바. 목록 성격의 상위 페이지에서만 보이고,
// 상세 화면(연습실 상세의 문의 바 등 자체 하단 버튼이 있는 곳)에서는 숨긴다.
// 떠 있는 동안 globals.css의 --tabbar-h가 생겨 다른 하단 고정 요소가 그 위로 비켜 선다.

const EXACT_PATHS = ['/', '/search', '/band-matching', '/stems', '/community', '/feed', '/my-band', '/my-bookings'];

function isTabBarPage(pathname: string) {
  return EXACT_PATHS.includes(pathname) || pathname === '/region' || pathname.startsWith('/region/');
}

interface Tab {
  key: NavTab;
  label: string;
  href: string;
  icon: LucideIcon;
  isActive: (pathname: string) => boolean;
}

export default function BottomTabBar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const t = useT();
  const isJapanMode = useIsJapanMode();

  if (!pathname || !isTabBarPage(pathname)) return null;

  // 일본 모드는 연습실·예약 경로가 차단되므로 연습실 대신 피드, 마이는 공개 프로필로 (Navigation과 같은 규칙)
  const myHref = isJapanMode ? (user ? `/u/${user.id}` : '/login') : '/my-bookings';
  const tabs: Tab[] = [
    ...(isJapanMode
      ? []
      : [{ key: 'studio' as const, label: t('연습실'), href: '/search', icon: MapPin, isActive: (p: string) => p === '/search' || p.startsWith('/region') }]),
    { key: 'band', label: t('밴드찾기'), href: '/band-matching', icon: Guitar, isActive: (p) => p === '/band-matching' },
    { key: 'stems', label: t('8마디'), href: '/stems', icon: Music, isActive: (p) => p === '/stems' },
    { key: 'community', label: t('커뮤니티'), href: '/community', icon: MessageSquare, isActive: (p) => p === '/community' },
    ...(isJapanMode
      ? [{ key: 'feed' as const, label: t('피드'), href: '/feed', icon: Newspaper, isActive: (p: string) => p === '/feed' }]
      : []),
    { key: 'my', label: t('마이'), href: myHref, icon: User, isActive: (p) => p === '/my-bookings' },
  ];

  return (
    <nav
      data-bottom-tab-bar
      aria-label={t('주요 메뉴')}
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#FFF8F0] border-t-[3px] border-[#0A0A0A]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="flex h-[60px]">
        {tabs.map((tab) => {
          const active = tab.isActive(pathname);
          const Icon = tab.icon;
          return (
            <li key={tab.key} className="flex-1">
              <Link
                href={tab.href}
                onClick={() => track('nav_tab_click', { tab: tab.key })}
                aria-current={active ? 'page' : undefined}
                className={`h-full flex flex-col items-center justify-center gap-1 font-bold text-[12px] ${
                  active ? 'text-[#FF3D77]' : 'text-[#0A0A0A]'
                }`}
              >
                <Icon className="w-5 h-5" strokeWidth={active ? 2.75 : 2} />
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
