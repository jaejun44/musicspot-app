'use client';

import { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import DecorativeElements from '@/components/DecorativeElements';
import HeroSection from '@/components/HeroSection';
import SearchBar from '@/components/SearchBar';
import PowerFeatures from '@/components/PowerFeatures';
import HotRooms from '@/components/HotRooms';
import FinalCTA from '@/components/FinalCTA';
import SiteFooter from '@/components/SiteFooter';
import ThemeSongPlayer from '@/components/ThemeSongPlayer';
import WelcomeSheet from '@/components/WelcomeSheet';
import ReturnStrip from '@/components/ReturnStrip';
import NewsLatest from '@/components/NewsLatest';
import { useIsJapanMode } from '@/lib/i18n';

export default function HomeClient() {
  const [scrollY, setScrollY] = useState(0);
  // 일본 모드: 연습실 검색/HOT 연습실 섹션 숨김
  const isJapanMode = useIsJapanMode();

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div
      className="relative overflow-x-hidden"
      style={{
        backgroundImage: 'url(/ms_character/bg-folkart-tile.png)',
        backgroundRepeat: 'repeat',
        backgroundSize: '120px 120px',
      }}
    >
      <Navigation />
      <DecorativeElements scrollY={scrollY} />
      {/* 다시 온 사람: 최근 본·찜한 연습실을 히어로 위에 (처음 온 사람은 안 보임) */}
      {!isJapanMode && <ReturnStrip placement="home" />}
      <HeroSection />
      {/* 매일 새로 볼 것: 밴드씬 뉴스 최신 2개 (ja에서도 보임 — 글은 한국어 그대로) */}
      <div className="relative z-10 px-4 sm:px-6 py-6 max-w-5xl mx-auto">
        <NewsLatest from="home" />
      </div>
      {!isJapanMode && (
        <>
          <SearchBar />
          <HotRooms />
        </>
      )}
      <PowerFeatures />
      <ThemeSongPlayer />
      <FinalCTA />
      <SiteFooter />
      <WelcomeSheet />
    </div>
  );
}
