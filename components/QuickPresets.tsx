'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { trackEvent } from '@/lib/analytics';

interface Preset {
  label: string;
  region: string | null;
  filters: { room_type?: string; has_drum?: boolean };
}

const PRESETS: Preset[] = [
  { label: '홍대 합주룸', region: '홍대', filters: { room_type: 'M' } },
  { label: '홍대 개인연습', region: '홍대', filters: { room_type: 'T' } },
  { label: '합정 연습실', region: '합정', filters: {} },
  { label: '강남 연습실', region: '강남', filters: {} },
  { label: '드럼 가능', region: null, filters: { has_drum: true } },
  { label: '내 근처 연습실', region: 'gps', filters: {} },
];

function buildParams(preset: Preset): string {
  const params = new URLSearchParams();
  if (preset.region === 'gps') {
    params.set('search', 'gps');
  } else if (preset.region) {
    params.set('region', preset.region);
  }
  if (preset.filters.room_type) params.set('room_type', preset.filters.room_type);
  if (preset.filters.has_drum) params.set('has_drum', 'true');
  return params.toString();
}

function isActive(preset: Preset, searchParams: URLSearchParams): boolean {
  const region = searchParams.get('region') || '';
  const roomType = searchParams.get('room_type') || '';
  const hasDrum = searchParams.get('has_drum') === 'true';
  const isGps = searchParams.get('search') === 'gps';

  if (preset.region === 'gps') return isGps;
  if (preset.region && preset.region !== region) return false;
  if (!preset.region && region) return false;
  if (preset.filters.room_type && preset.filters.room_type !== roomType) return false;
  if (preset.filters.has_drum && !hasDrum) return false;
  if (!preset.filters.room_type && roomType) return false;
  if (!preset.filters.has_drum && hasDrum) return false;
  return true;
}

interface Props {
  showActive?: boolean;
}

export default function QuickPresets({ showActive = false }: Props) {
  const router = useRouter();
  const searchParams = showActive ? useSearchParams() : null;

  async function handleClick(preset: Preset) {
    trackEvent('quick_preset_click', {
      preset_label: preset.label,
      region: preset.region || '',
      room_type: preset.filters.room_type || '',
    });

    if (preset.region === 'gps') {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
          })
        );
        const params = new URLSearchParams();
        params.set('lat', String(pos.coords.latitude));
        params.set('lng', String(pos.coords.longitude));
        params.set('radius', '3');
        if (preset.filters.room_type) params.set('room_type', preset.filters.room_type);
        if (preset.filters.has_drum) params.set('has_drum', 'true');
        router.push(`/studios?${params.toString()}`);
      } catch {
        alert('위치 정보를 가져올 수 없습니다.');
      }
      return;
    }

    router.push(`/studios?${buildParams(preset)}`);
  }

  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide snap-x pb-1">
      {PRESETS.map((preset) => {
        const active = showActive && searchParams ? isActive(preset, searchParams) : false;
        return (
          <button
            key={preset.label}
            onClick={() => handleClick(preset)}
            className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap snap-start border transition-colors shrink-0 ${
              active
                ? 'bg-brand-red border-brand-red text-white'
                : 'bg-brand-card/60 backdrop-blur border-brand-border text-brand-muted hover:border-brand-red/50'
            }`}
          >
            {preset.label}
          </button>
        );
      })}
    </div>
  );
}
