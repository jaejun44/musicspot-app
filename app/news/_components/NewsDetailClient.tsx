'use client';

import { Fragment, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { track } from '@/lib/analytics';
import { useT, useIsJapanMode } from '@/lib/i18n';
import { formatNewsDate, newsImageUrl, type NewsPost, type NewsSummary } from '@/lib/news';
import NewsCard from '@/components/NewsCard';

const FONT = { fontFamily: 'Pretendard, sans-serif' };
const CARD = 'bg-white rounded-[20px] border-[3px] border-[#0A0A0A]';
const URL_SPLIT = /(https?:\/\/[^\s<>"')\]]+)/g;
const IS_URL = /^https?:\/\//;

type Outbound = 'instagram' | 'source' | 'search' | 'ear' | 'stems';

interface Props {
  post: NewsPost;
  older: NewsSummary | null;
  newer: NewsSummary | null;
  latest: NewsSummary[];
}

export default function NewsDetailClient({ post, older, newer, latest }: Props) {
  const t = useT();
  const isJapanMode = useIsJapanMode();
  const out = (to: Outbound) => () => track('news_outbound_click', { slug: post.slug, to });
  const viewed = useRef<string | null>(null);

  // 글마다 1회(이전·다음 글로 옮기면 새 글로 다시 1회)
  useEffect(() => {
    if (viewed.current === post.slug) return;
    viewed.current = post.slug;
    track('news_view', { slug: post.slug });
  }, [post.slug]);

  /** 캡션 원문 그대로 + 안의 URL만 링크로 */
  function linkify(text: string) {
    return text.split(URL_SPLIT).map((part, i) =>
      IS_URL.test(part) ? (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer nofollow"
          onClick={out('source')}
          className="text-[#FF3D77] underline underline-offset-2 break-all"
        >
          {part}
        </a>
      ) : (
        <Fragment key={i}>{part}</Fragment>
      ),
    );
  }

  const links = post.sources.filter((s) => s.url);
  const texts = post.sources.filter((s) => s.text);

  return (
    <main className="min-h-screen bg-[#FFF8F0] px-4 sm:px-6 py-6" style={FONT}>
      <article className="max-w-2xl mx-auto">
        <nav className="text-[12px] font-bold text-[#0A0A0A]/50 mb-3">
          <Link href="/news" className="hover:text-[#FF3D77]">
            {t('밴드씬 뉴스')}
          </Link>
          <span className="mx-1.5">/</span>
          <span>{formatNewsDate(post.published_on)}</span>
        </nav>

        <h1 className="text-[22px] sm:text-[28px] text-[#0A0A0A] leading-snug break-keep" style={{ fontWeight: 900 }}>
          {post.title}
        </h1>
        <p className="mt-2 text-[13px] font-bold text-[#0A0A0A]/50">
          <time dateTime={post.published_on}>{formatNewsDate(post.published_on)}</time> · {t('카드 {n}장', { n: post.image_count })}
        </p>

        {/* 카드 이미지 전체를 세로로 */}
        <div className="mt-5 flex flex-col gap-4">
          {post.images.map((path, i) => (
            <div key={path} className={`${CARD} overflow-hidden`} style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>
              <Image
                src={newsImageUrl(path)}
                alt={t('{title} — 카드 {i}/{n}', { title: post.title, i: i + 1, n: post.images.length })}
                width={1080}
                height={1350}
                sizes="(max-width: 672px) 100vw, 672px"
                priority={i === 0}
                className="w-full h-auto"
              />
            </div>
          ))}
        </div>

        {post.body && (
          <section className={`${CARD} mt-6 p-5`} style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>
            <p className="text-[15px] text-[#0A0A0A] leading-relaxed whitespace-pre-line break-words">{linkify(post.body)}</p>
          </section>
        )}

        {/* 사진 저작자 표기 — 항상 펼쳐서 보인다(접지 않음). 문구는 캡션 원문 그대로 */}
        <section className="mt-4 rounded-[16px] border-[2px] border-[#0A0A0A] bg-white px-4 py-3">
          <h2 className="text-[13px] font-bold text-[#0A0A0A]">📸 {t('이미지 저작자 표기')}</h2>
          <p className="mt-1 text-[13px] text-[#0A0A0A]/80 leading-relaxed whitespace-pre-line break-words">{linkify(post.photo_credit)}</p>
        </section>

        {(texts.length > 0 || links.length > 0) && (
          <section className="mt-4 rounded-[16px] border-[2px] border-[#0A0A0A] bg-white px-4 py-3">
            <h2 className="text-[13px] font-bold text-[#0A0A0A]">🔗 {t('출처')}</h2>
            {texts.map((s) => (
              <p key={s.text} className="mt-1 text-[13px] text-[#0A0A0A]/80 leading-relaxed break-words">
                {s.text}
              </p>
            ))}
            {links.length > 0 && (
              <ul className="mt-1">
                {links.map((s) => (
                  <li key={s.url}>
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      onClick={out('source')}
                      title={s.url}
                      className="inline-flex items-center min-h-[44px] text-[13px] font-bold text-[#FF3D77] underline underline-offset-2 break-all"
                    >
                      {s.label ?? s.url} ↗
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        <a
          href={post.instagram_url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={out('instagram')}
          className={`${CARD} mt-6 flex items-center justify-center min-h-[52px] px-5 text-[15px] font-bold text-[#0A0A0A]`}
          style={{ boxShadow: '4px 4px 0 #0A0A0A' }}
        >
          📷 {t('인스타그램에서 보기')} ↗
        </a>

        {/* 이전 글(더 오래된) · 다음 글(더 최신) */}
        {(older || newer) && (
          <nav className="mt-6 grid grid-cols-2 gap-3">
            {older ? (
              <Link href={`/news/${older.slug}`} className={`${CARD} block p-3 min-h-[44px]`} style={{ boxShadow: '3px 3px 0 #0A0A0A' }}>
                <span className="block text-[12px] font-bold text-[#0A0A0A]/50">← {t('이전 글')}</span>
                <span className="mt-1 block text-[13px] font-bold text-[#0A0A0A] line-clamp-2 break-keep">{older.title}</span>
              </Link>
            ) : (
              <span />
            )}
            {newer ? (
              <Link href={`/news/${newer.slug}`} className={`${CARD} block p-3 min-h-[44px] text-right`} style={{ boxShadow: '3px 3px 0 #0A0A0A' }}>
                <span className="block text-[12px] font-bold text-[#0A0A0A]/50">{t('다음 글')} →</span>
                <span className="mt-1 block text-[13px] font-bold text-[#0A0A0A] line-clamp-2 break-keep">{newer.title}</span>
              </Link>
            ) : (
              <span />
            )}
          </nav>
        )}

        {latest.length > 0 && (
          <section className="mt-10">
            <h2 className="text-[18px] text-[#0A0A0A] mb-3" style={{ fontWeight: 900 }}>
              {t('최신 뉴스')}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {latest.map((p) => (
                <NewsCard key={p.slug} post={p} />
              ))}
            </div>
          </section>
        )}

        {/* 하단 입구 3개 — 연습실 찾기는 ja에서 숨김(/search 차단 경로) */}
        <section className="mt-10 grid gap-3">
          {!isJapanMode && (
            <Link
              href="/search"
              onClick={out('search')}
              className={`${CARD} block px-5 py-4 text-[15px] font-bold text-[#0A0A0A]`}
              style={{ boxShadow: '4px 4px 0 #0A0A0A' }}
            >
              📍 {t('합주할 곳 찾기')} →
            </Link>
          )}
          <Link
            href="/ear"
            onClick={out('ear')}
            className={`${CARD} block px-5 py-4 text-[15px] font-bold text-[#0A0A0A]`}
            style={{ boxShadow: '4px 4px 0 #0A0A0A' }}
          >
            🎧 {t('오늘의 음감')} →
          </Link>
          <Link
            href="/stems"
            onClick={out('stems')}
            className={`${CARD} block px-5 py-4 text-[15px] font-bold text-[#0A0A0A]`}
            style={{ boxShadow: '4px 4px 0 #0A0A0A' }}
          >
            🎸 {t('8마디 올리기')} →
          </Link>
        </section>
      </article>
    </main>
  );
}
