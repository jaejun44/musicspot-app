/**
 * 백킹 잼 반주 엔진 — 드럼·베이스·코드 8마디 루프를 Web Audio 합성으로 만든다.
 * 샘플 파일·외부 라이브러리 없음. 첫 재생은 사용자 탭 안에서(컨텍스트는 lib/ear/synth.ts unlockEarAudio — iOS 무음 모드 대응 공유).
 * 스케줄링: AudioContext.currentTime 기준으로 마디 단위 선행 예약(lookahead). BPM은 아직 예약 안 된 다음 마디부터 반영.
 * 마스터: lib/ensemble-audio.ts createMasterChain(게인 + 리미터)을 그대로 쓴다.
 * 일반적인 진행·패턴만 쓴다(특정 곡의 리프·멜로디 흉내 금지).
 */
import { createMasterChain } from '@/lib/ensemble-audio';
import { barDuration, scheduleClicks } from '@/lib/metronome';

export type StyleId = 'blues' | 'rock8' | 'funk16' | 'metal' | 'ballad' | 'poppunk';
export type Part = 'drums' | 'bass' | 'chords';
export type Quality = 'maj' | 'min' | '7' | 'm7' | '5';

export interface Chord {
  /** 근음 피치 클래스 0=C … 11=B */
  root: number;
  quality: Quality;
}

export interface JamSpec {
  style: StyleId;
  bpm: number;
  /** 한 마디에 코드 하나. 보통 8개 */
  chords: Chord[];
}

const NOTE_NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const QUALITY_SUFFIX: Record<Quality, string> = { maj: '', min: 'm', '7': '7', m7: 'm7', '5': '5' };
const QUALITY_TONES: Record<Quality, number[]> = {
  maj: [0, 4, 7],
  min: [0, 3, 7],
  '7': [0, 4, 7, 10],
  m7: [0, 3, 7, 10],
  '5': [0, 7, 12],
};

export function chordName(c: Chord): string {
  return NOTE_NAMES[((c.root % 12) + 12) % 12] + QUALITY_SUFFIX[c.quality];
}

const isMinor = (q: Quality) => q === 'min' || q === 'm7';

// ─── 시간·음높이 도우미 ───────────────────────────────────────────

function midiToHz(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/** 베이스 근음: E1(28)~Eb2(39) */
function bassRoot(pc: number): number {
  return 28 + ((pc - 4 + 12) % 12);
}

/** 코드 근음: E3(52)~Eb4(63) — 기타 위 자리를 비워 두려고 중음역 아래쪽 */
function chordRoot(pc: number): number {
  return 52 + ((pc - 4 + 12) % 12);
}

const noiseCache = new WeakMap<BaseAudioContext, AudioBuffer>();

/** 1초 백색 소음(결정적 — 오프라인 렌더가 매번 같은 소리) */
function noiseBuffer(ctx: BaseAudioContext): AudioBuffer {
  const cached = noiseCache.get(ctx);
  if (cached) return cached;
  const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = buf.getChannelData(0);
  let seed = 0x9e3779b9;
  for (let i = 0; i < data.length; i++) {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    data[i] = ((seed >>> 0) / 4294967296) * 2 - 1;
  }
  noiseCache.set(ctx, buf);
  return buf;
}

/** 예약한 소스(정지 때 끊기 위해 모은다) */
type Sink = (node: AudioScheduledSourceNode, end: number) => void;

function envGain(ctx: BaseAudioContext, out: AudioNode): GainNode {
  const g = ctx.createGain();
  g.gain.value = 0;
  g.connect(out);
  return g;
}

function noiseSource(ctx: BaseAudioContext, when: number, dur: number, sink: Sink): AudioBufferSourceNode {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx);
  // 같은 시작점만 쓰면 기계적으로 들려서 시각으로 오프셋을 흩는다(결정적)
  src.start(when, (when * 7.31) % 0.8, dur + 0.02);
  sink(src, when + dur + 0.02);
  return src;
}

// ─── 드럼 ────────────────────────────────────────────────────────

function kick(ctx: BaseAudioContext, out: AudioNode, when: number, vel: number, sink: Sink) {
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(150, when);
  osc.frequency.exponentialRampToValueAtTime(44, when + 0.12);
  const g = envGain(ctx, out);
  g.gain.setValueAtTime(vel * 0.6, when);
  g.gain.exponentialRampToValueAtTime(0.001, when + 0.42);
  osc.connect(g);
  osc.start(when);
  osc.stop(when + 0.45);
  sink(osc, when + 0.45);

  // 비터 클릭 — 작은 스피커에서도 킥이 들리게
  const click = noiseSource(ctx, when, 0.012, sink);
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 2500;
  const cg = envGain(ctx, out);
  cg.gain.setValueAtTime(vel * 0.18, when);
  cg.gain.exponentialRampToValueAtTime(0.001, when + 0.012);
  click.connect(hp);
  hp.connect(cg);
}

function snare(ctx: BaseAudioContext, out: AudioNode, when: number, vel: number, sink: Sink) {
  const decay = vel < 0.3 ? 0.07 : 0.19; // 고스트 노트는 짧게
  const n = noiseSource(ctx, when, decay, sink);
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 1100;
  const ng = envGain(ctx, out);
  ng.gain.setValueAtTime(vel * 0.42, when);
  ng.gain.exponentialRampToValueAtTime(0.001, when + decay);
  n.connect(hp);
  hp.connect(ng);

  const tone = ctx.createOscillator();
  tone.type = 'triangle';
  tone.frequency.setValueAtTime(200, when);
  tone.frequency.exponentialRampToValueAtTime(160, when + 0.08);
  const tg = envGain(ctx, out);
  tg.gain.setValueAtTime(vel * 0.28, when);
  tg.gain.exponentialRampToValueAtTime(0.001, when + 0.11);
  tone.connect(tg);
  tone.start(when);
  tone.stop(when + 0.13);
  sink(tone, when + 0.13);
}

function hat(ctx: BaseAudioContext, out: AudioNode, when: number, vel: number, open: boolean, sink: Sink) {
  const decay = open ? 0.28 : 0.045;
  const n = noiseSource(ctx, when, decay, sink);
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 7500;
  const g = envGain(ctx, out);
  g.gain.setValueAtTime(vel * 0.28, when);
  g.gain.exponentialRampToValueAtTime(0.001, when + decay);
  n.connect(hp);
  hp.connect(g);
}

// ─── 베이스·코드 음색 ─────────────────────────────────────────────

function bassNote(ctx: BaseAudioContext, out: AudioNode, when: number, dur: number, midi: number, vel: number, sink: Sink) {
  const hz = midiToHz(midi);
  const saw = ctx.createOscillator();
  saw.type = 'sawtooth';
  saw.frequency.value = hz;
  const sub = ctx.createOscillator();
  sub.type = 'sine';
  sub.frequency.value = hz;
  const subGain = ctx.createGain();
  subGain.gain.value = 0.8;

  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.Q.value = 1.5;
  lp.frequency.setValueAtTime(500 + vel * 700, when);
  lp.frequency.exponentialRampToValueAtTime(260, when + Math.max(0.08, dur * 0.7));

  const g = envGain(ctx, out);
  const end = when + dur;
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(vel, when + 0.006);
  g.gain.exponentialRampToValueAtTime(vel * 0.7, when + 0.09);
  g.gain.setValueAtTime(vel * 0.7, Math.max(when + 0.09, end - 0.03));
  g.gain.exponentialRampToValueAtTime(0.0001, end);

  saw.connect(lp);
  sub.connect(subGain);
  subGain.connect(lp);
  lp.connect(g);
  for (const o of [saw, sub]) {
    o.start(when);
    o.stop(end + 0.02);
    sink(o, end + 0.02);
  }
}

/** 패드: 살짝 어긋난 톱니파 2개 → 저역 통과. 기타가 위에 칠 자리를 남기도록 작고 어둡게 */
function padNote(ctx: BaseAudioContext, out: AudioNode, when: number, dur: number, midi: number, level: number, sink: Sink) {
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 1300;
  const g = envGain(ctx, out);
  const end = when + dur;
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(level, when + 0.05);
  g.gain.setValueAtTime(level, Math.max(when + 0.05, end - 0.12));
  g.gain.exponentialRampToValueAtTime(0.0001, end);
  lp.connect(g);
  for (const detune of [-7, 7]) {
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = midiToHz(midi);
    o.detune.value = detune;
    o.connect(lp);
    o.start(when);
    o.stop(end + 0.02);
    sink(o, end + 0.02);
  }
}

/** 오르간 느낌(블루스): 사인 기음 + 2·3배음 약하게, 부드러운 어택 */
function organNote(ctx: BaseAudioContext, out: AudioNode, when: number, dur: number, midi: number, level: number, sink: Sink) {
  const g = envGain(ctx, out);
  const end = when + dur;
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(level, when + 0.02);
  g.gain.setValueAtTime(level, Math.max(when + 0.02, end - 0.06));
  g.gain.exponentialRampToValueAtTime(0.0001, end);
  [1, 2, 3].forEach((mult, i) => {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = midiToHz(midi) * mult;
    const hg = ctx.createGain();
    hg.gain.value = [1, 0.45, 0.2][i];
    o.connect(hg);
    hg.connect(g);
    o.start(when);
    o.stop(end + 0.02);
    sink(o, end + 0.02);
  });
}

/** 짧은 스탭(펑크): 사각파 → 대역 통과, 아주 짧은 엔벨로프 */
function stabNote(ctx: BaseAudioContext, out: AudioNode, when: number, midi: number, level: number, sink: Sink) {
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 1300;
  bp.Q.value = 0.7;
  const g = envGain(ctx, out);
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(level, when + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, when + 0.18);
  bp.connect(g);
  const o = ctx.createOscillator();
  o.type = 'square';
  o.frequency.value = midiToHz(midi);
  o.connect(bp);
  o.start(when);
  o.stop(when + 0.2);
  sink(o, when + 0.2);
}

/** 피아노 비슷한 음(발라드 아르페지오): 삼각파 + 옥타브 위 사인, 자연 감쇠 */
function pianoNote(ctx: BaseAudioContext, out: AudioNode, when: number, dur: number, midi: number, level: number, sink: Sink) {
  const g = envGain(ctx, out);
  const end = when + dur;
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(level, when + 0.01);
  g.gain.exponentialRampToValueAtTime(level * 0.35, when + Math.min(0.4, dur * 0.8));
  g.gain.exponentialRampToValueAtTime(0.0001, end);
  [1, 2].forEach((mult, i) => {
    const o = ctx.createOscillator();
    o.type = i === 0 ? 'triangle' : 'sine';
    o.frequency.value = midiToHz(midi) * mult;
    const hg = ctx.createGain();
    hg.gain.value = i === 0 ? 1 : 0.2;
    o.connect(hg);
    hg.connect(g);
    o.start(when);
    o.stop(end + 0.02);
    sink(o, end + 0.02);
  });
}

const DIST_CURVE = (() => {
  const c = new Float32Array(1024);
  for (let i = 0; i < c.length; i++) {
    const x = (i / (c.length - 1)) * 2 - 1;
    c[i] = Math.tanh(4 * x) / Math.tanh(4);
  }
  return c;
})();

/** 디스토션 파워코드 한 번(메탈·팝펑크 다운피킹): 톱니파 → 새추레이션 → 저역 통과 */
function powerHit(ctx: BaseAudioContext, out: AudioNode, when: number, dur: number, midis: number[], level: number, cutoff: number, sink: Sink) {
  const drive = ctx.createGain();
  drive.gain.value = 0.6;
  const shaper = ctx.createWaveShaper();
  shaper.curve = DIST_CURVE;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = cutoff;
  const g = envGain(ctx, out);
  const end = when + dur;
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(level, when + 0.005);
  g.gain.exponentialRampToValueAtTime(level * 0.6, when + Math.min(0.12, dur * 0.6));
  g.gain.exponentialRampToValueAtTime(0.0001, end);
  drive.connect(shaper);
  shaper.connect(lp);
  lp.connect(g);
  for (const m of midis) {
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = midiToHz(m);
    o.connect(drive);
    o.start(when);
    o.stop(end + 0.02);
    sink(o, end + 0.02);
  }
}

// ─── 스타일 ──────────────────────────────────────────────────────

/** 박 위치(0~4, 소수) */
type Hit = [pos: number, vel: number];
interface BassStep {
  pos: number;
  len: number;
  /** 근음에서 반음 수. 'approach'면 다음 코드 근음으로 반음 접근 */
  iv: number | 'approach';
  vel: number;
}

interface StyleDef {
  label: string;
  drums: (bar: number, bars: number) => { kick: Hit[]; snare: Hit[]; hat: Hit[]; openHat: Hit[] };
  bass: (chord: Chord, bar: number, bars: number) => BassStep[];
  comp: (ctx: BaseAudioContext, out: AudioNode, barStart: number, beat: number, chord: Chord, sink: Sink, bar: number, bars: number) => void;
}

const T = 2 / 3; // 셔플 뒷박(셋잇단 3번째)
/** 메탈 하프타임 브레이크다운 킥·베이스·기타 자리(당김) */
const BREAKDOWN = [0, 0.75, 1.5, 2.75, 3.25];
const beats4 = [0, 1, 2, 3];

const STYLES: Record<StyleId, StyleDef> = {
  blues: {
    label: '블루스 셔플',
    drums: (bar, bars) => {
      const last = bar === bars - 1;
      return {
        kick: [[0, 0.95], [2, 0.85], [2 + T, 0.4]],
        snare: last ? [[1, 0.85], [3, 0.6], [3 + 1 / 3, 0.65], [3 + T, 0.8]] : [[1, 0.85], [3, 0.85]],
        hat: beats4.flatMap((b) => [[b, 0.7], [b + T, 0.4]] as Hit[]),
        openHat: [],
      };
    },
    // 셔플 부기 라인: R 3 5 6 ♭7 6 5 3 (마이너 코드는 ♭3)
    bass: (c) => {
      const third = isMinor(c.quality) ? 3 : 4;
      const ivs = [0, third, 7, 9, 10, 9, 7, third];
      return ivs.map((iv, i) => {
        const b = Math.floor(i / 2);
        const up = i % 2 === 1;
        return { pos: up ? b + T : b, len: up ? 0.3 : 0.6, iv, vel: up ? 0.55 : 0.8 };
      });
    },
    // 2·4박 뒤 셔플 자리에 짧은 오르간 콤프(동7 화음)
    comp: (ctx, out, barStart, beat, c, sink) => {
      const tones = c.quality === 'min' || c.quality === 'm7' ? QUALITY_TONES.m7 : QUALITY_TONES['7'];
      const root = chordRoot(c.root);
      for (const pos of [1 + T, 3 + T]) {
        for (const t of tones.slice(1)) organNote(ctx, out, barStart + pos * beat, beat * 0.3, root + t, 0.09, sink);
      }
      // 마디 첫박에 길게 깔아 화음을 알려 준다
      for (const t of tones) organNote(ctx, out, barStart, beat * 0.9, root + t, 0.06, sink);
    },
  },
  rock8: {
    label: '락 8비트',
    drums: (bar, bars) => {
      const last = bar === bars - 1;
      const phraseEnd = bar % 4 === 3;
      return {
        kick: [[0, 1], [2, 0.9], [2.5, 0.75]],
        snare: last ? [[1, 0.9], [3, 0.9], [3.5, 0.7], [3.75, 0.8]] : [[1, 0.9], [3, 0.9]],
        hat: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5]
          .filter((p) => !(phraseEnd && p === 3.5))
          .map((p) => [p, p % 1 === 0 ? 0.65 : 0.4] as Hit),
        openHat: phraseEnd && !last ? [[3.5, 0.5]] : [],
      };
    },
    // 근음 8분음표, 마지막 8분은 다음 근음으로 반음 접근
    bass: () =>
      [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5].map((pos) => ({
        pos,
        len: 0.42,
        iv: pos === 3.5 ? ('approach' as const) : 0,
        vel: pos % 2 === 0 ? 0.85 : 0.65,
      })),
    // 파워코드(근음·5도·옥타브) 패드를 마디 내내 작게
    comp: (ctx, out, barStart, beat, c, sink) => {
      const root = chordRoot(c.root);
      for (const t of [0, 7, 12]) padNote(ctx, out, barStart, beat * 4 - 0.02, root + t, 0.045, sink);
      // 3도는 더 작게 — 장·단조 색만
      padNote(ctx, out, barStart, beat * 4 - 0.02, root + (isMinor(c.quality) ? 15 : 16), 0.02, sink);
    },
  },
  funk16: {
    label: '펑크 16비트',
    drums: (bar, bars) => {
      const last = bar === bars - 1;
      return {
        kick: [[0, 1], [0.75, 0.6], [2.5, 0.85]],
        snare: [
          [1, 0.95],
          [3, 0.95],
          [1.75, 0.16],
          [2.25, 0.14],
          [3.75, last ? 0.6 : 0.16],
        ],
        hat: Array.from({ length: 16 }, (_, i) => i / 4)
          .filter((p) => !(bar % 2 === 1 && p === 3.5))
          .map((p, i) => [p, [0.6, 0.25, 0.42, 0.25][i % 4]] as Hit),
        openHat: bar % 2 === 1 ? [[3.5, 0.45]] : [],
      };
    },
    // 당김 16분 라인: 근음·옥타브·♭7·5도, 스타카토
    bass: (c) => {
      const third = isMinor(c.quality) ? 3 : 4;
      return [
        { pos: 0, len: 0.35, iv: 0, vel: 0.95 },
        { pos: 0.75, len: 0.18, iv: 0, vel: 0.55 },
        { pos: 1.5, len: 0.18, iv: 12, vel: 0.75 },
        { pos: 1.75, len: 0.18, iv: 10, vel: 0.6 },
        { pos: 2.25, len: 0.2, iv: 7, vel: 0.7 },
        { pos: 2.75, len: 0.18, iv: 0, vel: 0.6 },
        { pos: 3, len: 0.3, iv: 0, vel: 0.85 },
        { pos: 3.5, len: 0.18, iv: third, vel: 0.55 },
        { pos: 3.75, len: 0.18, iv: 'approach', vel: 0.6 },
      ];
    },
    // 9화음 스탭을 16분 뒷자리에
    comp: (ctx, out, barStart, beat, c, sink) => {
      const root = chordRoot(c.root);
      // 성질대로: m7·7은 그대로, 3화음은 조 안의 색만(마이너=m7, 메이저=add9)
      const tones = { m7: [3, 7, 10, 14], '7': [4, 10, 14], min: [3, 7, 10], maj: [4, 7, 14], '5': [7, 12] }[c.quality];
      for (const [pos, lv] of [[0.5, 0.17], [1.25, 0.13], [2.5, 0.17], [3.25, 0.13]] as const) {
        for (const t of tones) stabNote(ctx, out, barStart + pos * beat, root + t, lv, sink);
      }
    },
  },
  metal: {
    label: '메탈',
    // 앞 6마디는 8분 킥으로 달리고, 마지막 2마디는 하프타임 브레이크다운(스네어 3박)
    drums: (bar, bars) => {
      if (bar >= bars - 2) {
        return {
          kick: BREAKDOWN.map((p) => [p, 0.8] as Hit),
          snare: [[2, 0.85]],
          hat: [[1, 0.5], [3, 0.5]],
          openHat: [[0, 0.6]],
        };
      }
      return {
        kick: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5].map((p) => [p, p % 1 === 0 ? 0.7 : 0.55] as Hit),
        snare: [[1, 0.8], [3, 0.8]],
        hat: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5].map((p) => [p, p % 1 === 0 ? 0.55 : 0.35] as Hit),
        openHat: bar === 0 ? [[0, 0.6]] : [],
      };
    },
    bass: (_c, bar, bars) =>
      bar >= bars - 2
        ? BREAKDOWN.map((pos) => ({ pos, len: 0.22, iv: 0, vel: 0.9 }))
        : [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5].map((pos) => ({ pos, len: 0.4, iv: 0, vel: 0.8 })),
    // 낮은 파워코드 뮤트 피킹(작게) — 브레이크다운은 킥과 같은 자리
    comp: (ctx, out, barStart, beat, c, sink, bar, bars) => {
      const root = 40 + ((c.root - 4 + 12) % 12); // E2~Eb3
      const hits = bar >= bars - 2 ? BREAKDOWN : [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5];
      const len = bar >= bars - 2 ? 0.3 : 0.35;
      for (const p of hits) powerHit(ctx, out, barStart + p * beat, len * beat, [root, root + 7], 0.17, 1800, sink);
    },
  },
  ballad: {
    label: '발라드',
    drums: () => ({
      kick: [[0, 0.7], [2.5, 0.5]],
      snare: [[1, 0.45], [3, 0.45]],
      hat: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5].map((p) => [p, p % 1 === 0 ? 0.35 : 0.2] as Hit),
      openHat: [],
    }),
    bass: () => [
      { pos: 0, len: 1.9, iv: 0, vel: 0.75 },
      { pos: 2, len: 1.4, iv: 0, vel: 0.6 },
      { pos: 3.5, len: 0.45, iv: 'approach', vel: 0.5 },
    ],
    // 패드를 낮게 깔고 그 위에 8분 아르페지오(근음·5도·옥타브·3도…)
    comp: (ctx, out, barStart, beat, c, sink) => {
      const root = chordRoot(c.root);
      const tones = QUALITY_TONES[c.quality];
      for (const t of tones) padNote(ctx, out, barStart, beat * 4 - 0.02, root + t, 0.025, sink);
      const third = tones[1];
      const arp = [0, 7, 12, 12 + third, 19, 12 + third, 12, 7];
      arp.forEach((t, i) => pianoNote(ctx, out, barStart + i * 0.5 * beat, beat * 0.9, root + t, 0.07, sink));
    },
  },
  poppunk: {
    label: '팝펑크',
    drums: (bar, bars) => {
      const last = bar === bars - 1;
      return {
        kick: [[0, 1], [1.5, 0.7], [2, 0.9], [2.5, 0.7]],
        snare: last ? [[1, 0.9], [3, 0.8], [3.25, 0.7], [3.5, 0.8], [3.75, 0.9]] : [[1, 0.95], [3, 0.95]],
        hat: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5].map((p) => [p, p % 1 === 0 ? 0.6 : 0.45] as Hit),
        openHat: bar % 4 === 0 ? [[0, 0.6]] : [],
      };
    },
    bass: () =>
      [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5].map((pos) => ({
        pos,
        len: 0.42,
        iv: pos === 3.5 ? ('approach' as const) : 0,
        vel: pos % 1 === 0 ? 0.85 : 0.7,
      })),
    // 8분 다운피킹 파워코드(밝게, 작게)
    comp: (ctx, out, barStart, beat, c, sink) => {
      const root = chordRoot(c.root);
      for (let i = 0; i < 8; i++) powerHit(ctx, out, barStart + i * 0.5 * beat, 0.45 * beat, [root, root + 7, root + 12], 0.11, 3000, sink);
    },
  },
};

export const STYLE_LABELS: Record<StyleId, string> = Object.fromEntries(
  (Object.keys(STYLES) as StyleId[]).map((id) => [id, STYLES[id].label]),
) as Record<StyleId, string>;

// ─── 마디 예약 ───────────────────────────────────────────────────

export interface Buses {
  drums: GainNode;
  bass: GainNode;
  chords: GainNode;
  dispose: () => void;
  /** 마스터 입력(정지 때 페이드) */
  master: GainNode;
}

const PART_LEVEL: Record<Part, number> = { drums: 0.9, bass: 0.75, chords: 1 };

/** 파트 버스 → (베이스만 약한 새추레이션) → 마스터 체인 */
export function createBuses(ctx: BaseAudioContext): Buses {
  const { master, limiter } = createMasterChain(ctx);
  const drums = ctx.createGain();
  drums.gain.value = PART_LEVEL.drums;
  drums.connect(master);

  const bass = ctx.createGain();
  bass.gain.value = PART_LEVEL.bass;
  const shaper = ctx.createWaveShaper();
  const curve = new Float32Array(1024);
  for (let i = 0; i < curve.length; i++) {
    const x = (i / (curve.length - 1)) * 2 - 1;
    curve[i] = Math.tanh(1.8 * x) / Math.tanh(1.8);
  }
  shaper.curve = curve;
  const bassLp = ctx.createBiquadFilter();
  bassLp.type = 'lowpass';
  bassLp.frequency.value = 2200;
  // 새추레이션 뒤 레벨(앞의 bass 게인은 드라이브 겸 음소거용)
  const bassOut = ctx.createGain();
  bassOut.gain.value = 0.3;
  bass.connect(shaper);
  shaper.connect(bassLp);
  bassLp.connect(bassOut);
  bassOut.connect(master);

  const chords = ctx.createGain();
  chords.gain.value = PART_LEVEL.chords;
  chords.connect(master);

  return {
    drums,
    bass,
    chords,
    master,
    dispose: () => {
      for (const n of [drums, bass, shaper, bassLp, bassOut, chords, master, limiter]) n.disconnect();
    },
  };
}

/** 한 마디를 barStart(ctx 시각)에 예약 */
export function scheduleBar(
  ctx: BaseAudioContext,
  buses: Buses,
  spec: JamSpec,
  barIndex: number,
  barStart: number,
  bpm: number,
  sink: Sink,
): void {
  const style = STYLES[spec.style];
  const bars = spec.chords.length;
  const chord = spec.chords[barIndex % bars];
  const next = spec.chords[(barIndex + 1) % bars];
  const beat = 60 / bpm;

  const d = style.drums(barIndex % bars, bars);
  for (const [p, v] of d.kick) kick(ctx, buses.drums, barStart + p * beat, v, sink);
  for (const [p, v] of d.snare) snare(ctx, buses.drums, barStart + p * beat, v, sink);
  for (const [p, v] of d.hat) hat(ctx, buses.drums, barStart + p * beat, v, false, sink);
  for (const [p, v] of d.openHat) hat(ctx, buses.drums, barStart + p * beat, v, true, sink);

  const root = bassRoot(chord.root);
  const nextRoot = bassRoot(next.root);
  const loopBar = barIndex % bars;
  for (const s of style.bass(chord, loopBar, bars)) {
    let midi: number;
    if (s.iv === 'approach') {
      // 다음 근음이 같으면 5도, 다르면 반음 아래(위로 갈 때)·위(아래로 갈 때)에서 접근
      midi = nextRoot === root ? root + 7 : nextRoot > root ? nextRoot - 1 : nextRoot + 1;
    } else {
      midi = root + s.iv;
    }
    bassNote(ctx, buses.bass, barStart + s.pos * beat, s.len * beat, midi, s.vel * 0.55, sink);
  }

  style.comp(ctx, buses.chords, barStart, beat, chord, sink, loopBar, bars);
}

// ─── 실시간 재생 ─────────────────────────────────────────────────

const LOOKAHEAD_VISIBLE = 0.35; // 초 — 화면에 있을 때는 짧게(BPM 반영이 빠르게)
const LOOKAHEAD_HIDDEN = 2.5; // 백그라운드 탭은 타이머가 1초 단위로 느려진다
const TICK_MS = 50;

export interface JamPosition {
  /** 0부터 계속 증가하는 마디 번호. 카운트인 중이면 -1 */
  bar: number;
  /** 루프 안 마디(0~7) */
  loopBar: number;
  /** 마디 안 박(0~3, 소수) */
  beat: number;
  bpm: number;
}

export interface JamPlayer {
  stop: () => void;
  setBpm: (bpm: number) => void;
  setMute: (part: Part, muted: boolean) => void;
  position: () => JamPosition | null;
}

export interface JamOptions {
  countIn?: boolean;
  /** 박자를 지키지 못했을 때(백그라운드에서 예약이 밀림) — 플레이어는 이미 멈춘 상태 */
  onUnderrun?: () => void;
}

export function startJam(ctx: AudioContext, spec: JamSpec, opts: JamOptions = {}): JamPlayer {
  const buses = createBuses(ctx);
  const live: { node: AudioScheduledSourceNode; end: number }[] = [];
  const sink: Sink = (node, end) => live.push({ node, end });
  const log: { bar: number; start: number; dur: number; bpm: number }[] = [];

  let bpm = spec.bpm;
  let stopped = false;
  const t0 = ctx.currentTime + 0.1;
  let cancelClicks: (() => void) | null = null;
  let nextStart = t0;
  if (opts.countIn) {
    cancelClicks = scheduleClicks(ctx, bpm, t0, barDuration(bpm) - 0.01);
    log.push({ bar: -1, start: t0, dur: barDuration(bpm), bpm });
    nextStart = t0 + barDuration(bpm);
  }
  let nextBar = 0;

  function tick() {
    if (stopped) return;
    const now = ctx.currentTime;
    if (nextStart < now - 0.02) {
      // 예약이 박자를 놓쳤다 — 엉킨 소리를 내느니 멈추고 알린다
      stop();
      opts.onUnderrun?.();
      return;
    }
    const lookahead = typeof document !== 'undefined' && document.hidden ? LOOKAHEAD_HIDDEN : LOOKAHEAD_VISIBLE;
    while (nextStart < now + lookahead) {
      scheduleBar(ctx, buses, spec, nextBar, nextStart, bpm, sink);
      const dur = barDuration(bpm);
      log.push({ bar: nextBar, start: nextStart, dur, bpm });
      nextStart += dur;
      nextBar += 1;
    }
    // 끝난 소스·오래된 기록 정리
    for (let i = live.length - 1; i >= 0; i--) if (live[i].end < now - 0.1) live.splice(i, 1);
    while (log.length > 1 && log[1].start + log[1].dur < now) log.shift();
  }

  const timer = setInterval(tick, TICK_MS);
  // 백그라운드로 가는 순간 길게 미리 예약해 둔다(다음 타이머는 최대 1초 늦게 온다)
  const onVisibility = () => tick();
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisibility);
  tick();

  function stop() {
    if (stopped) return;
    stopped = true;
    clearInterval(timer);
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisibility);
    cancelClicks?.();
    const now = ctx.currentTime;
    // 클릭 없이 끊기: 30ms 페이드 후 정지·분리
    buses.master.gain.cancelScheduledValues(now);
    buses.master.gain.setValueAtTime(buses.master.gain.value, now);
    buses.master.gain.linearRampToValueAtTime(0, now + 0.03);
    for (const { node } of live) {
      try {
        node.stop(now + 0.04);
      } catch {
        /* 이미 끝난 소스 */
      }
    }
    setTimeout(() => buses.dispose(), 80);
  }

  return {
    stop,
    setBpm: (v) => {
      bpm = v;
    },
    setMute: (part, muted) => {
      const g = buses[part].gain;
      const now = ctx.currentTime;
      g.cancelScheduledValues(now);
      g.setValueAtTime(g.value, now);
      g.linearRampToValueAtTime(muted ? 0 : PART_LEVEL[part], now + 0.015);
    },
    position: () => {
      if (stopped) return null;
      const now = ctx.currentTime;
      const cur = log.find((e) => now >= e.start && now < e.start + e.dur);
      if (!cur) return null;
      const bars = spec.chords.length;
      return {
        bar: cur.bar,
        loopBar: cur.bar < 0 ? -1 : cur.bar % bars,
        beat: ((now - cur.start) / cur.dur) * 4,
        bpm: cur.bpm,
      };
    },
  };
}
