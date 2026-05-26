'use client';

import { motion } from 'framer-motion';
import { StudioFilters } from '@/types/studio';
import { trackFilterApply } from '@/lib/analytics';

interface FilterChipsProps {
  filters: StudioFilters;
  onChange: (filters: StudioFilters) => void;
}

const REGION_VALUES = ['서울', '홍대', '강남', '합정', '신촌', '성수'] as const;
type RegionChip = (typeof REGION_VALUES)[number];
type ChipKey = 'all' | 'T' | 'M' | 'drum' | 'price' | RegionChip;

interface Chip {
  key: ChipKey;
  label: string;
}

const CHIPS: Chip[] = [
  { key: 'all', label: '전체' },
  { key: 'T', label: 'T룸' },
  { key: 'M', label: 'M룸' },
  { key: 'drum', label: '🥁 드럼' },
  { key: 'price', label: '가격순' },
  { key: '서울', label: '서울 전체' },
  { key: '홍대', label: '홍대' },
  { key: '강남', label: '강남' },
  { key: '합정', label: '합정' },
  { key: '신촌', label: '신촌' },
  { key: '성수', label: '성수' },
];

function isActive(chip: ChipKey, filters: StudioFilters): boolean {
  if (chip === 'T') return filters.room_type === 'T';
  if (chip === 'M') return filters.room_type === 'M';
  if (chip === 'drum') return !!filters.has_drum;
  if (chip === 'price') return filters.sort_by === 'price';
  if ((REGION_VALUES as readonly string[]).includes(chip)) return filters.region === chip;
  // 'all' is active when nothing else is selected
  return !filters.room_type && !filters.has_drum && !filters.sort_by && !filters.region && !filters.max_price;
}

function toggle(chip: ChipKey, current: StudioFilters): StudioFilters {
  if (chip === 'all') {
    return {};
  }
  if (chip === 'T') {
    return { ...current, room_type: current.room_type === 'T' ? null : 'T' };
  }
  if (chip === 'M') {
    return { ...current, room_type: current.room_type === 'M' ? null : 'M' };
  }
  if (chip === 'drum') {
    return { ...current, has_drum: !current.has_drum };
  }
  if (chip === 'price') {
    return { ...current, sort_by: current.sort_by === 'price' ? undefined : 'price' };
  }
  if ((REGION_VALUES as readonly string[]).includes(chip)) {
    return { ...current, region: current.region === chip ? undefined : chip };
  }
  return current;
}

export default function FilterChips({ filters, onChange }: FilterChipsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
      {CHIPS.map((chip) => {
        const active = isActive(chip.key, filters);
        return (
          <motion.button
            key={chip.key}
            onClick={() => {
              trackFilterApply(chip.key, active ? 'off' : 'on');
              onChange(toggle(chip.key, filters));
            }}
            whileTap={{ scale: 0.93, y: 1 }}
            className={[
              'flex-shrink-0 px-4 py-2.5 rounded-[12px] border-[2px] border-[#0A0A0A]',
              'text-[13px] font-bold whitespace-nowrap transition-colors',
              active
                ? 'bg-[#F5FF4F] text-[#0A0A0A]'
                : 'bg-white text-[#0A0A0A]',
            ].join(' ')}
            style={{ boxShadow: active ? '3px 3px 0 #0A0A0A' : '2px 2px 0 #0A0A0A' }}
          >
            {chip.label}
          </motion.button>
        );
      })}
    </div>
  );
}
