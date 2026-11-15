export interface StemProject {
  id: string;
  title: string;
  creator_id: string | null;
  creator_name: string;
  creator_emoji: string;
  bpm: number;
  key_signature: string;
  genre: string | null;
  description: string | null;
  is_open: boolean;
  created_at: string;
  track_count?: number;
  share_count?: number;
  pass_count?: number;
  /** 백킹 잼 반주(supabase/19·20). 없으면 일반 프로젝트 */
  jam_slug?: string | null;
  jam_bpm?: number | null;
  jam_prog?: string | null;
  jam_mutes?: number | null;
}
