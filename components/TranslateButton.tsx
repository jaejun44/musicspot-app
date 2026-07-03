'use client';

import { useT } from '@/lib/i18n';
import type { TranslatableState } from '@/hooks/useTranslatable';

/** 번역/원문 토글 버튼 (Instagram 스타일). canTranslate=false면 렌더 안 함. */
export default function TranslateButton({
  state,
  className,
}: {
  state: TranslatableState;
  className?: string;
}) {
  const t = useT();
  if (!state.canTranslate) return null;

  const label = state.translating
    ? t('번역 중...')
    : state.error
    ? t('번역 실패 · 다시 시도')
    : state.showTranslated
    ? t('원문 보기')
    : t('번역 보기');

  return (
    <button
      onClick={state.toggle}
      disabled={state.translating}
      className={
        className ??
        'self-start text-[11px] font-bold text-[#4FC3F7] hover:text-[#FF3D77] transition-colors disabled:opacity-50'
      }
      style={{ fontFamily: 'Pretendard, sans-serif' }}
    >
      {label}
    </button>
  );
}
