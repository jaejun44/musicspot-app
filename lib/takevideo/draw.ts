/**
 * 테이크 공유 영상 한 장면(1080×1920)을 그리는 순수 함수 — 입력은 시각(초)·메타·미리 계산한 진폭, 출력은 캔버스 그리기뿐.
 * 녹화(render.ts)와 시안 PNG가 같은 함수를 쓴다. 색·테두리·그림자는 docs/DESIGN.md 토큰(크림 배경, 3~4px 검은 테두리 → 영상 배율로 6px,
 * 블러 없는 offset 그림자, 둥근 모서리). 영상 속 글자는 호출하는 쪽이 현재 언어로 번역해서 labels·meta로 넘긴다.
 * 넣는 정보: 프로젝트 제목, 참여자 표시 이름·악기, 키·스타일·BPM뿐(개인정보·곡명 없음).
 */
import { barAt, type Timeline } from './timeline';

export const VIDEO_W = 1080;
export const VIDEO_H = 1920;

const C = {
  pink: '#FF3D77',
  lime: '#F5FF4F',
  blue: '#4FC3F7',
  cream: '#FFF8F0',
  black: '#0A0A0A',
  white: '#FFFFFF',
} as const;

export const FONT_BODY = '"Pretendard Variable", Pretendard, "Noto Sans JP", sans-serif';
export const FONT_HEAD = 'Bungee, "Pretendard Variable", Pretendard, sans-serif';

export interface Participant {
  name: string;
  emoji: string;
  /** 번역된 악기 이름, 없으면 null */
  instrument: string | null;
}

export interface TakeVideoMeta {
  title: string;
  /** 예: "A minor · 블루스 · 92 BPM". 반주 없는 프로젝트는 null */
  infoLine: string | null;
  /** 마디별 코드 이름(8개). 반주 없는 프로젝트는 null → 마디 표시만 */
  chords: string[] | null;
  /** 섹션 1에 참여한 사람 전부(쌓기 포함) */
  people: Participant[];
  timeline: Timeline;
}

export interface TakeVideoLabels {
  challenge: string; // "8마디 챌린지"
  backing: string; // "반주"
  take: string; // "연주"
  next: string; // "다음"
  bar: string; // "마디"
  morePeople: (n: number) => string; // "외 2명"
  /** 반주 프로젝트 "이 반주로 나도 치기", 반주 없는 프로젝트 "이 8마디에 나도 이어 치기" */
  endTitle: string;
  /** 반주 프로젝트 musicspotfest.com/jam, 반주 없는 프로젝트 musicspotfest.com/stems — 본편·엔드 카드 같은 주소 */
  url: string;
}

/** 진폭 엔벨로프(0~1). rate개/초. 반주 없는 프로젝트는 backing null */
export interface Levels {
  rate: number;
  backing: Float32Array | null;
  take: Float32Array;
}

const WAVE_BARS = 36;
const SHADOW = 12;
const BORDER = 6;

function rr(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const k = Math.min(r, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + k, y);
  g.arcTo(x + w, y, x + w, y + h, k);
  g.arcTo(x + w, y + h, x, y + h, k);
  g.arcTo(x, y + h, x, y, k);
  g.arcTo(x, y, x + w, y, k);
  g.closePath();
}

/** 코믹 카드: offset 그림자 + 채움 + 검은 테두리 */
function card(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: string, shadow = SHADOW) {
  if (shadow > 0) {
    g.fillStyle = C.black;
    rr(g, x + shadow, y + shadow, w, h, r);
    g.fill();
  }
  g.fillStyle = fill;
  rr(g, x, y, w, h, r);
  g.fill();
  g.lineWidth = BORDER;
  g.strokeStyle = C.black;
  g.stroke();
}

function font(g: CanvasRenderingContext2D, weight: number, px: number, family = FONT_BODY) {
  g.font = `${weight} ${px}px ${family}`;
}

/** 띄어쓰기 단위로 줄바꿈하고, 한 단어가 한 줄보다 길면 글자 단위로 끊는다. maxLines를 넘으면 마지막 줄 말줄임 */
function wrap(g: CanvasRenderingContext2D, text: string, maxW: number, maxLines: number): string[] {
  const tokens: string[] = [];
  for (const word of text.trim().split(/\s+/)) {
    if (g.measureText(word).width <= maxW) tokens.push(word);
    else {
      let piece = '';
      for (const ch of Array.from(word)) {
        if (piece && g.measureText(piece + ch).width > maxW) {
          tokens.push(piece);
          piece = ch;
        } else piece += ch;
      }
      if (piece) tokens.push(piece);
    }
  }
  const lines: string[] = [];
  let cur = '';
  let i = 0;
  for (; i < tokens.length; i++) {
    const next = cur ? `${cur} ${tokens[i]}` : tokens[i];
    if (cur && g.measureText(next).width > maxW) {
      lines.push(cur);
      cur = tokens[i];
      if (lines.length === maxLines) break;
    } else cur = next;
  }
  const truncated = lines.length === maxLines;
  if (!truncated && cur) lines.push(cur);
  if (truncated) {
    let last = lines[maxLines - 1];
    while (last && g.measureText(last + '…').width > maxW) last = Array.from(last).slice(0, -1).join('');
    lines[maxLines - 1] = last + '…';
  }
  return lines;
}

/** 폭에 맞을 때까지 글자 크기를 줄인 크기 */
function fitPx(g: CanvasRenderingContext2D, text: string, weight: number, px: number, maxW: number, family = FONT_BODY): number {
  let p = px;
  font(g, weight, p, family);
  while (p > 20 && g.measureText(text).width > maxW) {
    p -= 4;
    font(g, weight, p, family);
  }
  return p;
}

function levelAt(arr: Float32Array | null, rate: number, t: number): number {
  if (!arr || t < 0) return 0;
  const i = Math.floor(t * rate);
  return i >= 0 && i < arr.length ? arr[i] : 0;
}

/**
 * 안전 영역(2026-11-17 사용자 결정): 릴스·쇼츠는 아래쪽에 계정·설명, 오른쪽에 버튼을 겹쳐 보여 준다.
 * 중요한 내용(워터마크·주소·연주자 이름)은 y ≤ SAFE_BOTTOM, x ≤ SAFE_RIGHT 안에만 둔다.
 */
export const SAFE_BOTTOM = 1540;
export const SAFE_RIGHT = VIDEO_W - 120;
const L = 72;
/** 카드 폭: 왼쪽 여백부터 오른쪽 안전선까지(그림자 포함) */
const CW = SAFE_RIGHT - L - SHADOW;

function drawHeader(g: CanvasRenderingContext2D, meta: TakeVideoMeta, labels: TakeVideoLabels) {
  const x = L, y = 64, w = CW, h = 372;
  card(g, x, y, w, h, 40, C.white);
  // 챌린지 칩
  font(g, 800, 32);
  const chipW = g.measureText(labels.challenge).width + 52;
  card(g, x + 44, y + 40, chipW, 60, 30, C.lime, 0);
  g.fillStyle = C.black;
  g.textBaseline = 'middle';
  g.fillText(labels.challenge, x + 70, y + 71);
  // 제목 2줄
  font(g, 900, 68);
  const lines = wrap(g, meta.title, w - 88, 2);
  g.textBaseline = 'alphabetic';
  lines.forEach((ln, i) => g.fillText(ln, x + 44, y + 182 + i * 82));
  if (meta.infoLine) {
    const px = fitPx(g, meta.infoLine, 600, 38, w - 88);
    font(g, 600, px);
    g.fillStyle = 'rgba(10,10,10,0.65)';
    g.fillText(meta.infoLine, x + 44, y + h - 40);
  }
}

function drawWave(g: CanvasRenderingContext2D, t: number, levels: Levels, labels: TakeVideoLabels) {
  const x = L, y = 468, w = CW, h = 300;
  card(g, x, y, w, h, 40, C.white);
  // 범례
  const items: [string, string][] = levels.backing ? [[labels.take, C.pink], [labels.backing, C.blue]] : [[labels.take, C.pink]];
  font(g, 700, 28);
  let lx = x + 40;
  g.textBaseline = 'middle';
  for (const [label, color] of items) {
    g.fillStyle = color;
    rr(g, lx, y + 32, 26, 26, 8);
    g.fill();
    g.lineWidth = 3;
    g.strokeStyle = C.black;
    g.stroke();
    g.fillStyle = C.black;
    g.fillText(label, lx + 38, y + 46);
    lx += 38 + g.measureText(label).width + 36;
  }
  // 막대: 가장 최근이 오른쪽. 위 = 연주(분홍), 아래 = 반주(파랑)
  const top = y + 80, bottom = y + h - 24, mid = (top + bottom) / 2;
  const half = (bottom - top) / 2 - 6;
  const gap = 8;
  const bw = (w - 80 - gap * (WAVE_BARS - 1)) / WAVE_BARS;
  const step = 1 / levels.rate;
  g.fillStyle = C.black;
  g.fillRect(x + 40, mid - 2, w - 80, 4);
  for (let i = 0; i < WAVE_BARS; i++) {
    const at = t - (WAVE_BARS - 1 - i) * step;
    const bx = x + 40 + i * (bw + gap);
    const fade = 0.35 + 0.65 * (i / (WAVE_BARS - 1));
    const tk = Math.max(0.04, levelAt(levels.take, levels.rate, at));
    g.globalAlpha = fade;
    g.fillStyle = C.pink;
    rr(g, bx, mid - 4 - tk * half, bw, tk * half, bw / 2);
    g.fill();
    if (levels.backing) {
      const bk = Math.max(0.04, levelAt(levels.backing, levels.rate, at));
      g.fillStyle = C.blue;
      rr(g, bx, mid + 4, bw, bk * half, bw / 2);
      g.fill();
    }
    g.globalAlpha = 1;
  }
}

function drawChords(g: CanvasRenderingContext2D, t: number, meta: TakeVideoMeta, labels: TakeVideoLabels) {
  const x = L, y = 800, w = CW, h = 380;
  card(g, x, y, w, h, 40, C.lime);
  const pos = barAt(t, meta.timeline) ?? { bar: 7, frac: 1 };
  g.fillStyle = C.black;
  g.textBaseline = 'alphabetic';
  if (meta.chords && meta.timeline.barsExact) {
    const cur = meta.chords[pos.bar] ?? '';
    const next = meta.chords[(pos.bar + 1) % meta.chords.length] ?? '';
    // 코드 이름은 Pretendard 900: Bungee는 대문자뿐이라 Dm7이 DM7(메이저 세븐)로 보인다
    const px = fitPx(g, cur, 900, 200, w - 360);
    font(g, 900, px);
    g.fillText(cur, x + 52, y + 222);
    // 다음 코드(작게). 지금과 같은 코드면 숨긴다
    if (next !== cur) {
      font(g, 700, 32);
      g.fillStyle = 'rgba(10,10,10,0.6)';
      g.textAlign = 'right';
      g.fillText(labels.next, x + w - 52, y + 112);
      g.fillStyle = C.black;
      const npx = fitPx(g, next, 900, 96, 260);
      font(g, 900, npx);
      g.fillText(next, x + w - 52, y + 214);
      g.textAlign = 'left';
    }
  } else {
    font(g, 400, 156, FONT_HEAD);
    g.fillText(`${pos.bar + 1}`, x + 52, y + 214);
    const nW = g.measureText(`${pos.bar + 1}`).width;
    font(g, 900, 56);
    g.fillText(`/ 8 ${labels.bar}`, x + 52 + nW + 22, y + 214);
  }
  // 마디 진행 8칸
  const cells = 8, cg = 12, cy = y + h - 108, ch = 60;
  const cw = (w - 104 - cg * (cells - 1)) / cells;
  for (let i = 0; i < cells; i++) {
    const cx = x + 52 + i * (cw + cg);
    g.fillStyle = i < pos.bar ? C.black : C.white;
    rr(g, cx, cy, cw, ch, 14);
    g.fill();
    if (i === pos.bar) {
      g.save();
      rr(g, cx, cy, cw, ch, 14);
      g.clip();
      g.fillStyle = C.pink;
      g.fillRect(cx, cy, cw * pos.frac, ch);
      g.restore();
    }
    rr(g, cx, cy, cw, ch, 14);
    g.lineWidth = 4;
    g.strokeStyle = C.black;
    g.stroke();
  }
}

/** 코드 카드 바로 아래: 워터마크 + 주소 (안전 영역 안) */
function drawBrand(g: CanvasRenderingContext2D, labels: TakeVideoLabels) {
  const y = 1282;
  g.textBaseline = 'alphabetic';
  font(g, 400, 64, FONT_HEAD);
  g.fillStyle = C.black;
  g.fillText('MUSIC SPOT', L + 5, y + 5);
  g.fillStyle = C.pink;
  g.fillText('MUSIC SPOT', L, y);
  const bw = g.measureText('MUSIC SPOT').width;
  const px = fitPx(g, labels.url, 800, 36, CW - bw - 28);
  font(g, 800, px);
  g.fillStyle = C.black;
  g.fillText(labels.url, L + bw + 28, y - 8);
}

/** 워터마크 아래, 안전선(SAFE_BOTTOM) 위에 참여자 */
function drawPeople(g: CanvasRenderingContext2D, meta: TakeVideoMeta, labels: TakeVideoLabels) {
  const shown = meta.people.slice(0, 3);
  const rest = meta.people.length - shown.length;
  g.fillStyle = C.black;
  g.textBaseline = 'alphabetic';
  const size = shown.length > 1 ? 40 : 48;
  let y = 1378;
  shown.forEach((p, i) => {
    const text = `${p.emoji} ${p.name}${p.instrument ? ` · ${p.instrument}` : ''}${i === shown.length - 1 && rest > 0 ? `  ${labels.morePeople(rest)}` : ''}`;
    const px = fitPx(g, text, 800, size, CW);
    font(g, 800, px);
    g.fillText(text, L, y);
    y += size + 14;
  });
}

function drawEndCard(g: CanvasRenderingContext2D, labels: TakeVideoLabels, alpha: number) {
  g.globalAlpha = alpha;
  g.fillStyle = C.pink;
  g.fillRect(0, 0, VIDEO_W, VIDEO_H);
  const x = L, y = 520, w = CW, h = 640;
  card(g, x, y, w, h, 48, C.white, 16);
  g.textBaseline = 'alphabetic';
  g.textAlign = 'center';
  const cx = x + w / 2;
  font(g, 400, 84, FONT_HEAD);
  g.fillStyle = C.black;
  g.fillText('MUSIC SPOT', cx + 6, y + 190 + 6);
  g.fillStyle = C.pink;
  g.fillText('MUSIC SPOT', cx, y + 190);
  g.fillStyle = C.black;
  font(g, 900, 76);
  const lines = wrap(g, labels.endTitle, w - 100, 2);
  const titleY = lines.length > 1 ? y + 320 : y + 350;
  lines.forEach((ln, i) => g.fillText(ln, cx, titleY + i * 90));
  // 주소 칩
  const px = fitPx(g, labels.url, 800, 44, w - 160);
  font(g, 800, px);
  const uw = g.measureText(labels.url).width + 80;
  card(g, cx - uw / 2, y + h - 170, uw, 96, 48, C.lime, 8);
  g.fillStyle = C.black;
  g.textBaseline = 'middle';
  g.fillText(labels.url, cx, y + h - 122);
  g.textAlign = 'left';
  g.textBaseline = 'alphabetic';
  g.globalAlpha = 1;
}

/** 엔드 카드로 넘어가는 시간(초) */
const END_FADE_IN = 0.25;

/** t초 장면을 그린다. 캔버스는 VIDEO_W×VIDEO_H */
export function drawFrame(g: CanvasRenderingContext2D, t: number, meta: TakeVideoMeta, levels: Levels, labels: TakeVideoLabels): void {
  const tl = meta.timeline;
  g.save();
  g.fillStyle = C.cream;
  g.fillRect(0, 0, VIDEO_W, VIDEO_H);
  drawHeader(g, meta, labels);
  drawWave(g, Math.min(t, tl.musicSec), levels, labels);
  drawChords(g, Math.min(t, tl.musicSec - 1e-6), meta, labels);
  drawBrand(g, labels);
  drawPeople(g, meta, labels);
  if (t >= tl.musicSec) drawEndCard(g, labels, Math.min(1, (t - tl.musicSec) / END_FADE_IN));
  g.restore();
}
