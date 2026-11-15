/**
 * 백킹 잼 기록 — localStorage `ms_jam`. 서버에 저장하지 않는다(로그인 없음).
 * 재방문 스트립(components/ReturnStrip.tsx)이 "잼을 1번 이상 재생한 브라우저"인지 보는 데만 쓴다.
 */
export const JAM_STORAGE_KEY = 'ms_jam';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** 마지막으로 재생한 날(KST 'YYYY-MM-DD'). 기록이 없거나 저장소가 막혔으면 null */
export function loadLastJamDate(): string | null {
  try {
    const raw = JSON.parse(window.localStorage.getItem(JAM_STORAGE_KEY) ?? 'null') as { last?: unknown } | null;
    return raw && typeof raw.last === 'string' && DATE_RE.test(raw.last) ? raw.last : null;
  } catch {
    return null;
  }
}

export function markJamPlayed(dateKst: string): void {
  try {
    window.localStorage.setItem(JAM_STORAGE_KEY, JSON.stringify({ last: dateKst }));
  } catch (e) {
    console.warn('[jam] 재생 기록 저장 실패(저장소 차단)', e);
  }
}
