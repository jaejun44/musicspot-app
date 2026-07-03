'use client';

import { useState } from 'react';
import { translateTexts } from '@/lib/translate';
import { useLocale } from '@/lib/i18n';
import { contentLang } from '@/lib/geo';

export interface TranslatableState {
  /** 뷰어 언어와 콘텐츠 언어가 달라 번역 버튼을 노출할지 */
  canTranslate: boolean;
  showTranslated: boolean;
  translating: boolean;
  error: boolean;
  toggle: () => void;
  /** i번째 텍스트를 (번역 상태에 따라) 반환 */
  text: (i: number) => string;
}

/**
 * 게시물/댓글 번역 토글 상태 훅. Instagram식 번역/원문 토글.
 * @param texts 번역 대상 텍스트(제목·본문 등, 순서 유지)
 * @param country / language 콘텐츠 국가·언어(번역 버튼 노출 판단용)
 */
export function useTranslatable(
  texts: string[],
  country?: string | null,
  language?: string | null
): TranslatableState {
  const locale = useLocale();
  const canTranslate = contentLang(country, language) !== locale;
  const [translated, setTranslated] = useState<string[] | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [error, setError] = useState(false);
  const showTranslated = !!translated && !showOriginal;

  async function toggle() {
    if (translated) {
      setShowOriginal((v) => !v);
      return;
    }
    setTranslating(true);
    setError(false);
    try {
      const out = await translateTexts(texts, locale);
      setTranslated(out);
      setShowOriginal(false);
    } catch {
      setError(true);
    } finally {
      setTranslating(false);
    }
  }

  const text = (i: number) => (showTranslated ? translated![i] ?? texts[i] : texts[i]);
  return { canTranslate, showTranslated, translating, error, toggle, text };
}
