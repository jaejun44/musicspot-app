'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';

const STORAGE_KEY = 'ms_welcomed';

const CARDS = [
  { icon: '📍', title: '내 주변 연습실', desc: '위치·가격·드럼으로 비교' },
  { icon: '🎵', title: '8마디 챌린지', desc: '릴레이로 음악 완성' },
  { icon: '🎸', title: '밴드 매칭', desc: '함께할 멤버 찾기' },
];

/**
 * 신규 방문자 1회성 환영 바텀시트.
 * localStorage 'ms_welcomed' 로 재노출 차단. (기존 OnboardingModal=밴드매칭 폼과 무관)
 */
export default function WelcomeSheet() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setOpen(true);
    } catch {
      // localStorage 차단 환경 → 노출 생략
    }
  }, []);

  function dismiss() {
    setOpen(false);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, '1');
      } catch {
        // 무시
      }
    }
  }

  function go(path: string) {
    dismiss();
    router.push(path);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] bg-[#0A0A0A]/50 flex items-end sm:items-center justify-center"
          onClick={dismiss}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md bg-comic-cream border-t-[3px] sm:border-[3px] border-comic-black rounded-t-[24px] sm:rounded-[24px] p-6 pb-8"
            style={{ boxShadow: '0 -4px 0 #0A0A0A' }}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-bungee text-comic-black">
                  WELCOME <span className="text-comic-pink">🎸</span>
                </h2>
                <p className="mt-1.5 text-sm font-bold text-comic-black/70 leading-relaxed">
                  음악인을 위한 연습실 찾기 +<br />
                  <span className="text-comic-pink">8마디</span>로 밴드 만들기
                </p>
              </div>
              <button onClick={dismiss} aria-label="닫기" className="p-1 -mr-1 -mt-1">
                <X className="w-5 h-5 text-comic-black/50" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2.5 mb-6">
              {CARDS.map((c) => (
                <div
                  key={c.title}
                  className="bg-white border-[2px] border-comic-black rounded-[14px] p-3 flex flex-col items-center text-center"
                  style={{ boxShadow: '3px 3px 0 #0A0A0A' }}
                >
                  <span className="text-[26px] mb-1.5">{c.icon}</span>
                  <p className="text-[12px] font-bold text-comic-black leading-tight">{c.title}</p>
                  <p className="text-[10px] font-bold text-comic-black/45 mt-1 leading-tight">{c.desc}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2.5">
              <button
                onClick={() => go('/search')}
                className="w-full py-3.5 bg-comic-pink text-white border-[3px] border-comic-black rounded-[14px] text-sm font-bold"
                style={{ boxShadow: '4px 4px 0 #0A0A0A', fontFamily: 'Pretendard, sans-serif' }}
              >
                📍 내 주변 연습실 보기
              </button>
              <button
                onClick={() => go('/stems')}
                className="w-full py-3 bg-white text-comic-black border-[3px] border-comic-black rounded-[14px] text-sm font-bold"
                style={{ boxShadow: '3px 3px 0 #0A0A0A', fontFamily: 'Pretendard, sans-serif' }}
              >
                🎵 8마디 구경하기
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
