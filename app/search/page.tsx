import { Suspense } from 'react';
import SearchClient from './_components/SearchClient';

export const metadata = {
  title: '연습실 검색 | Music Spot',
  description: '내 주변 합주실·연습실을 빠르게 찾아보세요.',
};

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FFF8F0]" />}>
      <SearchClient />
    </Suspense>
  );
}
