import { cache } from 'react';
import { supabase } from '@/lib/supabase';
import type { Studio } from '@/types/studio';

/** 검색과 같은 카테고리(음악 연습실) */
export const MUSIC_CATEGORY_FILTER =
  'category.ilike.%악기%,category.ilike.%보컬%,category.ilike.%녹음%,category.ilike.%합주%,category.ilike.%개인연습실%';

/**
 * 서울 음악 연습실 전체를 품질 점수 순으로. 지역 페이지가 반경·구 기준으로 고를 원본.
 * 1,000행 제한 때문에 range 배치로 끝까지 읽는다. 같은 요청 안(메타데이터+본문)에선 한 번만 조회.
 */
export const fetchSeoulStudios = cache(async (): Promise<Studio[]> => {
  const all: Studio[] = [];
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from('studios')
      .select('*')
      .eq('is_published', true)
      .ilike('address', '서울%')
      .or(MUSIC_CATEGORY_FILTER)
      .order('data_quality_score', { ascending: false })
      .order('review_avg', { ascending: false, nullsFirst: false })
      .order('id')
      .range(offset, offset + 999);
    // 빈 목록으로 캐시되지 않게 던진다 — ISR 재생성 중 실패하면 Next가 이전 페이지를 계속 보여준다
    if (error) throw new Error(`[region] 서울 연습실 조회 실패 (offset ${offset}): ${error.message}`);
    if (!data || data.length === 0) break;
    all.push(...(data as unknown as Studio[]));
    if (data.length < 1000) break;
    offset += 1000;
  }
  return all;
});
