'use client';

import { useLocale, setLocaleAndReload, type Locale } from '@/lib/i18n';

const OPTIONS: { value: Locale; label: string }[] = [
  { value: 'ko', label: 'KO' },
  { value: 'ja', label: 'JA' },
];

/** KO/JA 언어 전환 토글 (쿠키 저장 → 새로고침) */
export default function LocaleToggle({ className = '' }: { className?: string }) {
  const locale = useLocale();

  return (
    <div
      className={`flex items-center border-[2px] border-[#0A0A0A] rounded-[10px] overflow-hidden bg-white ${className}`}
      style={{ boxShadow: '2px 2px 0 #0A0A0A' }}
      role="group"
      aria-label="Language"
    >
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          disabled={locale === opt.value}
          onClick={() => setLocaleAndReload(opt.value)}
          className={`px-2.5 py-1.5 text-[11px] font-bold transition-colors ${
            locale === opt.value
              ? 'bg-[#0A0A0A] text-white cursor-default'
              : 'text-[#0A0A0A]/60 hover:bg-[#F5FF4F]'
          }`}
          style={{ fontFamily: 'Bungee, sans-serif' }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
