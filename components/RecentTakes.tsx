'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { track } from '@/lib/analytics';
import { useT } from '@/lib/i18n';

/**
 * 방금 올라온 8마디 — 홈(3개, [이어 치기]) · /jam 허브(5개, 백킹 잼 테이크만, [이 반주로 나도 치기]).
 * 받는 사람이 이어 칠 수 있는 열린 프로젝트(is_open)만, 프로젝트당 최신 트랙 1개, 최신순.
 * 0개면 섹션을 그리지 않는다(가짜 데이터 없음). 읽는 컬럼은 화면에 쓰는 것만(stem_* 공개 읽기 정책).
 */

type From = 'home' | 'jam';

interface TakeRow {
  id: string;
  project_id: string;
  user_name: string;
  user_emoji: string;
  instrument: string | null;
  file_url: string;
  created_at: string;
  stem_projects: { title: string; jam_slug: string | null } | null;
}

/** 한 프로젝트에 연달아 올라와도 목록이 한 프로젝트로 차지 않게 넉넉히 읽고 프로젝트당 1개로 줄인다 */
const SCAN = 30;

async function fetchRecentTakes(from: From, max: number): Promise<TakeRow[]> {
  let q = supabase
    .from('stem_tracks')
    .select('id, project_id, user_name, user_emoji, instrument, file_url, created_at, stem_projects!inner(title, jam_slug, is_open)')
    .eq('stem_projects.is_open', true)
    .not('file_url', 'is', null);
  if (from === 'jam') q = q.not('stem_projects.jam_slug', 'is', null);
  const { data, error } = await q.order('created_at', { ascending: false }).order('id').range(0, SCAN - 1);
  if (error) throw new Error(`[recent-takes] 조회 실패: ${error.message}`);
  const seen = new Set<string>();
  const out: TakeRow[] = [];
  for (const row of (data ?? []) as unknown as TakeRow[]) {
    if (seen.has(row.project_id) || !row.stem_projects) continue;
    seen.add(row.project_id);
    out.push(row);
    if (out.length >= max) break;
  }
  return out;
}

export default function RecentTakes({ from }: { from: From }) {
  const t = useT();
  const max = from === 'home' ? 3 : 5;
  const [rows, setRows] = useState<TakeRow[] | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let alive = true;
    fetchRecentTakes(from, max)
      .then((r) => {
        if (!alive) return;
        setRows(r);
        if (r.length > 0) track('recent_take_view', { from, count: r.length });
      })
      .catch((e) => {
        console.error(e);
        if (alive) setRows([]);
      });
    return () => {
      alive = false;
      audioRef.current?.pause();
    };
  }, [from, max]);

  if (!rows || rows.length === 0) return null;

  function togglePlay(row: TakeRow) {
    const prev = audioRef.current;
    if (playingId === row.id && prev) {
      prev.pause();
      setPlayingId(null);
      return;
    }
    prev?.pause();
    const audio = new Audio(row.file_url);
    audio.onended = () => setPlayingId((id) => (id === row.id ? null : id));
    audioRef.current = audio;
    setPlayingId(row.id);
    audio.play().catch((e) => {
      console.error('[recent-takes] 재생 실패', e);
      setPlayingId(null);
    });
    track('recent_take_click', { from, project_id: row.project_id, action: 'play' });
  }

  return (
    <section
      className="bg-white rounded-[20px] border-[3px] border-[#0A0A0A] p-5"
      style={{ boxShadow: '4px 4px 0 #0A0A0A', fontFamily: 'Pretendard, sans-serif' }}
      aria-label={t(from === 'home' ? '방금 올라온 8마디' : '최근 테이크')}
    >
      <h2 className="text-[16px] font-bold text-[#0A0A0A]">🎧 {t(from === 'home' ? '방금 올라온 8마디' : '최근 테이크')}</h2>
      <ul className="mt-3 space-y-2">
        {rows.map((r) => {
          const playing = playingId === r.id;
          const slug = r.stem_projects?.jam_slug;
          return (
            <li key={r.id} className="rounded-[14px] border-[2px] border-[#0A0A0A] bg-[#FFF8F0] p-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => togglePlay(r)}
                  aria-pressed={playing}
                  aria-label={playing ? t('정지') : t('재생')}
                  className={`shrink-0 w-11 h-11 rounded-full border-[2px] border-[#0A0A0A] text-[15px] font-bold ${playing ? 'bg-[#0A0A0A] text-white' : 'bg-[#F5FF4F] text-[#0A0A0A]'}`}
                >
                  {playing ? '■' : '▶'}
                </button>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-bold text-[#0A0A0A]">{r.stem_projects?.title}</p>
                  <p className="truncate text-[12px] text-[#0A0A0A]/60">
                    {r.user_emoji} {r.user_name}
                    {r.instrument ? ` · ${t(r.instrument)}` : ''}
                  </p>
                </div>
              </div>
              <div className="mt-2">
                {from === 'jam' && slug ? (
                  <Link
                    href={`/jam/${slug}`}
                    onClick={() => track('recent_take_click', { from, project_id: r.project_id, action: 'jam' })}
                    className="flex min-h-[44px] items-center justify-center rounded-[12px] border-[2px] border-[#0A0A0A] bg-white text-[13px] font-bold text-[#0A0A0A]"
                  >
                    {t('이 반주로 나도 치기')} →
                  </Link>
                ) : (
                  <Link
                    href={`/stems/${r.project_id}?take=jam`}
                    onClick={() => track('recent_take_click', { from, project_id: r.project_id, action: 'continue' })}
                    className="flex min-h-[44px] items-center justify-center rounded-[12px] border-[2px] border-[#0A0A0A] bg-[#FF3D77] text-[13px] font-bold text-white"
                  >
                    {t('이어 치기')} →
                  </Link>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
