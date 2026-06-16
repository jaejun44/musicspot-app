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
}
