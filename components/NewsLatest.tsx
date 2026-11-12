'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { track } from '@/lib/analytics';
import { useT } from '@/lib/i18n';
import { fetchNewsPage, type NewsSummary } from '@/lib/news';
import NewsCard from '@/components/NewsCard';

type From = 'home' | 'region';

/**
 * "오늘의 밴드 뉴스" 최신 2개. 홈(히어로 아래)·지역 페이지(연습실 목록 아래)의 재방문 입구.
 * posts를 주면(서버에서 미리 조회) 그대로, 없으면 클라이언트에서 조회한다. 글이 없으면 아무것도 안 그린다
 */
export default function NewsLatest({ from, posts: initial, className = '' }: { from: From; posts?: NewsSummary[]; className?: string }) {
  const t = useT();
  const [posts, setPosts] = useState<NewsSummary[] | null>(initial ?? null);

  useEffect(() => {
    if (initial) return;
    let alive = true;
    fetchNewsPage(0, 2)
      .then((rows) => alive && setPosts(rows))
      .catch((e) => {
        console.error('[NewsLatest] 최신 뉴스 조회 실패', e);
        if (alive) setPosts([]);
      });
    return () => {
      alive = false;
    };
  }, [initial]);

  if (!posts || posts.length === 0) return null;
  const onClick = () => track('news_entry_click', { from });

  return (
    <section className={`max-w-full ${className}`} style={{ fontFamily: 'Pretendard, sans-serif' }}>
      <div className="flex items-end justify-between gap-3 mb-3">
        <h2 className="text-[18px] text-[#0A0A0A] break-keep" style={{ fontWeight: 900 }}>
          📰 {t('오늘의 밴드 뉴스')}
        </h2>
        <Link
          href="/news"
          onClick={onClick}
          className="shrink-0 min-h-[44px] inline-flex items-center text-[14px] font-bold text-[#0A0A0A]/70 underline underline-offset-4"
        >
          {t('전체 보기')} →
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 max-w-2xl">
        {posts.slice(0, 2).map((p) => (
          <NewsCard key={p.slug} post={p} onClick={onClick} />
        ))}
      </div>
    </section>
  );
}
