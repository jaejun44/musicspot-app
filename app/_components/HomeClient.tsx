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

export default function HomeClient() {
  const [scrollY, setScrollY] = useState(0);

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
      <HeroSection />
      <ThemeSongPlayer />
      <PowerFeatures />
      <SearchBar />
      <HotRooms />
      <FinalCTA />
      <SiteFooter />
      <WelcomeSheet />
    </div>
  );
}
