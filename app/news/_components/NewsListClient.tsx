'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { track } from '@/lib/analytics';
import { useT } from '@/lib/i18n';
import { fetchNewsPage, NEWS_PAGE_SIZE, type NewsSummary } from '@/lib/news';
import NewsCard from '@/components/NewsCard';

const FONT = { fontFamily: 'Pretendard, sans-serif' };

/** /news 목록: 서버가 준 첫 12개 + [더보기]로 12개씩 */
export default function NewsListClient({ initial }: { initial: NewsSummary[] }) {
  const t = useT();
  const [posts, setPosts] = useState(initial);
  const [hasMore, setHasMore] = useState(initial.length === NEWS_PAGE_SIZE);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const page = useRef(1);
  const viewed = useRef(false);

  // 첫 로드 1회(개발 모드 effect 두 번 실행에도 한 번만)
  useEffect(() => {
    if (viewed.current) return;
    viewed.current = true;
    track('news_list_view', { count: initial.length });
  }, [initial.length]);

  async function loadMore() {
    setLoading(true);
    setFailed(false);
    try {
      const rows = await fetchNewsPage(page.current);
      page.current += 1;
      setPosts((prev) => {
        const seen = new Set(prev.map((p) => p.slug));
        return [...prev, ...rows.filter((r) => !seen.has(r.slug))];
      });
      setHasMore(rows.length === NEWS_PAGE_SIZE);
    } catch (e) {
      console.error('[news] 더보기 실패', e);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#FFF8F0] px-4 sm:px-6 py-6 max-w-5xl mx-auto" style={FONT}>
      <header className="mb-6">
        <h1 className="text-[26px] sm:text-[32px] text-[#0A0A0A] break-keep" style={{ fontWeight: 900 }}>
          📰 {t('밴드씬 뉴스')}
        </h1>
        <p className="mt-2 text-[14px] text-[#0A0A0A]/60 leading-relaxed break-keep">
          {t('새 앨범·투어·페스티벌 소식을 매일 카드뉴스로 모았어요.')}
        </p>
      </header>

      {posts.length === 0 ? (
        <p className="py-16 text-center text-[14px] font-bold text-[#0A0A0A]/50">{t('아직 올라온 뉴스가 없어요.')}</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {posts.map((p) => (
            <NewsCard key={p.slug} post={p} />
          ))}
        </div>
      )}

      {hasMore && (
        <div className="mt-8 flex flex-col items-center gap-2">
          <motion.button
            type="button"
            onClick={loadMore}
            disabled={loading}
            whileTap={{ scale: 0.95, x: 2, y: 2 }}
            className="min-h-[48px] px-8 rounded-[16px] border-[3px] border-[#0A0A0A] bg-white text-[15px] font-bold text-[#0A0A0A] disabled:opacity-60"
            style={{ boxShadow: '4px 4px 0 #0A0A0A' }}
          >
            {loading ? t('불러오는 중…') : t('더보기')}
          </motion.button>
          {failed && <p className="text-[13px] font-bold text-[#FF3D77]">{t('불러오지 못했어요. 다시 눌러 주세요.')}</p>}
        </div>
      )}
    </main>
  );
}
