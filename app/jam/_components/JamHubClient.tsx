'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { track } from '@/lib/analytics';
import { useT } from '@/lib/i18n';
import { kstToday } from '@/lib/ear/daily';
import { COMBOS, KEYS, STYLES, chordLabel, comboSlug, progressionChords, type Mode, type StyleSlug } from '@/lib/jam/catalog';
import { dailyJam, type DailyJam } from '@/lib/jam/daily';
import { CARD, ChordDisplay, FONT, NoticeText, useKeyLabel } from './JamClient';
import { useJamPlayer } from './useJamPlayer';
import RecentTakes from '@/components/RecentTakes';

const SHADOW = { boxShadow: '4px 4px 0 #0A0A0A' };

function TodayCard({ daily }: { daily: DailyJam }) {
  const t = useT();
  const keyLabel = useKeyLabel();
  const chords = useMemo(() => progressionChords(daily.key, daily.progression), [daily]);
  const spec = useMemo(() => ({ style: daily.style.id, bpm: daily.bpm, chords }), [daily, chords]);
  const jam = useJamPlayer({ slug: daily.slug, spec, isDaily: true });
  const labels = chords.map((c) => chordLabel(c, daily.key.flats));

  return (
    <section className={`${CARD} p-5 space-y-4`} style={{ boxShadow: '6px 6px 0 #0A0A0A' }}>
      <div>
        <p className="inline-block px-3 py-1 rounded-full border-[2px] border-[#0A0A0A] bg-[#F5FF4F] text-[13px] font-bold">
          🎸 {t('오늘의 잼')} · {daily.date.slice(5).replace('-', '/')}
        </p>
        <h2 className="mt-2 text-[22px] text-[#0A0A0A] break-keep" style={{ fontWeight: 900 }}>
          {keyLabel(daily)} {t(daily.style.label)} · {daily.bpm} BPM
        </h2>
        <p className="text-[13px] text-[#0A0A0A]/60">
          {daily.progression.label} · {t('오늘의 음감 5번 진행')}
        </p>
      </div>
      <ChordDisplay labels={labels} loopBar={jam.pos?.loopBar ?? null} beat={jam.pos?.beat ?? null} countingIn={jam.pos?.bar === -1} />
      <div className="flex flex-col sm:flex-row gap-2">
        <button
          type="button"
          onClick={jam.playing ? jam.stop : jam.play}
          className="flex-1 min-h-[56px] rounded-[16px] border-[3px] border-[#0A0A0A] bg-[#FF3D77] text-white text-[18px] font-bold"
          style={SHADOW}
          aria-pressed={jam.playing}
        >
          {jam.playing ? `■ ${t('정지')}` : `▶ ${t('재생')}`}
        </button>
        <Link
          href={`/jam/${daily.slug}?p=${encodeURIComponent(daily.progression.id)}`}
          onClick={() => track('jam_entry_click', { from: 'hub' })}
          className="flex-1 min-h-[56px] inline-flex items-center justify-center rounded-[16px] border-[3px] border-[#0A0A0A] bg-white text-[15px] font-bold"
          style={SHADOW}
        >
          {t('템포·키 바꿔서 치기')} →
        </Link>
      </div>
      <NoticeText notice={jam.notice} />
    </section>
  );
}

export default function JamHubClient() {
  const t = useT();
  const [daily, setDaily] = useState<DailyJam | null>(null);
  const [mode, setMode] = useState<Mode>('minor');
  const [pc, setPc] = useState(9); // A
  const [style, setStyle] = useState<StyleSlug>('blues');

  // 날짜는 브라우저에서만(정적 HTML에 빌드한 날이 박히지 않게)
  useEffect(() => setDaily(dailyJam(kstToday(new Date()))), []);

  const styleDef = STYLES.find((s) => s.slug === style)!;
  const target = comboSlug(pc, mode, style);

  function pickStyle(s: StyleSlug) {
    setStyle(s);
    const def = STYLES.find((x) => x.slug === s)!;
    if (!def.modes.includes(mode)) setMode(def.modes[0]); // 메탈은 단조만
  }

  return (
    <main className="min-h-screen bg-comic-cream px-4 py-6 max-w-2xl mx-auto space-y-6 overflow-x-hidden" style={FONT}>
      <header>
        <h1 className="text-[28px] text-[#0A0A0A]" style={{ fontWeight: 900 }}>
          🎸 {t('백킹 잼')}
        </h1>
        <p className="mt-1 text-[14px] text-[#0A0A0A]/70 break-keep">
          {t('키와 스타일을 고르면 드럼·베이스·코드가 바로 깔려요. 혼자서도 밴드처럼 연습해 보세요.')}
        </p>
      </header>

      {daily ? <TodayCard daily={daily} /> : <div className={`${CARD} h-[320px]`} style={SHADOW} aria-hidden />}

      {/* 백킹 잼으로 올라온 최근 테이크 5개 — 0개면 안 보임 */}
      <RecentTakes from="jam" />

      <section className={`${CARD} p-5 space-y-4`} style={SHADOW}>
        <h2 className="text-[16px] font-bold text-[#0A0A0A]">{t('직접 고르기')}</h2>
        <div>
          <p className="text-[13px] font-bold text-[#0A0A0A]/70">{t('스타일')}</p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {STYLES.map((s) => (
              <button
                key={s.slug}
                type="button"
                onClick={() => pickStyle(s.slug)}
                aria-pressed={style === s.slug}
                className={`min-h-[44px] px-2 rounded-[12px] border-[2px] border-[#0A0A0A] text-[13px] font-bold break-keep ${style === s.slug ? 'bg-[#F5FF4F]' : 'bg-white'}`}
              >
                {t(s.label)}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-[13px] font-bold text-[#0A0A0A]/70">{t('조성')}</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {(['major', 'minor'] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                disabled={!styleDef.modes.includes(m)}
                onClick={() => setMode(m)}
                aria-pressed={mode === m}
                className={`min-h-[44px] rounded-[12px] border-[2px] border-[#0A0A0A] text-[13px] font-bold disabled:opacity-30 ${mode === m ? 'bg-[#F5FF4F]' : 'bg-white'}`}
              >
                {t(m === 'major' ? '메이저' : '마이너')}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-[13px] font-bold text-[#0A0A0A]/70">{t('키')}</p>
          <div className="mt-2 grid grid-cols-6 gap-1.5">
            {KEYS.filter((k) => k.mode === mode).map((k) => (
              <button
                key={k.slug}
                type="button"
                onClick={() => setPc(k.pc)}
                aria-pressed={pc === k.pc}
                className={`min-h-[44px] rounded-[10px] border-[2px] border-[#0A0A0A] text-[13px] font-bold ${pc === k.pc ? 'bg-[#0A0A0A] text-white' : 'bg-white'}`}
              >
                {k.name}
              </button>
            ))}
          </div>
        </div>
        {target && (
          <Link
            href={`/jam/${target}`}
            onClick={() => track('jam_entry_click', { from: 'hub' })}
            className="flex min-h-[56px] items-center justify-center rounded-[16px] border-[3px] border-[#0A0A0A] bg-[#FF3D77] text-white text-[16px] font-bold"
            style={SHADOW}
          >
            {t('이 조합으로 연주하기')} →
          </Link>
        )}
      </section>

      {/* 모든 조합(검색 엔진·바로가기용) */}
      <section className="space-y-4">
        <h2 className="text-[16px] font-bold text-[#0A0A0A]">{t('모든 조합')}</h2>
        {STYLES.map((s) => (
          <div key={s.slug}>
            <h3 className="text-[14px] font-bold text-[#0A0A0A]">{t(s.label)}</h3>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {COMBOS.filter((c) => c.style.slug === s.slug).map((c) => (
                <Link
                  key={c.slug}
                  href={`/jam/${c.slug}`}
                  className="min-h-[44px] px-2.5 inline-flex items-center rounded-[10px] border-[2px] border-[#0A0A0A] bg-white text-[12px] font-bold"
                >
                  {c.key.name}
                  {c.key.mode === 'minor' ? 'm' : ''}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
