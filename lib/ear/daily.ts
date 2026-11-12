/**
 * 오늘의 음감 — 날짜(KST)로 정해지는 매일 5문제 (순수 함수 — 테스트 tests/ear-daily.cjs).
 * 서버·DB 없이 날짜 문자열을 시드로 쓰므로, 같은 날이면 누구에게나 같은 문제·같은 보기 순서다.
 * 보기 라벨은 한국어 원문(화면에서 t()로 번역). 소리는 lib/ear/synth.ts가 MIDI 번호로 합성한다.
 */

export type QuestionType = 'higher' | 'interval' | 'quality' | 'chord' | 'progression';

/** 문제 순서(쉬움 → 어려움). 바꾸면 이미 푼 기록의 정오 칸 의미가 달라지므로 바꾸지 않는다 */
export const QUESTION_ORDER: QuestionType[] = ['higher', 'interval', 'quality', 'chord', 'progression'];

export type Sound =
  /** 음을 하나씩 차례로 */
  | { kind: 'notes'; notes: number[] }
  /** 한 화음을 동시에 */
  | { kind: 'chord'; notes: number[] }
  /** 화음을 마디마다 하나씩 */
  | { kind: 'progression'; chords: number[][] };

export interface Choice {
  key: string;
  label: string;
}

export interface Question {
  type: QuestionType;
  prompt: string;
  choices: Choice[];
  answer: string;
  sound: Sound;
}

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** 한국 시간 기준 오늘 'YYYY-MM-DD' */
export function kstToday(now: Date): string {
  return new Date(now.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10);
}

/** 다음 KST 자정(= 내일 문제)까지 남은 ms */
export function msUntilKstMidnight(now: Date): number {
  const kst = now.getTime() + KST_OFFSET_MS;
  const day = 24 * 60 * 60 * 1000;
  return day - (kst % day);
}

/** 문자열 → 32비트 시드 (FNV-1a) */
function hashSeed(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** 결정적 난수 (mulberry32) — 0 이상 1 미만 */
function seededRandom(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rand: () => number, list: readonly T[]): T {
  return list[Math.floor(rand() * list.length)];
}

function shuffle<T>(rand: () => number, list: readonly T[]): T[] {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const INTERVALS = [
  { key: 'M3', label: '장3도', semitones: 4 },
  { key: 'P4', label: '완전4도', semitones: 5 },
  { key: 'P5', label: '완전5도', semitones: 7 },
  { key: 'P8', label: '옥타브', semitones: 12 },
] as const;

const CHORDS = [
  { key: 'major', label: '메이저', tones: [0, 4, 7] },
  { key: 'minor', label: '마이너', tones: [0, 3, 7] },
  { key: 'dom7', label: '7 (세븐)', tones: [0, 4, 7, 10] },
  { key: 'sus4', label: 'sus4', tones: [0, 5, 7] },
] as const;

/** 조 안의 화음: 근음(조 기준 반음) + 메이저·마이너 */
const DEGREES = {
  I: { root: 0, tones: [0, 4, 7] },
  ii: { root: 2, tones: [0, 3, 7] },
  IV: { root: 5, tones: [0, 4, 7] },
  V: { root: 7, tones: [0, 4, 7] },
  vi: { root: 9, tones: [0, 3, 7] },
} as const;
type Degree = keyof typeof DEGREES;

const PROGRESSIONS: { key: string; label: string; degrees: Degree[] }[] = [
  { key: 'I-IV-V-I', label: 'I – IV – V – I', degrees: ['I', 'IV', 'V', 'I'] },
  { key: 'I-V-vi-IV', label: 'I – V – vi – IV', degrees: ['I', 'V', 'vi', 'IV'] },
  { key: 'ii-V-I', label: 'ii – V – I', degrees: ['ii', 'V', 'I', 'I'] },
  { key: 'I-vi-IV-V', label: 'I – vi – IV – V', degrees: ['I', 'vi', 'IV', 'V'] },
];

/** 가운데 도(C4) = 60. 조의 으뜸음은 C4~B4 */
const C4 = 60;

/** 근음 위에 화음 구성음을 쌓고, 한 옥타브 아래 베이스를 깐다 */
function voice(root: number, tones: readonly number[]): number[] {
  return [root - 12, ...tones.map((t) => root + t)];
}

/** 진행 화음이 너무 높아지지 않게 근음을 F3~E4 사이로 접는다 */
function foldRoot(midi: number): number {
  let m = midi;
  while (m > C4 + 4) m -= 12;
  while (m < C4 - 7) m += 12;
  return m;
}

export function buildDailyQuiz(dateKst: string): Question[] {
  const rand = seededRandom(hashSeed(`ear:${dateKst}`));
  const key = C4 + Math.floor(rand() * 12);

  // 1. 두 음 중 어느 쪽이 높은가 (2~7반음 차이)
  const gap = 2 + Math.floor(rand() * 6);
  const firstHigher = rand() < 0.5;
  const low = key - Math.floor(rand() * 5);
  const higher: Question = {
    type: 'higher',
    prompt: '두 음 중 어느 쪽이 더 높을까요?',
    choices: [
      { key: 'first', label: '첫 번째 음' },
      { key: 'second', label: '두 번째 음' },
    ],
    answer: firstHigher ? 'first' : 'second',
    sound: { kind: 'notes', notes: firstHigher ? [low + gap, low] : [low, low + gap] },
  };

  // 2. 음정 이름 (아래 음 → 위 음)
  const iv = pick(rand, INTERVALS);
  const ivRoot = key - 5 + Math.floor(rand() * 6);
  const interval: Question = {
    type: 'interval',
    prompt: '두 음 사이의 음정은?',
    choices: shuffle(rand, INTERVALS).map(({ key: k, label }) => ({ key: k, label })),
    answer: iv.key,
    sound: { kind: 'notes', notes: [ivRoot, ivRoot + iv.semitones] },
  };

  // 3. 메이저·마이너
  const isMajor = rand() < 0.5;
  const qRoot = foldRoot(key + pick(rand, [0, 2, 5, 7, 9]));
  const qualityChoices = shuffle(rand, [CHORDS[0], CHORDS[1]]);
  const quality: Question = {
    type: 'quality',
    prompt: '메이저일까요, 마이너일까요?',
    choices: qualityChoices.map(({ key: k, label }) => ({ key: k, label })),
    answer: isMajor ? 'major' : 'minor',
    sound: { kind: 'chord', notes: voice(qRoot, isMajor ? CHORDS[0].tones : CHORDS[1].tones) },
  };

  // 4. 코드 종류
  const chordType = pick(rand, CHORDS);
  const cRoot = foldRoot(key + pick(rand, [0, 2, 4, 5, 7, 9]));
  const chord: Question = {
    type: 'chord',
    prompt: '어떤 코드일까요?',
    choices: shuffle(rand, CHORDS).map(({ key: k, label }) => ({ key: k, label })),
    answer: chordType.key,
    sound: { kind: 'chord', notes: voice(cRoot, chordType.tones) },
  };

  // 5. 4마디 진행
  const prog = pick(rand, PROGRESSIONS);
  const progression: Question = {
    type: 'progression',
    prompt: '4마디 코드 진행은?',
    choices: shuffle(rand, PROGRESSIONS).map(({ key: k, label }) => ({ key: k, label })),
    answer: prog.key,
    sound: {
      kind: 'progression',
      chords: prog.degrees.map((d) => voice(foldRoot(key + DEGREES[d].root), DEGREES[d].tones)),
    },
  };

  return [higher, interval, quality, chord, progression];
}
