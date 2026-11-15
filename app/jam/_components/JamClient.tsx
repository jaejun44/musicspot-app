'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { track } from '@/lib/analytics';
import { useIsJapanMode, useT } from '@/lib/i18n';
import { isIOS } from '@/lib/ear/synth';
import { kstToday } from '@/lib/ear/daily';
import {
  STYLES,
  SCALES,
  chordLabel,
  comboSlug,
  lowEFret,
  parseSlug,
  progressionChords,
  scaleNotes,
  transposeSlug,
  type JamCombo,
} from '@/lib/jam/catalog';
import { dailyJam } from '@/lib/jam/daily';
import type { Part } from '@/lib/jam/engine';
import { useJamPlayer, type JamNotice } from './useJamPlayer';
import TakePanel from './TakePanel';
import JamTakesList from './JamTakesList';

import { CARD, FONT } from './ui';
export { CARD, FONT };
const SHADOW = { boxShadow: '4px 4px 0 #0A0A0A' };

const PARTS: { id: Part; label: string; icon: string }[] = [
  { id: 'drums', label: '드럼', icon: '🥁' },
  { id: 'bass', label: '베이스', icon: '🎸' },
  { id: 'chords', label: '코드', icon: '🎹' },
];

export function useKeyLabel() {
  const t = useT();
  return (combo: Pick<JamCombo, 'key'>) => `${combo.key.name} ${t(combo.key.mode === 'major' ? '메이저' : '마이너')}`;
}

export function NoticeText({ notice }: { notice: JamNotice }) {
  const t = useT();
  if (!notice) return null;
  const text = {
    underrun: '화면을 벗어난 사이 박자가 밀려 멈췄어요. 다시 재생해 주세요.',
    interrupted: '다른 앱·탭에 다녀온 사이 소리가 멈췄어요. 다시 재생해 주세요.',
    error: '소리를 켜지 못했어요. 다시 눌러 주세요.',
  }[notice];
  return (
    <p role="status" className="text-[13px] font-bold text-[#FF3D77] break-keep">
      {t(text)}
    </p>
  );
}

/** 지금 코드·다음 코드·8마디 칸 */
export function ChordDisplay({
  labels,
  loopBar,
  beat,
  countingIn,
}: {
  labels: string[];
  loopBar: number | null;
  beat: number | null;
  countingIn: boolean;
}) {
  const t = useT();
  const cur = loopBar != null && loopBar >= 0 ? labels[loopBar] : null;
  const next = labels[loopBar != null && loopBar >= 0 ? (loopBar + 1) % labels.length : 0];
  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12px] font-bold text-[#0A0A0A]/60">{countingIn ? t('카운트인') : t('지금 코드')}</p>
          <p className="font-bungee text-[44px] leading-none text-[#0A0A0A]" aria-live="polite">
            {countingIn ? '1·2·3·4' : cur ?? '—'}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[12px] font-bold text-[#0A0A0A]/60">{t('다음')}</p>
          <p className="font-bungee text-[22px] leading-none text-[#0A0A0A]/70">{next}</p>
        </div>
      </div>
      <div className="mt-3 flex gap-1" aria-hidden>
        {[0, 1, 2, 3].map((b) => (
          <span
            key={b}
            className={`h-2 flex-1 rounded-full border-[2px] border-[#0A0A0A] ${beat != null && Math.floor(beat) === b ? 'bg-[#F5FF4F]' : 'bg-white'}`}
          />
        ))}
      </div>
      <ol className="mt-3 grid grid-cols-4 gap-1.5">
        {labels.map((l, i) => (
          <li
            key={i}
            className={`min-h-[44px] flex flex-col items-center justify-center rounded-[10px] border-[2px] border-[#0A0A0A] text-[13px] font-bold ${
              loopBar === i ? 'bg-[#FF3D77] text-white' : 'bg-[#FFF8F0] text-[#0A0A0A]'
            }`}
          >
            <span className="text-[12px] opacity-70">{i + 1}</span>
            <span>{l}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default function JamClient({ slug }: { slug: string }) {
  const t = useT();
  const isJapanMode = useIsJapanMode();
  const keyLabel = useKeyLabel();
  const combo = parseSlug(slug) as JamCombo;
  const { key, style } = combo;
  // 진행 id는 저장되므로 인덱스는 전체 목록 기준. 화면 목록에는 숨긴 진행을 빼되, 지금 고른 것은 보인다
  const progs = style.progressions[key.mode];
  const [progIdx, setProgIdx] = useState(() => Math.max(0, progs.findIndex((p) => !p.hiddenForNewTakes)));
  const [isDaily, setIsDaily] = useState(false);
  const [ios, setIos] = useState(false);
  const prog = progs[progIdx];
  const chords = useMemo(() => progressionChords(key, prog), [key, prog]);
  const labels = chords.map((c) => chordLabel(c, key.flats));
  const spec = useMemo(() => ({ style: style.id, bpm: style.bpm, chords }), [style, chords]);
  const jam = useJamPlayer({ slug, spec, isDaily });

  // ?p=<진행 id>(오늘의 잼·음감 결과에서 옴) + 오늘의 잼인지 — 날짜·주소는 브라우저에서만 안다
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get('p');
    const idx = p ? progs.findIndex((x) => x.id === p) : -1;
    if (idx >= 0) setProgIdx(idx);
    const daily = dailyJam(kstToday(new Date()));
    setIsDaily(daily.slug === slug && (idx >= 0 ? progs[idx].id : progs[0].id) === daily.progression.id);
    setIos(isIOS());
    track('jam_view', { slug });
  }, [slug, progs]);

  // BPM 슬라이더는 손을 뗀 뒤 한 번만 기록
  const bpmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function changeBpm(v: number) {
    jam.setBpm(v);
    if (bpmTimer.current) clearTimeout(bpmTimer.current);
    bpmTimer.current = setTimeout(() => track('jam_control', { slug, type: 'bpm' }), 800);
  }

  const [min, max] = style.bpmRange;
  const fret = lowEFret(key.pc);
  const countingIn = jam.pos?.bar === -1;
  const otherStyles = STYLES.filter((s) => s.slug !== style.slug && s.modes.includes(key.mode));

  return (
    <main className="min-h-screen bg-comic-cream px-4 py-6 max-w-2xl mx-auto space-y-5 overflow-x-hidden" style={FONT}>
      <nav className="text-[13px] font-bold text-[#0A0A0A]/60">
        <Link href="/jam" className="underline underline-offset-4 inline-flex min-h-[44px] items-center">
          🎸 {t('백킹 잼')}
        </Link>
      </nav>

      <header>
        <h1 className="text-[26px] leading-tight text-[#0A0A0A] break-keep" style={{ fontWeight: 900 }}>
          {t('{key} {style} 백킹 트랙', { key: keyLabel(combo), style: t(style.label) })}
        </h1>
        <p className="mt-2 text-[14px] text-[#0A0A0A]/70 break-keep">{t(style.blurb)}</p>
      </header>

      {/* 플레이어 */}
      <section className={`${CARD} p-5 space-y-4`} style={{ boxShadow: '6px 6px 0 #0A0A0A' }}>
        <ChordDisplay labels={labels} loopBar={jam.pos?.loopBar ?? null} beat={jam.pos?.beat ?? null} countingIn={countingIn} />
        <button
          type="button"
          onClick={jam.playing ? jam.stop : jam.play}
          className="w-full min-h-[60px] rounded-[16px] border-[3px] border-[#0A0A0A] bg-[#FF3D77] text-white text-[20px] font-bold active:translate-x-[2px] active:translate-y-[2px]"
          style={SHADOW}
          aria-pressed={jam.playing}
        >
          {jam.playing ? `■ ${t('정지')}` : `▶ ${t('재생')}`}
        </button>
        <NoticeText notice={jam.notice} />
        {ios && <p className="text-[12px] font-bold text-[#0A0A0A]/60">{t('소리가 안 들리면 무음 모드와 볼륨을 확인하세요')}</p>}
      </section>

      {/* 조절 */}
      <section className={`${CARD} p-5 space-y-5`} style={SHADOW}>
        <div>
          <label htmlFor="jam-bpm" className="flex items-baseline justify-between text-[14px] font-bold text-[#0A0A0A]">
            <span>{t('템포')}</span>
            <span>
              <span className="font-bungee text-[20px]">{jam.bpm}</span> BPM
            </span>
          </label>
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => changeBpm(Math.max(min, jam.bpm - 2))}
              className="w-11 h-11 shrink-0 rounded-[12px] border-[3px] border-[#0A0A0A] bg-white text-[18px] font-bold"
              aria-label={t('템포 내리기')}
            >
              −
            </button>
            <input
              id="jam-bpm"
              type="range"
              min={min}
              max={max}
              value={jam.bpm}
              onChange={(e) => changeBpm(Number(e.target.value))}
              className="flex-1 min-w-0 h-11 accent-[#FF3D77]"
            />
            <button
              type="button"
              onClick={() => changeBpm(Math.min(max, jam.bpm + 2))}
              className="w-11 h-11 shrink-0 rounded-[12px] border-[3px] border-[#0A0A0A] bg-white text-[18px] font-bold"
              aria-label={t('템포 올리기')}
            >
              +
            </button>
          </div>
          <p className="mt-1 text-[12px] text-[#0A0A0A]/60">{t('바꾸면 다음 마디부터 반영돼요')}</p>
        </div>

        <div>
          <p className="text-[14px] font-bold text-[#0A0A0A]">{t('키')}</p>
          <div className="mt-2 flex items-center gap-2">
            <Link
              href={`/jam/${transposeSlug(combo, -1)}`}
              onClick={() => track('jam_control', { slug, type: 'key' })}
              className="min-w-[44px] h-11 px-3 shrink-0 inline-flex items-center justify-center rounded-[12px] border-[3px] border-[#0A0A0A] bg-white text-[14px] font-bold"
              aria-label={t('반음 내리기')}
            >
              ♭ −1
            </Link>
            <span className="flex-1 text-center text-[16px] font-bold text-[#0A0A0A]">{keyLabel(combo)}</span>
            <Link
              href={`/jam/${transposeSlug(combo, 1)}`}
              onClick={() => track('jam_control', { slug, type: 'key' })}
              className="min-w-[44px] h-11 px-3 shrink-0 inline-flex items-center justify-center rounded-[12px] border-[3px] border-[#0A0A0A] bg-white text-[14px] font-bold"
              aria-label={t('반음 올리기')}
            >
              # +1
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              jam.setCountIn(!jam.countIn);
              track('jam_control', { slug, type: 'countin' });
            }}
            aria-pressed={jam.countIn}
            className={`min-h-[44px] px-3 rounded-[12px] border-[3px] border-[#0A0A0A] text-[13px] font-bold ${jam.countIn ? 'bg-[#F5FF4F]' : 'bg-white text-[#0A0A0A]/60'}`}
          >
            ⏱ {t('카운트인 1마디')} {jam.countIn ? 'ON' : 'OFF'}
          </button>
          {PARTS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                jam.toggleMute(p.id);
                track('jam_control', { slug, type: 'mute' });
              }}
              aria-pressed={!jam.muted[p.id]}
              className={`min-h-[44px] px-3 rounded-[12px] border-[3px] border-[#0A0A0A] text-[13px] font-bold ${
                jam.muted[p.id] ? 'bg-white text-[#0A0A0A]/40 line-through' : 'bg-[#4FC3F7] text-[#0A0A0A]'
              }`}
            >
              {p.icon} {t(p.label)}
            </button>
          ))}
        </div>
      </section>

      {/* 녹음 → 8마디로 올리기 */}
      <TakePanel
        combo={combo}
        progression={prog}
        bpm={jam.bpm}
        muted={jam.muted}
        onBeforeRecord={() => jam.playing && jam.stop()}
        onRestoreProgression={(id) => {
          const i = progs.findIndex((p) => p.id === id);
          if (i >= 0) setProgIdx(i);
        }}
      />
      <JamTakesList slug={slug} />

      {/* 진행 */}
      <section className={`${CARD} p-5`} style={SHADOW}>
        <h2 className="text-[15px] font-bold text-[#0A0A0A]">{t('코드 진행')}</h2>
        <div className="mt-2 grid gap-2">
          {progs.map((p, i) => (p.hiddenForNewTakes && i !== progIdx ? null : (
            <button
              key={p.id}
              type="button"
              onClick={() => setProgIdx(i)}
              aria-pressed={i === progIdx}
              className={`min-h-[44px] px-3 py-2 text-left rounded-[12px] border-[2px] border-[#0A0A0A] text-[13px] font-bold break-keep ${
                i === progIdx ? 'bg-[#F5FF4F]' : 'bg-white'
              }`}
            >
              <span className="block">{progressionChords(key, p).slice(0, 4).map((c) => chordLabel(c, key.flats)).join(' – ')}</span>
              <span className="block text-[12px] text-[#0A0A0A]/60">{p.label}</span>
            </button>
          )))}
        </div>
      </section>

      {/* 스케일 */}
      <section className={`${CARD} p-5`} style={SHADOW}>
        <h2 className="text-[15px] font-bold text-[#0A0A0A]">{t('이 키에서 쓸 스케일')}</h2>
        <ul className="mt-2 space-y-2">
          {prog.scales.map((s) => (
            <li key={s} className="text-[14px] text-[#0A0A0A] break-keep">
              <span className="font-bold">
                {key.name} {t(SCALES[s].label)}
              </span>{' '}
              — <span className="font-bungee tracking-wide">{scaleNotes(key, s).join(' ')}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[13px] text-[#0A0A0A]/70 break-keep">
          {fret === 0
            ? t('기타라면 6번 줄 개방현(또는 12프렛) {root}에서 시작하면 돼요.', { root: key.name })
            : t('기타라면 6번 줄 {fret}프렛 {root}에서 시작하면 돼요.', { fret, root: key.name })}
        </p>
      </section>

      {/* 같은 키 다른 스타일 */}
      <section>
        <h2 className="text-[15px] font-bold text-[#0A0A0A]">{t('{key}로 다른 스타일', { key: keyLabel(combo) })}</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {otherStyles.map((s) => (
            <Link
              key={s.slug}
              href={`/jam/${comboSlug(key.pc, key.mode, s.slug)}`}
              className="min-h-[44px] px-3 inline-flex items-center rounded-[12px] border-[2px] border-[#0A0A0A] bg-white text-[13px] font-bold"
            >
              {t(s.label)}
            </Link>
          ))}
        </div>
      </section>

      {/* 입구 */}
      <section className="grid gap-3">
        <Link href="/ear" className={`${CARD} block px-5 py-4 text-[15px] font-bold text-[#0A0A0A]`} style={SHADOW}>
          🎧 {t('오늘의 음감')} →
        </Link>
        {!isJapanMode && (
          <Link href="/search" className={`${CARD} block px-5 py-4 text-[15px] font-bold text-[#0A0A0A]`} style={SHADOW}>
            📍 {t('합주할 곳 찾기')} →
          </Link>
        )}
        <Link href="/band-matching" className={`${CARD} block px-5 py-4 text-[15px] font-bold text-[#0A0A0A]`} style={SHADOW}>
          🤝 {t('같이 칠 사람 찾기')} →
        </Link>
      </section>
    </main>
  );
}
