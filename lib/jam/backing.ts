/**
 * 8마디 프로젝트의 백킹 잼 반주 — stem_projects의 jam_slug·jam_bpm·jam_prog·jam_mutes로 반주를 다시 만든다.
 * 반주는 음원으로 저장하지 않는다(supabase/19·20). 못 찾으면 null → 화면은 "반주를 불러오지 못했어요" + 테이크만 재생.
 */
import { findProgression, parseSlug, progressionChords, type JamCombo, type Progression } from './catalog';
import { maskToMutes, renderJamLoop, type JamSpec, type Part } from './engine';

export interface JamProjectFields {
  jam_slug?: string | null;
  jam_bpm?: number | null;
  jam_prog?: string | null;
  jam_mutes?: number | null;
}

export interface ResolvedBacking {
  combo: JamCombo;
  progression: Progression;
  spec: JamSpec;
  muted: Record<Part, boolean>;
}

export function hasJamBacking(p: JamProjectFields): boolean {
  return !!p.jam_slug;
}

/** 순수: 저장값 → 반주 스펙. jam_slug가 없으면(일반 프로젝트) 또는 카탈로그에서 못 찾으면 null */
export function resolveJamBacking(p: JamProjectFields): ResolvedBacking | null {
  if (!p.jam_slug || !p.jam_bpm) return null;
  const combo = parseSlug(p.jam_slug);
  if (!combo) return null;
  const progression = findProgression(combo, p.jam_prog);
  if (!progression) return null;
  return {
    combo,
    progression,
    spec: { style: combo.style.id, bpm: p.jam_bpm, chords: progressionChords(combo.key, progression) },
    muted: maskToMutes(p.jam_mutes),
  };
}

const cache = new Map<string, Promise<AudioBuffer>>();

/** 브라우저 전용: 반주 8마디 버퍼(같은 조합은 한 번만 렌더). 못 만들면 null */
export async function renderProjectBacking(p: JamProjectFields): Promise<AudioBuffer | null> {
  const r = resolveJamBacking(p);
  if (!r) {
    if (p.jam_slug) console.warn('[jam] 저장된 반주를 카탈로그에서 못 찾음', p.jam_slug, p.jam_prog);
    return null;
  }
  const key = `${p.jam_slug}|${p.jam_prog}|${p.jam_bpm}|${p.jam_mutes ?? 0}`;
  let job = cache.get(key);
  if (!job) {
    job = renderJamLoop(r.spec, r.muted);
    cache.set(key, job);
    job.catch(() => cache.delete(key));
  }
  try {
    return await job;
  } catch (e) {
    console.error('[jam] 반주 렌더 실패', e);
    return null;
  }
}
