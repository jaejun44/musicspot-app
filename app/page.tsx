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

export default function HomePage() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="relative overflow-x-hidden">
      <Navigation />
      <DecorativeElements scrollY={scrollY} />
      <HeroSection />
      <PowerFeatures />
      <SearchBar />
      <HotRooms />
      <FinalCTA />
      <SiteFooter />
    </div>
  );
}
