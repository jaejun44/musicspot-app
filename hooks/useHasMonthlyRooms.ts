import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * 공개된 월 대여(M·both) 연습실이 하나라도 있는지.
 * 2026-10-26 mule 비공개 후 공개 연습실이 전부 T라 T룸/M룸 칩이 의미가 없어졌다 → 있을 때만 칩을 보인다.
 * 확인 전·실패 시엔 false(칩 숨김). 숨겨도 검색 자체는 그대로라 잃는 기능이 없다.
 */
export function useHasMonthlyRooms(): boolean {
  const [has, setHas] = useState(false);
  useEffect(() => {
    let alive = true;
    supabase
      .from('studios')
      .select('id', { count: 'exact', head: true })
      .eq('is_published', true)
      .in('room_type', ['M', 'both'])
      .then(({ count, error }) => {
        if (error) console.warn('[useHasMonthlyRooms] 월 대여 연습실 수 조회 실패 — 룸 타입 칩 숨김', error.message);
        if (alive) setHas((count ?? 0) > 0);
      });
    return () => {
      alive = false;
    };
  }, []);
  return has;
}
