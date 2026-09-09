import { supabase } from '@/lib/supabase';

/** 최근 목록 밖으로 밀린 공유 프로젝트도 ID로 직접 가져온다. */
export async function loadStemProjects(sharedId?: string) {
  const { data, error } = await supabase.from('stem_projects')
    .select('*, stem_tracks(count)').order('created_at', { ascending: false }).range(0, 49);
  if (error) throw error;
  const rows = data ?? [];
  let missing = false;
  if (sharedId && !rows.some(row => row.id === sharedId)) {
    const { data: shared, error: sharedError } = await supabase.from('stem_projects')
      .select('*, stem_tracks(count)').eq('id', sharedId).maybeSingle();
    if (sharedError) throw sharedError;
    if (shared) rows.push(shared);
    else missing = true;
  }
  return { rows, missing };
}
