'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, MapPin } from 'lucide-react';
import FilterChips from '@/components/FilterChips';
import { StudioFilters } from '@/types/studio';

interface SearchHeaderProps {
  initialQuery: string;
  filters: StudioFilters;
  onQueryChange: (q: string) => void;
  onSubmit: () => void;
  onGps: () => void;
  onFilterChange: (filters: StudioFilters) => void;
}

export default function SearchHeader({
  initialQuery,
  filters,
  onQueryChange,
  onSubmit,
  onGps,
  onFilterChange,
}: SearchHeaderProps) {
  const [value, setValue] = useState(initialQuery);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setValue(e.target.value);
    onQueryChange(e.target.value);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') onSubmit();
  }

  return (
    <div className="sticky top-0 z-30 bg-[#FFF8F0] border-b-[3px] border-[#0A0A0A] px-4 py-4 flex flex-col gap-3">
      {/* 검색 입력 */}
      <div className="flex gap-2">
        <div
          className="flex-1 flex items-center gap-2 bg-white rounded-[16px] border-[3px] border-[#0A0A0A] px-4 py-3"
          style={{ boxShadow: '4px 4px 0 #0A0A0A' }}
        >
          <Search className="w-5 h-5 flex-shrink-0 text-[#0A0A0A]/50" />
          <input
            type="text"
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="지역, 이름으로 검색"
            className="flex-1 bg-transparent outline-none text-[14px] text-[#0A0A0A] placeholder:text-[#0A0A0A]/40"
            style={{ fontFamily: 'Pretendard, sans-serif' }}
          />
        </div>

        {/* 내 위치 버튼 */}
        <motion.button
          onClick={onGps}
          whileTap={{ scale: 0.93, y: 1 }}
          className="w-14 flex-shrink-0 flex items-center justify-center bg-[#4FC3F7] rounded-[16px] border-[3px] border-[#0A0A0A]"
          style={{ boxShadow: '4px 4px 0 #0A0A0A' }}
          aria-label="내 위치로 검색"
        >
          <MapPin className="w-5 h-5 text-[#0A0A0A]" />
        </motion.button>

        {/* 재검색 버튼 */}
        <motion.button
          onClick={onSubmit}
          whileTap={{ scale: 0.93, y: 1 }}
          className="flex-shrink-0 px-4 flex items-center justify-center bg-[#FF3D77] rounded-[16px] border-[3px] border-[#0A0A0A]"
          style={{ boxShadow: '4px 4px 0 #0A0A0A' }}
        >
          <span
            className="text-white text-[13px] font-bold"
            style={{ fontFamily: 'Bungee, sans-serif' }}
          >
            GO 💥
          </span>
        </motion.button>
      </div>

      {/* 필터 칩 */}
      <FilterChips filters={filters} onChange={onFilterChange} />
    </div>
  );
}
