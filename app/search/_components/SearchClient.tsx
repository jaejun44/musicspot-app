'use client';

import { useState } from 'react';
import { useRoomSearch } from '../_hooks/useRoomSearch';
import SearchHeader from './SearchHeader';
import RoomList from './RoomList';
import RoomMapView from './RoomMapView';
import ViewToggle from './ViewToggle';
import Navigation from '@/components/Navigation';
import { Studio } from '@/types/studio';
import Link from 'next/link';
import { trackMapMarkerClick } from '@/lib/analytics';

export default function SearchClient() {
  const {
    studios,
    loading,
    hasMore,
    totalCount,
    query,
    userLat,
    userLng,
    filters,
    loadMore,
    onFilterChange,
    onQueryChange,
    onSubmit,
    onGps,
  } = useRoomSearch();

  const [view, setView] = useState<'list' | 'map'>('list');
  const [selectedStudio, setSelectedStudio] = useState<Studio | null>(null);

  return (
    <div className="min-h-screen bg-[#FFF8F0] flex flex-col">
      <Navigation />

      {/* 검색헤더 (sticky) */}
      <SearchHeader
        initialQuery={query}
        filters={filters}
        onQueryChange={onQueryChange}
        onSubmit={onSubmit}
        onGps={onGps}
        onFilterChange={onFilterChange}
      />

      {/* 뷰 토글 바 */}
      <div className="flex items-center justify-between px-4 py-3 border-b-[2px] border-[#0A0A0A]/10">
        <p
          className="text-[13px] text-[#0A0A0A]/50"
          style={{ fontFamily: 'Pretendard, sans-serif' }}
        >
          {userLat ? '📍 내 위치 기준' : query ? `"${query}" 검색 결과` : '전체 연습실'}
        </p>
        <ViewToggle view={view} onChange={setView} />
      </div>

      {/* 본문 */}
      <div className="flex-1 flex flex-col min-h-0">
        {view === 'list' ? (
          <RoomList
            studios={studios}
            loading={loading}
            hasMore={hasMore}
            totalCount={totalCount}
            userLat={userLat}
            userLng={userLng}
            onLoadMore={loadMore}
          />
        ) : (
          <div className="flex-1 flex flex-col relative min-h-0" style={{ height: 'calc(100vh - 180px)' }}>
            <RoomMapView
              studios={studios}
              userLat={userLat}
              userLng={userLng}
              onMarkerClick={(s) => { trackMapMarkerClick(s.id, s.name); setSelectedStudio(s); }}
            />

            {/* 마커 클릭 시 미니 카드 */}
            {selectedStudio && (
              <div className="absolute bottom-4 left-4 right-4 z-10">
                <Link href={`/room/${selectedStudio.id}`}>
                  <div
                    className="bg-white rounded-[16px] border-[3px] border-[#0A0A0A] p-4 flex gap-3 items-center"
                    style={{ boxShadow: '4px 4px 0 #0A0A0A' }}
                  >
                    {selectedStudio.photos?.[0] && (
                      <img
                        src={selectedStudio.photos[0]}
                        alt={selectedStudio.name}
                        className="w-16 h-16 rounded-[10px] border-[2px] border-[#0A0A0A] object-cover flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p
                        className="font-bold text-[15px] truncate"
                        style={{ fontFamily: 'Pretendard, sans-serif' }}
                      >
                        {selectedStudio.name}
                      </p>
                      <p className="text-[12px] text-[#0A0A0A]/50 truncate">
                        📍 {selectedStudio.region ?? selectedStudio.address ?? ''}
                      </p>
                    </div>
                    <span
                      className="flex-shrink-0 text-[#FF3D77] font-bold text-[14px]"
                      style={{ fontFamily: 'Bungee, sans-serif' }}
                    >
                      {selectedStudio.price_per_hour
                        ? `₩${selectedStudio.price_per_hour.toLocaleString()}`
                        : selectedStudio.price_info ?? '문의'}
                    </span>
                  </div>
                </Link>
                <button
                  onClick={() => setSelectedStudio(null)}
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#0A0A0A] text-white text-[11px] flex items-center justify-center"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
