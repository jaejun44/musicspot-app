'use client';

import { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const THEME_SONG_URL =
  'https://mwllqreadynmaoorymkn.supabase.co/storage/v1/object/public/stems/theme/musicspot_theme.mp3';

/* ── seeded RNG + rough-path helpers (Wax Mixer.html 원본 그대로) ── */
function mulberry32(a: number) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
let RND = mulberry32(7);
const rj = (amt: number) => (RND() * 2 - 1) * amt;

function roughCircle(cx: number, cy: number, r: number, jit = 2.2, segs = 46) {
  const pts: [number, number][] = [];
  for (let i = 0; i < segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    const rr = r + rj(jit);
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < segs; i++) {
    const p = pts[i], n = pts[(i + 1) % segs];
    const mx = (p[0] + n[0]) / 2, my = (p[1] + n[1]) / 2;
    d += ` Q ${p[0].toFixed(1)} ${p[1].toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`;
  }
  return d + ' Z';
}
function roughLine(x1: number, y1: number, x2: number, y2: number, jit = 1.6, segs = 6) {
  let d = `M ${x1} ${y1}`;
  for (let i = 1; i <= segs; i++) {
    const t = i / segs;
    d += ` L ${(x1 + (x2 - x1) * t + rj(jit)).toFixed(1)} ${(y1 + (y2 - y1) * t + rj(jit)).toFixed(1)}`;
  }
  return d;
}
function roughRect(x: number, y: number, w: number, h: number, rad = 8, jit = 1.6) {
  const j = () => rj(jit);
  return `M ${x + rad} ${y + j()}
    L ${x + w - rad} ${y + j()} Q ${x + w + j()} ${y + j()} ${x + w + j()} ${y + rad}
    L ${x + w + j()} ${y + h - rad} Q ${x + w + j()} ${y + h + j()} ${x + w - rad} ${y + h + j()}
    L ${x + rad} ${y + h + j()} Q ${x + j()} ${y + h + j()} ${x + j()} ${y + h - rad}
    L ${x + j()} ${y + rad} Q ${x + j()} ${y + j()} ${x + rad} ${y + j()} Z`;
}
const P = (d: string, attrs: string) => `<path d="${d}" ${attrs}/>`;

/* ── hand-drawn marker glyphs ── */
const GLY: Record<string, { w: number; d?: string[]; dot?: boolean }> = {
  'M': { w: 80, d: ["M8 96 L17 9 L40 63 L63 9 L72 96"] },
  'U': { w: 72, d: ["M10 9 L11 64 Q13 94 40 94 Q67 94 67 64 L68 9"] },
  'S': { w: 62, d: ["M55 24 Q47 9 29 10 Q8 12 9 34 Q11 52 35 54 Q57 56 56 75 Q53 93 29 92 Q9 90 6 73"] },
  'I': { w: 24, d: ["M12 9 L12 95"] },
  'C': { w: 64, d: ["M58 26 Q46 9 29 10 Q8 12 8 52 Q8 93 29 94 Q47 95 58 78"] },
  'P': { w: 58, d: ["M13 96 L13 9 L39 9 Q59 11 59 31 Q59 52 39 53 L13 51"] },
  'O': { w: 72, d: ["M36 9 Q9 11 9 52 Q9 94 36 94 Q63 94 63 52 Q63 10 36 9 Z"] },
  'T': { w: 58, d: ["M6 12 L52 12", "M29 12 L29 95"] },
  ' ': { w: 30, d: [] },
  '•': { w: 30, dot: true },
};

function drawWord(word: string, centerX: number, baselineY: number, s: number, bow: number, tilt: number, stroke: string, sw: number) {
  const gap = 7;
  let total = 0;
  for (const ch of word) { total += ((GLY[ch]?.w ?? 40) * s + gap * s); }
  total -= gap * s;
  let x = centerX - total / 2, out = '';
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
      const paths = G.d.map(d => `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>`).join('');
      out += `<g transform="translate(${cx.toFixed(1)},${y.toFixed(1)}) rotate(${rot.toFixed(1)}) scale(${s}) translate(${-w / 2},-100)">${paths}</g>`;
    }
    x += w * s + gap * s;
  }
  return out;
}

/* ── turntable ── */
type Theme = { bodyFill: string; bodyStroke: string; ink: string; shadow: string; shadowOp: number; bg: string };

function turntable(side: 'L' | 'R', TH: Theme) {
  RND = mulberry32(side === 'L' ? 11 : 23);
  const Cx = 290, Cy = 272;
  let g = '';
  g += P(roughRect(2, 12, 658, 498, 22, 2.6), `fill="${TH.bodyFill}" stroke="${TH.bodyStroke}" stroke-width="5"`);
  g += P(roughRect(118, 6, 74, 26, 8, 1.2), 'fill="#242424"');
  g += P(roughRect(470, 8, 74, 26, 8, 1.2), 'fill="#242424"');
  g += `<path d="M 440 30 C 455 6 478 2 500 -28 S 520 -70 470 -96" fill="none" stroke="#1c1c1c" stroke-width="4" stroke-linecap="round"/>`;
  let dots = '';
  for (let i = 0; i < 118; i++) {
    const a = (i / 118) * Math.PI * 2 + rj(0.03);
    const rr = 229 + rj(3);
    dots += `<circle cx="${(Cx + Math.cos(a) * rr).toFixed(1)}" cy="${(Cy + Math.sin(a) * rr).toFixed(1)}" r="${(2.4 + RND() * 1.3).toFixed(1)}" fill="#f2f0ea"/>`;
  }
  g += P(roughCircle(Cx, Cy, 243, 2.4), 'fill="none" stroke="#202020" stroke-width="2.5"');
  g += dots;
  g += P(roughCircle(Cx, Cy, 216, 2.6), 'fill="#050505" stroke="#000" stroke-width="3"');
  [120, 150, 176, 198, 210].forEach(r => { g += P(roughCircle(Cx, Cy, r, 1.4, 54), `fill="none" stroke="#171717" stroke-width="1"`); });
  g += `<g class="spin">
    <circle cx="${Cx}" cy="${Cy}" r="170" fill="none" stroke="none"/>
    ${drawWord('MUSIC', Cx, Cy - 122, 0.92, 30, 15, '#f4f1e9', 11)}
    ${drawWord('SPOT', Cx, Cy + 150, 1.02, -26, 15, '#f4f1e9', 11)}
  </g>`;
  g += P(roughCircle(Cx, Cy, 80, 2), 'fill="#faf8f2"');
  g += P(roughCircle(Cx, Cy, 80, 2), 'fill="none" stroke="#d8d4c8" stroke-width="1.5"');
  g += `<circle cx="${Cx}" cy="${Cy}" r="6.5" fill="#0a0a0a"/>`;
  g += P(roughCircle(78, 82, 23, 1.6), `fill="${TH.bodyFill}" stroke="#202020" stroke-width="2.5"`);
  g += `<circle cx="78" cy="82" r="6" fill="#1c1c1c"/>`;
  g += P(roughCircle(566, 176, 58, 2), 'fill="none" stroke="#9a9a9a" stroke-width="3"');
  g += P(roughCircle(602, 210, 22, 1.4), 'fill="#cfcfcf" stroke="#5a5a5a" stroke-width="2"');
  for (let i = -3; i <= 3; i++) { g += P(roughLine(602 - 18, 210 + i * 5, 602 + 18, 210 + i * 5, 0.8, 3), 'stroke="#5a5a5a" stroke-width="1" fill="none"'); }
  g += P(roughRect(548, 70, 46, 64, 6, 1.2), 'fill="#7c7c7c" stroke="#3c3c3c" stroke-width="2.5"');
  g += P(roughLine(548, 92, 594, 92, 0.8, 3), 'stroke="#3c3c3c" stroke-width="1.5" fill="none"');
  g += P(roughLine(571, 70, 571, 134, 0.8, 3), 'stroke="#3c3c3c" stroke-width="1.5" fill="none"');
  g += P(roughLine(566, 128, 430, 402, 2.2, 8), 'stroke="#3a3a3a" stroke-width="15" fill="none" stroke-linecap="round"');
  g += P(roughLine(566, 128, 430, 402, 1.6, 8), 'stroke="#b9b9b9" stroke-width="8" fill="none" stroke-linecap="round"');
  g += `<g transform="rotate(63 430 402)">`;
  g += P(roughRect(414, 388, 40, 30, 4, 1), 'fill="#2b2b2b" stroke="#000" stroke-width="2"');
  g += P(roughRect(420, 416, 28, 16, 3, 1), 'fill="#dcdcdc" stroke="#444" stroke-width="1.5"');
  g += `</g>`;
  for (let i = 0; i < 7; i++) { g += P(roughRect(595, 250 + i * 26, 22, 13, 3, 0.9), 'fill="#141414"'); }
  g += P(roughLine(636, 246, 636, 432, 1.2, 6), 'stroke="#9a9a9a" stroke-width="3" fill="none"');
  g += P(roughRect(620, 326, 34, 26, 3, 1), 'fill="#1a1a1a" stroke="#000" stroke-width="1.5"');
  g += P(roughLine(620, 339, 654, 339, 0.6, 3), 'stroke="#cfcfcf" stroke-width="2" fill="none"');
  g += P(roughRect(50, 452, 72, 48, 6, 1.2), `fill="#121212" stroke="${TH.bodyStroke}" stroke-width="1.5"`);
  g += `<text x="62" y="473" fill="#e8e8e8" font-family="ui-sans-serif,sans-serif" font-size="13" font-weight="700">33</text>`;
  g += `<text x="86" y="492" fill="#e8e8e8" font-family="ui-sans-serif,sans-serif" font-size="13" font-weight="700">45</text>`;
  g += P(roughRect(132, 486, 30, 14, 4, 0.8), 'fill="#141414"');
  g += P(roughRect(170, 486, 30, 14, 4, 0.8), 'fill="#141414"');
  g += `<circle cx="225" cy="494" r="4.5" fill="#161616"/><circle cx="244" cy="494" r="4.5" fill="#161616"/>`;
  g += drawWord('M•S MUSIC', 530, 488, 0.30, -3, 4, TH.ink, 5.5);
  g += P(roughLine(452, 500, 612, 500, 0.8, 8), `stroke="${TH.ink}" stroke-width="2" fill="none"`);
  for (let i = 0; i < 11; i++) { g += P(roughLine(456 + i * 15, 500, 456 + i * 15, 494 - (i % 2 ? 0 : 5), 0.5, 2), `stroke="${TH.ink}" stroke-width="1.5" fill="none"`); }
  return g;
}

/* ── mixer ── */
function mixer(TH: Theme) {
  RND = mulberry32(41);
  let g = '';
  const colX = [70, 180, 290];
  const rowY = [100, 178, 252, 322];
  [40, 290].forEach(bx => {
    g += `<path d="M ${bx} 48 C ${bx - 6} 0 ${bx + 24} -36 ${bx + 10} -82" fill="none" stroke="#3aa6dd" stroke-width="10" stroke-linecap="round"/>`;
    g += `<path d="M ${bx + 26} 48 C ${bx + 20} 4 ${bx + 44} -30 ${bx + 30} -78" fill="none" stroke="#3aa6dd" stroke-width="10" stroke-linecap="round"/>`;
    g += P(roughRect(bx - 4, 30, 16, 20, 3, 0.8), 'fill="#f2f2f2"');
    g += P(roughRect(bx + 18, 30, 16, 20, 3, 0.8), 'fill="#c0271e"');
  });
  g += P(roughRect(150, 16, 18, 34, 4, 1), 'fill="#6a6a6a" stroke="#333" stroke-width="2"');
  g += P(roughRect(185, 16, 18, 34, 4, 1), 'fill="#6a6a6a" stroke="#333" stroke-width="2"');
  g += `<path d="M 159 18 C 150 -20 205 -20 196 18" fill="none" stroke="#111" stroke-width="9" stroke-linecap="round"/>`;
  g += `<path d="M 200 40 C 250 30 250 70 230 96 S 250 70 300 60" fill="none" stroke="#111" stroke-width="4"/>`;
  g += P(roughRect(0, 45, 360, 458, 8, 2), 'fill="#616661" stroke="#3a3d3a" stroke-width="4"');
  [[14, 72], [14, 470], [346, 72], [346, 470]].forEach((s: number[]) => {
    g += `<circle cx="${s[0]}" cy="${s[1]}" r="4" fill="#3a3d3a"/><circle cx="${s[0] - 1}" cy="${s[1] - 1}" r="1.6" fill="#cdd0cd"/>`;
  });
  function knob(x: number, y: number, r = 19) {
    let s = P(roughCircle(x, y, r, 1.4, 30), 'fill="#0b0b0b" stroke="#000" stroke-width="2"');
    const a = -2.1 + RND() * 1.2;
    s += `<line x1="${x}" y1="${y}" x2="${(x + Math.cos(a) * (r - 3)).toFixed(1)}" y2="${(y + Math.sin(a) * (r - 3)).toFixed(1)}" stroke="#f0f0f0" stroke-width="3" stroke-linecap="round"/>`;
    s += `<line x1="${x - r - 10}" y1="${y + 4}" x2="${x - r - 2}" y2="${y + 4}" stroke="#e8e8e8" stroke-width="2"/>`;
    s += `<line x1="${x - 4}" y1="${y - r - 9}" x2="${x + 6}" y2="${y - r - 9}" stroke="#e8e8e8" stroke-width="2.5"/>`;
    return s;
  }
  colX.forEach((cx, ci) => {
    rowY.forEach((cy, ri) => {
      if (ci === 1 && ri === 3) {
        g += knob(cx, cy, 17);
        for (let k = 0; k < 7; k++) {
          const a = (k / 7) * Math.PI * 2;
          g += `<circle cx="${(cx + Math.cos(a) * 26).toFixed(1)}" cy="${(cy + Math.sin(a) * 26).toFixed(1)}" r="${(2.6 + RND() * 1.6).toFixed(1)}" fill="#f0f0f0"/>`;
        }
      } else { g += knob(cx, cy, ri === 0 ? 16 : 19); }
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
  channel(96); channel(236);
  g += P(roughLine(150, 432, 216, 432, 1, 5), 'stroke="#eee" stroke-width="3" fill="none"');
  g += `<path d="M 176 432 Q 184 414 192 432" fill="none" stroke="#eee" stroke-width="3"/>`;
  g += knob(168, 432, 11);
  g += P(roughLine(120, 478, 250, 478, 1, 6), 'stroke="#111" stroke-width="3" fill="none"');
  g += P(roughRect(176, 468, 18, 22, 3, 0.8), 'fill="#f2f2f2" stroke="#111" stroke-width="2.5"');
  [110, 140, 210, 240].forEach(fx => { g += P(roughRect(fx, 503, 18, 14, 2, 0.8), 'fill="#1a1a1a"'); });
  return g;
}

/* ── build full SVG ── */
const TH: Theme = { bodyFill: '#e6e4df', bodyStroke: '#232323', ink: '#1a1a1a', shadow: '#d5d5d5', shadowOp: 0.7, bg: '#e6e4df' };

function shadowRect(gx: number, gy: number, w: number, h: number) {
  return P(roughRect(gx + 14, gy + 18, w, h, 20, 3), `fill="${TH.shadow}" opacity="${TH.shadowOp}" filter="url(#soft)"`);
}

function buildSVG() {
  return `<svg id="wax" viewBox="0 0 1920 737" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;display:block">
    <defs>
      <filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="7"/></filter>
    </defs>
    <rect x="0" y="0" width="1920" height="737" fill="${TH.bg}"/>
    ${shadowRect(57, 112, 658, 498)}
    ${shadowRect(782, 195, 360, 458)}
    ${shadowRect(1177, 112, 658, 498)}
    <g class="deck deck-left" transform="translate(55,100)">${turntable('L', TH)}</g>
    <g class="mixer" transform="translate(782,150)">${mixer(TH)}</g>
    <g class="deck deck-right" transform="translate(1175,100)">${turntable('R', TH)}</g>
  </svg>`;
}

/* ── component ── */
export default function ThemeSongPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [svgHtml, setSvgHtml] = useState('');

  useEffect(() => { setSvgHtml(buildSVG()); }, []);

  useEffect(() => {
    const audio = new Audio(THEME_SONG_URL);
    audio.loop = true; audio.preload = 'none';
    audioRef.current = audio;
    const onTime = () => { if (audio.duration) setProgress(audio.currentTime / audio.duration); };
    const onEnd  = () => setPlaying(false);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('ended', onEnd);
    return () => { audio.pause(); audio.removeEventListener('timeupdate', onTime); audio.removeEventListener('ended', onEnd); };
  }, []);

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) { audio.pause(); setPlaying(false); }
    else { audio.play().then(() => setPlaying(true)).catch(() => {}); }
  }

  return (
    <>
      {/* CSS 스핀 애니메이션 */}
      <style>{`
        .wax-player .spin{transform-box:fill-box;transform-origin:center;animation:msspin 2.0s linear infinite;will-change:transform}
        .wax-player .deck-right .spin{animation-delay:-1.0s}
        @keyframes msspin{to{transform:rotate(360deg)}}
        @media(prefers-reduced-motion:reduce){.wax-player .spin{animation:none}}
      `}</style>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, type: 'spring', stiffness: 260, damping: 22 }}
        className="wax-player mx-4 mb-4 max-w-2xl md:mx-auto rounded-[20px] border-[3px] border-[#0A0A0A] overflow-hidden"
        style={{ background: '#0A0A0A', boxShadow: '6px 6px 0 #FF3D77' }}
      >
        {/* 턴테이블 SVG */}
        <button
          onClick={toggle}
          aria-label={playing ? '일시정지' : '재생'}
          className="group relative w-full block focus:outline-none"
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          {svgHtml ? (
            <div dangerouslySetInnerHTML={{ __html: svgHtml }} />
          ) : (
            <div className="w-full bg-[#e6e4df] animate-pulse" style={{ aspectRatio: '1920/737' }} />
          )}

          {!playing && svgHtml && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/15 pointer-events-none">
              <div className="rounded-full border-[3px] border-white flex items-center justify-center"
                style={{ width: 52, height: 52, background: 'rgba(0,0,0,0.45)' }}>
                <div className="ml-1" style={{ width: 0, height: 0,
                  borderTop: '11px solid transparent', borderBottom: '11px solid transparent',
                  borderLeft: '20px solid white' }} />
              </div>
            </div>
          )}
          {playing && (
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <div className="flex gap-[5px]">
                <div className="w-[7px] h-[26px] bg-white rounded-[3px]" style={{ filter: 'drop-shadow(0 0 6px black)' }} />
                <div className="w-[7px] h-[26px] bg-white rounded-[3px]" style={{ filter: 'drop-shadow(0 0 6px black)' }} />
              </div>
            </div>
          )}
        </button>

        {/* 정보 바 */}
        <div className="flex items-center gap-3 px-5 py-3">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-[#FF3D77] font-bold tracking-widest" style={{ fontFamily: 'Bungee, sans-serif' }}>
              OFFICIAL THEME
            </p>
            <p className="text-white text-[13px] font-bold leading-tight" style={{ fontFamily: 'Bungee, sans-serif' }}>
              EIGHT BARS TO THE WORLD
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-[80px] h-[3px] bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-[#FF3D77] rounded-full transition-all duration-300" style={{ width: `${progress * 100}%` }} />
            </div>
            <span className={`text-[10px] font-bold ${playing ? 'text-[#FF3D77]' : 'text-white/30'}`}
              style={{ fontFamily: 'Bungee, sans-serif' }}>
              {playing ? '▶ ON AIR' : '■ READY'}
            </span>
          </div>
        </div>
      </motion.div>
    </>
  );
}
