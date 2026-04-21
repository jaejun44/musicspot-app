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
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface StudioFilters {
  room_type?: 'T' | 'M' | null;
  has_drum?: boolean;
  max_price?: number;
  radius?: number;
}
