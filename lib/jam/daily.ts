/**
 * 오늘의 잼 — 날짜(KST)로 정해지는 키·스타일·진행 (순수 함수 — 테스트 tests/jam-daily.cjs).
 * 음감 5번 문제(4마디 진행)와 같은 날 같은 진행·같은 조가 되게, 그 문제에서 조와 진행을 읽어 온다.
 * 음감은 장조 진행만 내므로 오늘의 잼도 장조. 스타일은 그 진행을 가진 스타일 중에서 날짜 시드로 고른다.
 */
import { buildDailyQuiz } from '@/lib/ear/daily';
import { KEYS, STYLES, type JamCombo, type Progression } from './catalog';

/** 음감 진행의 첫 화음 근음(조 기준 반음) — lib/ear/daily.ts DEGREES와 같은 값 */
const FIRST_DEGREE_ROOT: Record<string, number> = { 'I-IV-V-I': 0, 'I-V-vi-IV': 0, 'ii-V-I': 2, 'I-vi-IV-V': 0 };

function hashSeed(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export interface DailyJam extends JamCombo {
  progression: Progression;
  bpm: number;
  date: string;
}

/** 음감 5번 문제 → { 진행 id, 으뜸음 피치 클래스 } */
export function earProgression(dateKst: string): { id: string; keyPc: number } {
  const q = buildDailyQuiz(dateKst)[4];
  if (q.sound.kind !== 'progression') throw new Error(`[jam] 음감 5번 문제가 진행이 아님: ${dateKst}`);
  // 각 화음 = [베이스(근음-12), 근음+구성음…] → 첫 화음 근음 - 첫 도수 = 으뜸음
  const firstRoot = q.sound.chords[0][1];
  const offset = FIRST_DEGREE_ROOT[q.answer];
  if (offset === undefined) throw new Error(`[jam] 모르는 음감 진행: ${q.answer}`);
  return { id: q.answer, keyPc: (((firstRoot - offset) % 12) + 12) % 12 };
}

export function dailyJam(dateKst: string): DailyJam {
  const { id, keyPc } = earProgression(dateKst);
  const key = KEYS.find((k) => k.mode === 'major' && k.pc === keyPc)!;
  const candidates = STYLES.filter((s) => s.progressions.major.some((p) => p.id === id));
  if (candidates.length === 0) throw new Error(`[jam] 진행 ${id}를 가진 스타일 없음`);
  const style = candidates[hashSeed(`jam:${dateKst}`) % candidates.length];
  const progression = style.progressions.major.find((p) => p.id === id)!;
  return { slug: `${key.slug}-${style.slug}`, key, style, progression, bpm: style.bpm, date: dateKst };
}
