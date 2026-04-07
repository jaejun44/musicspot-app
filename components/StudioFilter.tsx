'use client';

import { useState } from 'react';
import { StudioFilters } from '@/types/studio';
import { trackFilterApply } from '@/lib/analytics';

interface Props {
  filters: StudioFilters;
  onChange: (filters: StudioFilters) => void;
}

export default function StudioFilter({ filters, onChange }: Props) {
  const [open, setOpen] = useState(false);

  function update(key: keyof StudioFilters, value: any) {
    const next = { ...filters, [key]: value };
    onChange(next);
    trackFilterApply(key, String(value));
  }

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-4 py-2 bg-brand-card border border-brand-border rounded-lg text-sm"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
        필터
      </button>

      {open && (
        <div className="mt-2 p-4 bg-brand-card border border-brand-border rounded-xl space-y-4">
          {/* Room Type */}
          <div>
            <label className="text-xs text-brand-muted block mb-1.5">룸 타입</label>
            <div className="flex gap-2">
              {([null, 'T', 'M'] as const).map((val) => (
                <button
                  key={val ?? 'all'}
                  onClick={() => update('room_type', val)}
                  className={`px-3 py-1.5 text-xs rounded-lg border ${
                    filters.room_type === val
                      ? 'bg-brand-red border-brand-red text-white'
                      : 'border-brand-border text-brand-muted'
                  }`}
                >
                  {val === null ? '전체' : val === 'T' ? 'T룸' : 'M룸'}
                </button>
              ))}
            </div>
          </div>

          {/* Drum */}
          <div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={filters.has_drum ?? false}
                onChange={(e) => update('has_drum', e.target.checked || undefined)}
                className="accent-brand-red"
              />
              드럼 가능만
            </label>
          </div>

          {/* Price */}
          <div>
            <label className="text-xs text-brand-muted block mb-1.5">
              시간당 가격 (최대)
            </label>
            <select
              value={filters.max_price ?? ''}
              onChange={(e) =>
                update('max_price', e.target.value ? Number(e.target.value) : undefined)
              }
              className="w-full px-3 py-2 bg-brand-bg border border-brand-border rounded-lg text-sm"
            >
              <option value="">제한 없음</option>
              <option value="10000">₩10,000 이하</option>
              <option value="15000">₩15,000 이하</option>
              <option value="20000">₩20,000 이하</option>
              <option value="30000">₩30,000 이하</option>
            </select>
          </div>

          {/* Radius */}
          <div>
            <label className="text-xs text-brand-muted block mb-1.5">거리</label>
            <div className="flex gap-2">
              {[1, 3, 5].map((km) => (
                <button
                  key={km}
                  onClick={() => update('radius', km)}
                  className={`px-3 py-1.5 text-xs rounded-lg border ${
                    filters.radius === km
                      ? 'bg-brand-red border-brand-red text-white'
                      : 'border-brand-border text-brand-muted'
                  }`}
                >
                  {km}km
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
