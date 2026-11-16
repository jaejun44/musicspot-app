'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useT } from '@/lib/i18n';
import { CARD } from './ui';

interface TakeRow {
  id: string;
  title: string;
  creator_name: string;
  created_at: string;
}

/** 이 반주(조합)로 올라온 8마디 — 최신 5개 */
async function fetchTakes(slug: string): Promise<TakeRow[]> {
  const { data, error } = await supabase
    .from('stem_projects')
    .select('id, title, creator_name, created_at')
    .eq('jam_slug', slug)
    .order('created_at', { ascending: false })
    .order('id')
    .range(0, 4);
  if (error) throw error;
  return (data ?? []) as TakeRow[];
}

export default function JamTakesList({ slug }: { slug: string }) {
  const t = useT();
  const [rows, setRows] = useState<TakeRow[] | null>(null);

  useEffect(() => {
    let alive = true;
    fetchTakes(slug)
      .then((r) => alive && setRows(r))
      .catch((e) => {
        console.error('[jam] 이 반주로 올라온 테이크 조회 실패', e);
        if (alive) setRows([]);
      });
    return () => {
      alive = false;
    };
  }, [slug]);

  return (
    <section className={`${CARD} p-5`} style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>
      <h2 className="text-[15px] font-bold text-[#0A0A0A]">🎧 {t('이 반주로 올라온 테이크')}</h2>
      {rows === null ? (
        <p className="mt-2 text-[13px] text-[#0A0A0A]/50">…</p>
      ) : rows.length === 0 ? (
        <p className="mt-2 text-[13px] font-bold text-[#0A0A0A]/60">{t('첫 테이크를 남겨 보세요')}</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {rows.map((r) => (
            <li key={r.id}>
              <Link href={`/stems/${r.id}`} className="flex min-h-[44px] items-center justify-between gap-2 rounded-[12px] border-[2px] border-[#0A0A0A] bg-[#FFF8F0] px-3 text-[13px] font-bold">
                <span className="truncate">{r.creator_name}</span>
                <span className="shrink-0 text-[12px] text-[#0A0A0A]/60">{r.created_at.slice(5, 10).replace('-', '/')} →</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
