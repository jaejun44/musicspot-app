/**
 * 백킹 잼 카탈로그 (순수 함수 — 테스트 tests/jam-catalog.cjs).
 * 키 12개 × 장·단조 × 스타일 6개 → 조합 페이지 슬러그 `<key>-<style>` (예: a-minor-blues, e-minor-metal).
 * BPM은 주소가 아니라 화면 조절값(얇은 중복 페이지를 만들지 않는다). 메탈은 단조만.
 * 진행은 일반적인 화성 진행만(특정 곡 흉내 금지). 코드는 조 기준 반음(iv) + 성질.
 */
import type { Chord, Quality, StyleId } from './engine';

export type Mode = 'major' | 'minor';

export interface KeyDef {
  /** 으뜸음 피치 클래스 0=C … 11=B */
  pc: number;
  mode: Mode;
  /** 화면 표기(예: 'F#', 'E♭') */
  name: string;
  /** 주소 표기(예: 'f-sharp', 'e-flat') */
  slug: string;
  /** 코드·음 이름을 ♭으로 쓸지 */
  flats: boolean;
}

/** 조성 관습: 장조 Db·Eb·Ab·Bb·F는 ♭, 단조 C·D·F·G·Bb·Eb는 ♭ */
const MAJOR_NAMES = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'F#', 'G', 'A♭', 'A', 'B♭', 'B'];
const MINOR_NAMES = ['C', 'C#', 'D', 'E♭', 'E', 'F', 'F#', 'G', 'G#', 'A', 'B♭', 'B'];
const MAJOR_FLATS = new Set([1, 3, 5, 8, 10]);
const MINOR_FLATS = new Set([0, 2, 3, 5, 7, 10]);

const SHARP_SPELL = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_SPELL = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];

function nameToSlug(name: string): string {
  return name.toLowerCase().replace('♭', '-flat').replace('#', '-sharp');
}

export const KEYS: KeyDef[] = (['major', 'minor'] as Mode[]).flatMap((mode) =>
  Array.from({ length: 12 }, (_, pc) => {
    const name = (mode === 'major' ? MAJOR_NAMES : MINOR_NAMES)[pc];
    return {
      pc,
      mode,
      name,
      slug: `${nameToSlug(name)}-${mode}`,
      flats: (mode === 'major' ? MAJOR_FLATS : MINOR_FLATS).has(pc),
    };
  }),
);

export function noteName(pc: number, flats: boolean): string {
  const p = ((pc % 12) + 12) % 12;
  return (flats ? FLAT_SPELL : SHARP_SPELL)[p];
}

const QUALITY_SUFFIX: Record<Quality, string> = { maj: '', min: 'm', '7': '7', m7: 'm7', '5': '5' };

export function chordLabel(c: Chord, flats: boolean): string {
  return noteName(c.root, flats) + QUALITY_SUFFIX[c.quality];
}

/** 진행 위에서 쓸 스케일(조 기준 반음). 화면에 이름·구성음으로 보여 준다 */
export type ScaleId = 'major' | 'majorPenta' | 'minor' | 'minorPenta' | 'blues' | 'dorian' | 'mixolydian';
export const SCALES: Record<ScaleId, { label: string; steps: number[] }> = {
  major: { label: '메이저 스케일', steps: [0, 2, 4, 5, 7, 9, 11] },
  majorPenta: { label: '메이저 펜타토닉', steps: [0, 2, 4, 7, 9] },
  minor: { label: '내추럴 마이너', steps: [0, 2, 3, 5, 7, 8, 10] },
  minorPenta: { label: '마이너 펜타토닉', steps: [0, 3, 5, 7, 10] },
  blues: { label: '블루스 스케일', steps: [0, 3, 5, 6, 7, 10] },
  dorian: { label: '도리안', steps: [0, 2, 3, 5, 7, 9, 10] },
  mixolydian: { label: '믹솔리디안', steps: [0, 2, 4, 5, 7, 9, 10] },
};

export interface Progression {
  /** 진행 id(로마 숫자). 음감 5번 문제와 같은 id를 쓰는 것이 있다 */
  id: string;
  /** 화면 표기 */
  label: string;
  /** 8마디, 조 기준 [반음, 성질] */
  bars: [number, Quality][];
  /** 이 진행 위에 추천할 스케일 1~2개 */
  scales: ScaleId[];
  /** 블루스·도리안처럼 조 밖의 음(♭7 등)을 일부러 쓰는 진행 — 테스트에서 근음만 조 안인지 본다 */
  modal?: boolean;
  /**
   * 진행 id는 stem_projects.jam_prog에 저장되므로 바꾸거나 지우지 않는다(tests/jam-catalog.cjs에 목록 고정).
   * 없애야 하면 이 값을 true로 — 새 녹음·진행 선택에서는 숨기고, 이미 올라온 프로젝트 재생은 그대로
   */
  hiddenForNewTakes?: boolean;
}

const x2 = (four: [number, Quality][]): [number, Quality][] => [...four, ...four];
// 장조 도수
const I: [number, Quality] = [0, 'maj'];
const ii: [number, Quality] = [2, 'min'];
const IV: [number, Quality] = [5, 'maj'];
const V: [number, Quality] = [7, 'maj'];
const vi: [number, Quality] = [9, 'min'];
// 단조 도수
const i: [number, Quality] = [0, 'min'];
const iv: [number, Quality] = [5, 'min'];
const III: [number, Quality] = [3, 'maj'];
const VI: [number, Quality] = [8, 'maj'];
const VII: [number, Quality] = [10, 'maj'];

/** 음감 5번 문제와 같은 장조 진행 4개(lib/ear/daily.ts PROGRESSIONS의 key와 같은 id) */
const EAR = {
  'I-IV-V-I': { label: 'I – IV – V – I', four: [I, IV, V, I] },
  'I-V-vi-IV': { label: 'I – V – vi – IV', four: [I, V, vi, IV] },
  'ii-V-I': { label: 'ii – V – I', four: [ii, V, I, I] },
  'I-vi-IV-V': { label: 'I – vi – IV – V', four: [I, vi, IV, V] },
} as const;
type EarId = keyof typeof EAR;

function ear(id: EarId, scales: ScaleId[]): Progression {
  return { id, label: EAR[id].label, bars: x2([...EAR[id].four]), scales };
}

export type StyleSlug = 'blues' | 'rock' | 'funk' | 'metal' | 'ballad' | 'pop-punk';

export interface StyleDef {
  id: StyleId;
  slug: StyleSlug;
  label: string;
  /** 페이지 설명에 쓰는 스타일 한 줄(페이지마다 키·스케일 문장과 섞여 달라진다) */
  blurb: string;
  bpm: number;
  bpmRange: [number, number];
  /** 이 스타일이 있는 조성 */
  modes: Mode[];
  progressions: Record<Mode, Progression[]>;
}

export const STYLES: StyleDef[] = [
  {
    id: 'blues',
    slug: 'blues',
    label: '블루스',
    blurb: '셔플 리듬 위에서 벤딩과 콜앤리스폰스를 연습하기 좋은 8마디 블루스',
    bpm: 92,
    bpmRange: [66, 132],
    modes: ['major', 'minor'],
    progressions: {
      major: [
        { id: 'I7-IV7-I7-V7', label: 'I7 – IV7 – I7 – I7 – IV7 – IV7 – I7 – V7', bars: [[0, '7'], [5, '7'], [0, '7'], [0, '7'], [5, '7'], [5, '7'], [0, '7'], [7, '7']], scales: ['blues', 'majorPenta'], modal: true },
        { id: 'I7-V7-IV7', label: 'I7 – V7 – IV7 – IV7 – I7 – V7 – I7 – V7', bars: [[0, '7'], [7, '7'], [5, '7'], [5, '7'], [0, '7'], [7, '7'], [0, '7'], [7, '7']], scales: ['blues', 'mixolydian'], modal: true },
      ],
      minor: [
        { id: 'im7-ivm7-V7', label: 'im7 – ivm7 – im7 – im7 – ivm7 – ivm7 – im7 – V7', bars: [[0, 'm7'], [5, 'm7'], [0, 'm7'], [0, 'm7'], [5, 'm7'], [5, 'm7'], [0, 'm7'], [7, '7']], scales: ['minorPenta', 'blues'], modal: true },
        { id: 'im7-VI7-V7', label: 'im7 – im7 – ivm7 – ivm7 – ♭VI7 – V7 – im7 – V7', bars: [[0, 'm7'], [0, 'm7'], [5, 'm7'], [5, 'm7'], [8, '7'], [7, '7'], [0, 'm7'], [7, '7']], scales: ['blues', 'minorPenta'], modal: true },
      ],
    },
  },
  {
    id: 'rock8',
    slug: 'rock',
    label: '락',
    blurb: '정박 8비트에 파워코드가 받쳐 주는 락 반주',
    bpm: 120,
    bpmRange: [90, 160],
    modes: ['major', 'minor'],
    progressions: {
      major: [ear('I-V-vi-IV', ['majorPenta', 'major']), ear('I-IV-V-I', ['majorPenta', 'major']), { id: 'I-IV-vi-V', label: 'I – IV – vi – V', bars: x2([I, IV, vi, V]), scales: ['majorPenta', 'major'] }],
      minor: [
        { id: 'i-VI-III-VII', label: 'i – ♭VI – ♭III – ♭VII', bars: x2([i, VI, III, VII]), scales: ['minorPenta', 'minor'] },
        { id: 'i-VII-VI-VII', label: 'i – ♭VII – ♭VI – ♭VII', bars: x2([i, VII, VI, VII]), scales: ['minorPenta', 'minor'] },
        { id: 'i-iv-VI-VII', label: 'i – iv – ♭VI – ♭VII', bars: x2([i, iv, VI, VII]), scales: ['minorPenta', 'minor'] },
      ],
    },
  },
  {
    id: 'funk16',
    slug: 'funk',
    label: '펑크(Funk)',
    blurb: '16비트 하이햇과 당김 베이스 위에서 커팅·리듬 기타를 연습하는 펑크 그루브',
    bpm: 100,
    bpmRange: [84, 120],
    modes: ['major', 'minor'],
    progressions: {
      major: [
        { id: 'I-IV-vamp', label: 'I – I – IV – IV', bars: x2([I, I, IV, IV]), scales: ['majorPenta', 'major'] },
        ear('ii-V-I', ['major', 'majorPenta']),
      ],
      minor: [
        { id: 'im7-IV7', label: 'im7 – im7 – IV7 – IV7 (도리안)', bars: x2([[0, 'm7'], [0, 'm7'], [5, '7'], [5, '7']]), scales: ['dorian', 'minorPenta'], modal: true },
        { id: 'im7-ivm7', label: 'im7 – im7 – ivm7 – ivm7', bars: x2([[0, 'm7'], [0, 'm7'], [5, 'm7'], [5, 'm7']]), scales: ['minorPenta', 'minor'] },
      ],
    },
  },
  {
    id: 'metal',
    slug: 'metal',
    label: '메탈',
    blurb: '빠른 8분 킥과 하프타임 브레이크다운이 번갈아 나오는 메탈 반주',
    bpm: 150,
    bpmRange: [110, 200],
    modes: ['minor'],
    progressions: {
      major: [],
      minor: [
        { id: 'i-VI-VII-i', label: 'i – i – ♭VI – ♭VII', bars: x2([i, i, VI, VII]), scales: ['minor', 'minorPenta'] },
        { id: 'i-VII-VI-VII', label: 'i – ♭VII – ♭VI – ♭VII', bars: x2([i, VII, VI, VII]), scales: ['minor', 'minorPenta'] },
      ],
    },
  },
  {
    id: 'ballad',
    slug: 'ballad',
    label: '발라드',
    blurb: '느린 템포에 패드와 아르페지오가 깔리는 발라드 반주',
    bpm: 72,
    bpmRange: [56, 92],
    modes: ['major', 'minor'],
    progressions: {
      major: [ear('I-vi-IV-V', ['major', 'majorPenta']), ear('I-V-vi-IV', ['major', 'majorPenta']), ear('ii-V-I', ['major', 'majorPenta'])],
      minor: [
        { id: 'i-VI-III-VII', label: 'i – ♭VI – ♭III – ♭VII', bars: x2([i, VI, III, VII]), scales: ['minor', 'minorPenta'] },
        { id: 'i-iv-VII-III', label: 'i – iv – ♭VII – ♭III', bars: x2([i, iv, VII, III]), scales: ['minor', 'minorPenta'] },
      ],
    },
  },
  {
    id: 'poppunk',
    slug: 'pop-punk',
    label: '팝펑크',
    blurb: '빠른 8비트 다운피킹으로 달리는 팝펑크 반주',
    bpm: 172,
    bpmRange: [140, 200],
    modes: ['major', 'minor'],
    progressions: {
      major: [ear('I-V-vi-IV', ['majorPenta', 'major']), ear('I-vi-IV-V', ['majorPenta', 'major'])],
      minor: [
        { id: 'i-VI-III-VII', label: 'i – ♭VI – ♭III – ♭VII', bars: x2([i, VI, III, VII]), scales: ['minorPenta', 'minor'] },
        { id: 'i-VII-VI-VII', label: 'i – ♭VII – ♭VI – ♭VII', bars: x2([i, VII, VI, VII]), scales: ['minorPenta', 'minor'] },
      ],
    },
  },
];

export interface JamCombo {
  slug: string;
  key: KeyDef;
  style: StyleDef;
}

export const COMBOS: JamCombo[] = STYLES.flatMap((style) =>
  KEYS.filter((k) => style.modes.includes(k.mode)).map((key) => ({ slug: `${key.slug}-${style.slug}`, key, style })),
);

const BY_SLUG = new Map(COMBOS.map((c) => [c.slug, c]));

export function parseSlug(slug: string): JamCombo | null {
  return BY_SLUG.get(slug) ?? null;
}

export function comboSlug(keyPc: number, mode: Mode, style: StyleSlug): string | null {
  const key = KEYS.find((k) => k.pc === ((keyPc % 12) + 12) % 12 && k.mode === mode);
  const s = STYLES.find((st) => st.slug === style);
  if (!key || !s || !s.modes.includes(mode)) return null;
  return `${key.slug}-${s.slug}`;
}

/** 반음 올리기·내리기 → 같은 스타일·조성의 다른 키 슬러그 */
export function transposeSlug(combo: JamCombo, semitones: number): string {
  return comboSlug(combo.key.pc + semitones, combo.key.mode, combo.style.slug) as string;
}

/** 진행 → 엔진 코드(절대 근음) */
export function progressionChords(key: KeyDef, prog: Progression): Chord[] {
  return prog.bars.map(([iv, quality]) => ({ root: (key.pc + iv) % 12, quality }));
}

export function scaleNotes(key: KeyDef, scale: ScaleId): string[] {
  // 블루스 스케일의 ♭5만 ♭으로(A 블루스 = A C D E♭ E G), 나머지는 조 표기를 따른다
  return SCALES[scale].steps.map((s) => noteName(key.pc + s, key.flats || (scale === 'blues' && s === 6)));
}

export function keyLabel(key: KeyDef): string {
  return `${key.name} ${key.mode === 'major' ? '메이저' : '마이너'}`;
}

/** 기타 6번 줄에서 으뜸음 프렛(펜타토닉 박스 시작 위치). 0이면 12프렛도 함께 */
export function lowEFret(pc: number): number {
  return (pc - 4 + 12) % 12;
}

/** 조합 페이지 제목·설명 — 키·스타일·스케일·프렛으로 페이지마다 다르게 */
export function comboMeta(combo: JamCombo): { title: string; description: string; heading: string } {
  const { key, style } = combo;
  const prog = style.progressions[key.mode][0];
  const scale = prog.scales[0];
  const notes = scaleNotes(key, scale).join(' ');
  const fret = lowEFret(key.pc);
  const heading = `${keyLabel(key)} ${style.label} 백킹 트랙`;
  return {
    heading,
    title: `${heading} — 브라우저에서 바로 연주 | Music Spot`,
    description:
      `${keyLabel(key)} ${style.label} 반주(${style.bpm} BPM, ${prog.label}). ${style.blurb}. ` +
      `추천 스케일은 ${key.name} ${SCALES[scale].label}(${notes}), 기타 6번 줄 ${fret === 0 ? '개방·12' : fret}프렛에서 시작해 보세요. 로그인 없이 바로 재생.`,
  };
}

/** 새 녹음·진행 선택에 보일 진행(숨긴 진행 제외) */
export function visibleProgressions(combo: JamCombo): Progression[] {
  return combo.style.progressions[combo.key.mode].filter((p) => !p.hiddenForNewTakes);
}

/** 저장된 진행 id → 진행(숨긴 것 포함). 못 찾으면 null */
export function findProgression(combo: JamCombo, id: string | null | undefined): Progression | null {
  if (!id) return null;
  return combo.style.progressions[combo.key.mode].find((p) => p.id === id) ?? null;
}

