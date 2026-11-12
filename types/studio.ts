export interface Studio {
  id: string;
  name: string;
  category: string | null;
  address: string | null;
  phone: string | null;
  price_info: string | null;
  region: string | null;
  source_url: string | null;
  source: string | null;
  capacity: string | null;
  rating: string | null;
  hours: string | null;
  options: string | null;
  instruments: string[] | null;
  lat: number | null;
  lng: number | null;
  room_type: 'T' | 'M' | 'both' | null;
  has_drum: boolean;
  price_per_hour: number | null;
  kakao_channel: string | null;
  naver_place_url: string | null;
  photos: string[] | null;
  notes: string | null;
  data_quality_score: number;
  /** 연습실 종류(supabase/18_studio_kinds.sql, scripts/studio_rules.py classify_kinds) */
  kinds?: string[];
  /** 0 = 밴드 합주 가능 / 1 = 그 외 / 2 = 댄스 전용 */
  band_rank?: number;
  review_avg: number | null;
  review_count: number;
  is_published: boolean;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudioFilters {
  room_type?: 'T' | 'M' | null;
  has_drum?: boolean;
  max_price?: number;
  radius?: number;
  region?: string;
  sort_by?: 'price';
  /** "🎸 밴드 합주" 칩 — band_rank 0만 */
  band_only?: boolean;
}
