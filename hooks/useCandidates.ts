'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  CANDIDATES_EVENT,
  CANDIDATES_KEY,
  getCandidates,
  setCandidates,
  toggleCandidate,
  type ToggleResult,
} from '@/lib/candidates';
import { track } from '@/lib/analytics';

interface UseCandidatesReturn {
  ids: string[];
  has: (id: string) => boolean;
  toggle: (id: string) => ToggleResult;
}

/** 후보 목록 상태. 같은 탭(커스텀 이벤트)·다른 탭(storage 이벤트) 변경을 모두 따라간다 */
export function useCandidates(): UseCandidatesReturn {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    const sync = () => setIds(getCandidates());
    const onStorage = (e: StorageEvent) => {
      if (e.key === CANDIDATES_KEY) sync();
    };
    sync();
    window.addEventListener(CANDIDATES_EVENT, sync);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(CANDIDATES_EVENT, sync);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const toggle = useCallback((id: string): ToggleResult => {
    const result = toggleCandidate(getCandidates(), id);
    if (!result.full) {
      setCandidates(result.list);
      track('candidate_toggle', { studio_id: id, on: result.added, count: result.list.length });
    }
    return result;
  }, []);

  const has = useCallback((id: string) => ids.includes(id), [ids]);

  return { ids, has, toggle };
}
