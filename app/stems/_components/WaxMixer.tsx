'use client';

import { useMemo } from 'react';

/* ─── Types ─── */
type ThemeKey = 'white' | 'ink';

interface WaxMixerProps {
  spinSpeed?: number;
  motion?: 'smooth' | 'steppy';
  direction?: 'forward' | 'reverse';
  theme?: ThemeKey;
  className?: string;
}

interface ThemeConfig {
  bg: string;
  bodyFill: string;
  bodyStroke: string;
  ink: string;
  shadow: string;
  shadowOp: number;
  grain: boolean;
}

/* ─── Module-level RNG (reset per section; safe: called from useMemo) ─── */
let _rnd = (): number => 0.5;
const rj = (amt: number) => (_rnd() * 2 - 1) * amt;

function mulberry32(a: number): () => number {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ─── Rough-path primitives ─── */
function roughCircle(cx: number, cy: number, r: number, jit = 2.2, segs = 46): string {
  const pts: [number, number][] = [];
  for (let i = 0; i < segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    const rr = r + rj(jit);
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < segs; i++) {
    const p = pts[i], n = pts[(i + 1) % segs];
    d += ` Q ${p[0].toFixed(1)} ${p[1].toFixed(1)} ${((p[0] + n[0]) / 2).toFixed(1)} ${((p[1] + n[1]) / 2).toFixed(1)}`;
  }
  return d + ' Z';
}

function roughLine(x1: number, y1: number, x2: number, y2: number, jit = 1.6, segs = 6): string {
  let d = `M ${x1} ${y1}`;
  for (let i = 1; i <= segs; i++) {
    const t = i / segs;
    d += ` L ${(x1 + (x2 - x1) * t + rj(jit)).toFixed(1)} ${(y1 + (y2 - y1) * t + rj(jit)).toFixed(1)}`;
  }
  return d;
}

function roughRect(x: number, y: number, w: number, h: number, rad = 8, jit = 1.6): string {
  const j = () => rj(jit);
  return `M ${x + rad} ${y + j()} L ${x + w - rad} ${y + j()} Q ${x + w + j()} ${y + j()} ${x + w + j()} ${y + rad}
    L ${x + w + j()} ${y + h - rad} Q ${x + w + j()} ${y + h + j()} ${x + w - rad} ${y + h + j()}
    L ${x + rad} ${y + h + j()} Q ${x + j()} ${y + h + j()} ${x + j()} ${y + h - rad}
    L ${x + j()} ${y + rad} Q ${x + j()} ${y + j()} ${x + rad} ${y + j()} Z`;
}

const P = (d: string, attrs: string) => `<path d="${d}" ${attrs}/>`;

/* ─── Stroke-font (vector glyphs, no webfont) ─── */
const GLY: Record<string, { w: number; d?: string[]; dot?: boolean }> = {
  M: { w: 80, d: ['M8 96 L17 9 L40 63 L63 9 L72 96'] },
  U: { w: 72, d: ['M10 9 L11 64 Q13 94 40 94 Q67 94 67 64 L68 9'] },
  S: { w: 62, d: ['M55 24 Q47 9 29 10 Q8 12 9 34 Q11 52 35 54 Q57 56 56 75 Q53 93 29 92 Q9 90 6 73'] },
  I: { w: 24, d: ['M12 9 L12 95'] },
  C: { w: 64, d: ['M58 26 Q46 9 29 10 Q8 12 8 52 Q8 93 29 94 Q47 95 58 78'] },
  P: { w: 58, d: ['M13 96 L13 9 L39 9 Q59 11 59 31 Q59 52 39 53 L13 51'] },
  O: { w: 72, d: ['M36 9 Q9 11 9 52 Q9 94 36 94 Q63 94 63 52 Q63 10 36 9 Z'] },
  T: { w: 58, d: ['M6 12 L52 12', 'M29 12 L29 95'] },
  ' ': { w: 30, d: [] },
  '•': { w: 30, dot: true },
};

/* stroke-width uses sw/scale so strokes scale with letters (no non-scaling-stroke) */
function drawWord(
  word: string, centerX: number, baselineY: number,
  s: number, bow: number, tilt: number, stroke: string, sw: number,
): string {
  const gap = 7;
  let total = 0;
  for (const ch of word) total += (GLY[ch]?.w ?? 40) * s + gap * s;
  total -= gap * s;
  let x = centerX - total / 2;
  let out = '';
  for (const ch of word) {
    const G = GLY[ch] ?? GLY[' '];
    const w = G.w;
    const cx = x + w * s / 2;
    const t = (cx - centerX) / (total / 2 || 1);
    const y = baselineY + bow * (t * t);
    const rot = t * tilt;
    if (G.dot) {
      out += `<g transform="translate(${cx.toFixed(1)},${(y - 40 * s).toFixed(1)}) rotate(${rot.toFixed(1)})"><circle cx="0" cy="0" r="${(7 * s).toFixed(1)}" fill="${stroke}"/></g>`;
    } else if (G.d) {
      const paths = G.d.map(d =>
        `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${(sw / s).toFixed(2)}" stroke-linecap="round" stroke-linejoin="round"/>`,
      ).join('');
      out += `<g transform="translate(${cx.toFixed(1)},${y.toFixed(1)}) rotate(${rot.toFixed(1)}) scale(${s}) translate(${-w / 2},-100)">${paths}</g>`;
    }
    x += w * s + gap * s;
  }
  return out;
}

/* ─── Turntable (seed 11=left, 23=right) ─── */
function turntable(side: 'L' | 'R', TH: ThemeConfig): string {
  _rnd = mulberry32(side === 'L' ? 11 : 23);
  const Cx = 290, Cy = 272;
  let g = '';

  g += P(roughRect(2, 12, 658, 498, 22, 2.6), `fill="${TH.bodyFill}" stroke="${TH.bodyStroke}" stroke-width="5"`);

  g += P(roughRect(118, 6, 74, 26, 8, 1.2), 'fill="#242424"');
  g += P(roughRect(470, 8, 74, 26, 8, 1.2), 'fill="#242424"');
  g += `<path d="M 440 30 C 455 6 478 2 500 -28 S 520 -70 470 -96" fill="none" stroke="#1c1c1c" stroke-width="4" stroke-linecap="round"/>`;

  // strobe speckle dots
  let dots = '';
  for (let i = 0; i < 118; i++) {
    const a = (i / 118) * Math.PI * 2 + rj(0.03);
    const rr = 229 + rj(3);
    dots += `<circle cx="${(Cx + Math.cos(a) * rr).toFixed(1)}" cy="${(Cy + Math.sin(a) * rr).toFixed(1)}" r="${(2.4 + _rnd() * 1.3).toFixed(1)}" fill="#f2f0ea"/>`;
  }
  g += P(roughCircle(Cx, Cy, 243, 2.4), 'fill="none" stroke="#202020" stroke-width="2.5"');
  g += dots;

  // vinyl disc + grooves (rotation-invariant, stays static)
  g += P(roughCircle(Cx, Cy, 216, 2.6), 'fill="#050505" stroke="#000" stroke-width="3"');
  [120, 150, 176, 198, 210].forEach(r => {
    g += P(roughCircle(Cx, Cy, r, 1.4, 54), 'fill="none" stroke="#171717" stroke-width="1"');
  });

  // rotating lettering group (only this spins)
  g += `<g class="ms-spin">
    <circle cx="${Cx}" cy="${Cy}" r="170" fill="none" stroke="none"/>
    ${drawWord('MUSIC', Cx, Cy - 116, 0.74, 26, 14, '#f4f1e9', 6.5)}
    ${drawWord('SPOT', Cx, Cy + 162, 0.82, -22, 14, '#f4f1e9', 6.5)}
  </g>`;

  // center label (static, circular)
  g += P(roughCircle(Cx, Cy, 80, 2), 'fill="#faf8f2"');
  g += P(roughCircle(Cx, Cy, 80, 2), 'fill="none" stroke="#d8d4c8" stroke-width="1.5"');
  g += `<circle cx="${Cx}" cy="${Cy}" r="6.5" fill="#0a0a0a"/>`;

  // spindle-well dot
  g += P(roughCircle(78, 82, 23, 1.6), `fill="${TH.bodyFill}" stroke="#202020" stroke-width="2.5"`);
  g += `<circle cx="78" cy="82" r="6" fill="#1c1c1c"/>`;

  // tonearm
  g += P(roughCircle(566, 176, 58, 2), 'fill="none" stroke="#9a9a9a" stroke-width="3"');
  g += P(roughCircle(602, 210, 22, 1.4), 'fill="#cfcfcf" stroke="#5a5a5a" stroke-width="2"');
  for (let i = -3; i <= 3; i++) {
    g += P(roughLine(602 - 18, 210 + i * 5, 602 + 18, 210 + i * 5, 0.8, 3), 'stroke="#5a5a5a" stroke-width="1" fill="none"');
  }
  g += P(roughRect(548, 70, 46, 64, 6, 1.2), 'fill="#7c7c7c" stroke="#3c3c3c" stroke-width="2.5"');
  g += P(roughLine(548, 92, 594, 92, 0.8, 3), 'stroke="#3c3c3c" stroke-width="1.5" fill="none"');
  g += P(roughLine(571, 70, 571, 134, 0.8, 3), 'stroke="#3c3c3c" stroke-width="1.5" fill="none"');
  g += P(roughLine(566, 128, 430, 402, 2.2, 8), 'stroke="#3a3a3a" stroke-width="15" fill="none" stroke-linecap="round"');
  g += P(roughLine(566, 128, 430, 402, 1.6, 8), 'stroke="#b9b9b9" stroke-width="8" fill="none" stroke-linecap="round"');
  g += `<g transform="rotate(63 430 402)">`;
  g += P(roughRect(414, 388, 40, 30, 4, 1), 'fill="#2b2b2b" stroke="#000" stroke-width="2"');
  g += P(roughRect(420, 416, 28, 16, 3, 1), 'fill="#dcdcdc" stroke="#444" stroke-width="1.5"');
  g += `</g>`;

  // pitch fader
  for (let i = 0; i < 7; i++) {
    g += P(roughRect(595, 250 + i * 26, 22, 13, 3, 0.9), 'fill="#141414"');
  }
  g += P(roughLine(636, 246, 636, 432, 1.2, 6), 'stroke="#9a9a9a" stroke-width="3" fill="none"');
  g += P(roughRect(620, 326, 34, 26, 3, 1), 'fill="#1a1a1a" stroke="#000" stroke-width="1.5"');
  g += P(roughLine(620, 339, 654, 339, 0.6, 3), 'stroke="#cfcfcf" stroke-width="2" fill="none"');

  // 33/45 speed block
  g += P(roughRect(50, 452, 72, 48, 6, 1.2), `fill="#121212" stroke="${TH.bodyStroke}" stroke-width="1.5"`);
  g += `<text x="62" y="473" fill="#e8e8e8" font-family="ui-sans-serif,sans-serif" font-size="13" font-weight="700">33</text>`;
  g += `<text x="86" y="492" fill="#e8e8e8" font-family="ui-sans-serif,sans-serif" font-size="13" font-weight="700">45</text>`;
  g += P(roughRect(132, 486, 30, 14, 4, 0.8), 'fill="#141414"');
  g += P(roughRect(170, 486, 30, 14, 4, 0.8), 'fill="#141414"');
  g += `<circle cx="225" cy="494" r="4.5" fill="#161616"/><circle cx="244" cy="494" r="4.5" fill="#161616"/>`;

  // deck wordmark + ruler
  g += drawWord('M•S MUSIC', 530, 487, 0.26, -3, 4, TH.ink, 3.6);
  g += P(roughLine(452, 500, 612, 500, 0.8, 8), `stroke="${TH.ink}" stroke-width="2" fill="none"`);
  for (let i = 0; i < 11; i++) {
    g += P(roughLine(456 + i * 15, 500, 456 + i * 15, 494 - (i % 2 ? 0 : 5), 0.5, 2), `stroke="${TH.ink}" stroke-width="1.5" fill="none"`);
  }

  return g;
}

/* ─── Mixer (seed 41) ─── */
function mixer(TH: ThemeConfig): string {
  _rnd = mulberry32(41);
  let g = '';
  const colX = [70, 180, 290];
  const rowY = [100, 178, 252, 322];

  // RCA cables
  [40, 290].forEach(bx => {
    g += `<path d="M ${bx} 48 C ${bx - 6} 0 ${bx + 24} -36 ${bx + 10} -82" fill="none" stroke="#3aa6dd" stroke-width="10" stroke-linecap="round"/>`;
    g += `<path d="M ${bx + 26} 48 C ${bx + 20} 4 ${bx + 44} -30 ${bx + 30} -78" fill="none" stroke="#3aa6dd" stroke-width="10" stroke-linecap="round"/>`;
    g += P(roughRect(bx - 4, 30, 16, 20, 3, 0.8), 'fill="#f2f2f2"');
    g += P(roughRect(bx + 18, 30, 16, 20, 3, 0.8), 'fill="#c0271e"');
  });
  // headphone plugs + cord
  g += P(roughRect(150, 16, 18, 34, 4, 1), 'fill="#6a6a6a" stroke="#333" stroke-width="2"');
  g += P(roughRect(185, 16, 18, 34, 4, 1), 'fill="#6a6a6a" stroke="#333" stroke-width="2"');
  g += `<path d="M 159 18 C 150 -20 205 -20 196 18" fill="none" stroke="#111" stroke-width="9" stroke-linecap="round"/>`;
  g += `<path d="M 200 40 C 250 30 250 70 230 96 S 250 70 300 60" fill="none" stroke="#111" stroke-width="4"/>`;

  // body
  g += P(roughRect(0, 45, 360, 458, 8, 2), 'fill="#616661" stroke="#3a3d3a" stroke-width="4"');
  [[14, 72], [14, 470], [346, 72], [346, 470]].forEach(([sx, sy]) => {
    g += `<circle cx="${sx}" cy="${sy}" r="4" fill="#3a3d3a"/><circle cx="${sx - 1}" cy="${sy - 1}" r="1.6" fill="#cdd0cd"/>`;
  });

  function knob(kx: number, ky: number, kr = 19): string {
    let s = P(roughCircle(kx, ky, kr, 1.4, 30), 'fill="#0b0b0b" stroke="#000" stroke-width="2"');
    const a = -2.1 + _rnd() * 1.2;
    s += `<line x1="${kx}" y1="${ky}" x2="${(kx + Math.cos(a) * (kr - 3)).toFixed(1)}" y2="${(ky + Math.sin(a) * (kr - 3)).toFixed(1)}" stroke="#f0f0f0" stroke-width="3" stroke-linecap="round"/>`;
    s += `<line x1="${kx - kr - 10}" y1="${ky + 4}" x2="${kx - kr - 2}" y2="${ky + 4}" stroke="#e8e8e8" stroke-width="2"/>`;
    s += `<line x1="${kx - 4}" y1="${ky - kr - 9}" x2="${kx + 6}" y2="${ky - kr - 9}" stroke="#e8e8e8" stroke-width="2.5"/>`;
    return s;
  }

  colX.forEach((cx, ci) => {
    rowY.forEach((cy, ri) => {
      if (ci === 1 && ri === 3) {
        g += knob(cx, cy, 17);
        for (let k = 0; k < 7; k++) {
          const a = (k / 7) * Math.PI * 2;
          g += `<circle cx="${(cx + Math.cos(a) * 26).toFixed(1)}" cy="${(cy + Math.sin(a) * 26).toFixed(1)}" r="${(2.6 + _rnd() * 1.6).toFixed(1)}" fill="#f0f0f0"/>`;
        }
      } else {
        g += knob(cx, cy, ri === 0 ? 16 : 19);
      }
    });
  });

  function channel(fx: number) {
    const vx = fx - 22;
    for (let i = 0; i < 9; i++) {
      const col = i < 2 ? '#c0271e' : '#3a9b46';
      g += P(roughRect(vx, 372 + i * 9, 12, 5, 1, 0.5), `fill="${col}"`);
      g += `<circle cx="${vx + 18}" cy="${374 + i * 9}" r="2" fill="#eee"/>`;
    }
    g += P(roughLine(fx + 14, 372, fx + 14, 452, 1, 5), 'stroke="#111" stroke-width="3" fill="none"');
    g += P(roughRect(fx - 4, 376, 38, 16, 3, 0.8), 'fill="#f2f2f2" stroke="#111" stroke-width="2.5"');
    g += P(roughLine(fx + 14, 392, fx + 14, 452, 0.8, 4), 'stroke="#111" stroke-width="5" fill="none"');
  }
  channel(96);
  channel(236);

  // center curve + crossfader
  g += P(roughLine(150, 432, 216, 432, 1, 5), 'stroke="#eee" stroke-width="3" fill="none"');
  g += `<path d="M 176 432 Q 184 414 192 432" fill="none" stroke="#eee" stroke-width="3"/>`;
  g += knob(168, 432, 11);
  g += P(roughLine(120, 478, 250, 478, 1, 6), 'stroke="#111" stroke-width="3" fill="none"');
  g += P(roughRect(176, 468, 18, 22, 3, 0.8), 'fill="#f2f2f2" stroke="#111" stroke-width="2.5"');

  // feet
  [110, 140, 210, 240].forEach(fx => {
    g += P(roughRect(fx, 503, 18, 14, 2, 0.8), 'fill="#1a1a1a"');
  });

  return g;
}

/* ─── Themes ─── */
const THEMES: Record<ThemeKey, ThemeConfig> = {
  white: { bg: '#ffffff', bodyFill: '#e6e4df', bodyStroke: '#232323', ink: '#1a1a1a', shadow: '#d5d5d5', shadowOp: 0.7, grain: false },
  ink:   { bg: '#0B0B0E', bodyFill: '#17171c', bodyStroke: '#34343c', ink: '#f4f1e9', shadow: '#000000', shadowOp: 0.55, grain: true },
};

function shadow(gx: number, gy: number, w: number, h: number, TH: ThemeConfig): string {
  return P(roughRect(gx + 14, gy + 18, w, h, 20, 3), `fill="${TH.shadow}" opacity="${TH.shadowOp}" filter="url(#wax-soft)"`);
}

function buildSVG(TH: ThemeConfig): string {
  // seed 7 for initial state (shadows use this before each section resets)
  _rnd = mulberry32(7);
  const grain = TH.grain
    ? `<rect x="0" y="0" width="1920" height="737" fill="#fff" opacity="0.045" filter="url(#wax-grain)" style="mix-blend-mode:screen"/>`
    : '';
  return `<svg viewBox="0 0 1920 737" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;display:block">
    <defs>
      <filter id="wax-soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="7"/></filter>
      <filter id="wax-grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>
    </defs>
    <rect x="0" y="0" width="1920" height="737" fill="${TH.bg}"/>
    ${shadow(57, 112, 658, 498, TH)}
    ${shadow(782, 195, 360, 458, TH)}
    ${shadow(1177, 112, 658, 498, TH)}
    <g class="ms-deck ms-deck-left" transform="translate(55,100)">${turntable('L', TH)}</g>
    <g class="ms-mixer" transform="translate(782,150)">${mixer(TH)}</g>
    <g class="ms-deck ms-deck-right" transform="translate(1175,100)">${turntable('R', TH)}</g>
    ${grain}
  </svg>`;
}

/* ─── Component ─── */
export default function WaxMixer({
  spinSpeed = 0.8,
  motion = 'smooth',
  direction = 'forward',
  theme = 'white',
  className = '',
}: WaxMixerProps) {
  const svgContent = useMemo(() => buildSVG(THEMES[theme] ?? THEMES.white), [theme]);

  const timingFn = motion === 'steppy' ? 'steps(8)' : 'linear';
  const animDir = direction === 'reverse' ? 'reverse' : 'normal';

  return (
    <div
      className={`w-full max-w-[1680px] mx-auto ${className}`}
      style={{ '--spin': `${spinSpeed}s` } as React.CSSProperties}
    >
      <style>{`
        .ms-spin {
          transform-box: fill-box;
          transform-origin: center;
          animation: ms-msspin var(--spin, 0.8s) ${timingFn} ${animDir} infinite;
          will-change: transform;
        }
        .ms-deck-right .ms-spin {
          animation-delay: calc(var(--spin, 0.8s) / -2);
        }
        @keyframes ms-msspin { to { transform: rotate(360deg); } }
        @media (prefers-reduced-motion: reduce) { .ms-spin { animation: none; } }
      `}</style>
      <div dangerouslySetInnerHTML={{ __html: svgContent }} />
    </div>
  );
}
