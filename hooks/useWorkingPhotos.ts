import { useCallback, useMemo, useState } from 'react';

/**
 * 원본 글이 지워져 403이 나는 외부 사진(주로 mule)을 화면에서 빼기 위한 훅.
 * <img onError={() => markFailed(url)}> 로 실패한 URL을 기억하고, 살아 있는 사진만 돌려준다.
 */
export function useWorkingPhotos(photos: string[]) {
  const [failed, setFailed] = useState<ReadonlySet<string>>(new Set());
  const working = useMemo(() => photos.filter((p) => !failed.has(p)), [photos, failed]);
  const markFailed = useCallback((url: string) => {
    setFailed((prev) => (prev.has(url) ? prev : new Set(prev).add(url)));
  }, []);
  return { working, markFailed };
}
