/**
 * 테이크 공유 영상 길이 계산 (순수 함수, 2026-11-17 사용자 결정).
 * - 백킹 잼 프로젝트: 8마디 전체를 자르지 않고 넣는다(가장 느린 56 BPM에서도 약 34초) + 엔드 카드 1.5초.
 * - 반주가 없는 프로젝트: 음원이 43.5초를 넘으면 43.5초에서 자르고 짧게 페이드 → 엔드 카드.
 * 전체 영상은 45초 이하.
 */

export const END_CARD_SEC = 1.5;
export const MAX_VIDEO_SEC = 45;
/** 반주 없는 프로젝트의 음악 구간 상한 */
export const MAX_MUSIC_SEC = MAX_VIDEO_SEC - END_CARD_SEC;
/** 자를 때 끝부분 페이드 길이 */
export const CUT_FADE_SEC = 0.4;
export const JAM_BARS = 8;

export interface Timeline {
  /** 음악 구간 길이(초). 이 시각부터 엔드 카드 */
  musicSec: number;
  /** 영상 전체 길이(초) */
  totalSec: number;
  /** 음원을 잘랐으면 페이드 시작 시각, 아니면 null */
  fadeFromSec: number | null;
  /** 한 마디 길이(초). 반주 프로젝트는 BPM으로 정확히, 아니면 음원 전체를 8등분한 추정값 */
  barSec: number;
  /** barSec가 BPM에서 나온 정확한 값인지(아니면 마디 표시만 하고 코드는 안 그린다) */
  barsExact: boolean;
}

/** 4/4 한 마디 길이(초) */
export function barSeconds(bpm: number): number {
  return (60 / bpm) * 4;
}

/**
 * @param audioSec 섹션 1을 모두 재생하는 길이(가장 긴 트랙)
 * @param jamBpm 반주 프로젝트면 BPM, 아니면 null
 */
export function computeTimeline(audioSec: number, jamBpm: number | null): Timeline {
  if (!(audioSec > 0)) throw new Error(`[takevideo] 음원 길이가 올바르지 않음: ${audioSec}`);
  if (jamBpm != null) {
    if (!(jamBpm > 0)) throw new Error(`[takevideo] BPM이 올바르지 않음: ${jamBpm}`);
    const barSec = barSeconds(jamBpm);
    const musicSec = barSec * JAM_BARS;
    const totalSec = musicSec + END_CARD_SEC;
    if (totalSec > MAX_VIDEO_SEC) throw new Error(`[takevideo] ${jamBpm} BPM 8마디가 ${MAX_VIDEO_SEC}초를 넘음`);
    return { musicSec, totalSec, fadeFromSec: null, barSec, barsExact: true };
  }
  const cut = audioSec > MAX_MUSIC_SEC;
  const musicSec = cut ? MAX_MUSIC_SEC : audioSec;
  return { musicSec, totalSec: musicSec + END_CARD_SEC, fadeFromSec: cut ? MAX_MUSIC_SEC - CUT_FADE_SEC : null, barSec: audioSec / JAM_BARS, barsExact: false };
}

/** 마디 위치(0~7). 음악 구간 밖이면 null */
export function barAt(t: number, tl: Timeline): { bar: number; frac: number } | null {
  if (t < 0 || t >= tl.musicSec) return null;
  const x = t / tl.barSec;
  const bar = Math.min(JAM_BARS - 1, Math.floor(x));
  return { bar, frac: Math.min(1, x - bar) };
}
