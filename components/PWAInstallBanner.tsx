'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISSED_KEY = 'ms_pwa_dismissed';

export default function PWAInstallBanner() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem(DISMISSED_KEY)) return;

    // 이미 설치된 경우 배너 숨김
    if (window.matchMedia('(display-mode: standalone)').matches) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  async function handleInstall() {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') {
      setVisible(false);
    }
    setPrompt(null);
  }

  function handleDismiss() {
    localStorage.setItem(DISMISSED_KEY, '1');
    setVisible(false);
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          className="fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto"
        >
          <div
            className="bg-white rounded-[20px] border-[3px] border-[#0A0A0A] px-4 py-4 flex items-center gap-3"
            style={{ boxShadow: '5px 5px 0 #0A0A0A' }}
          >
            {/* 아이콘 */}
            <div
              className="w-12 h-12 rounded-[12px] bg-[#FF3D77] border-[2px] border-[#0A0A0A] flex items-center justify-center flex-shrink-0"
              style={{ boxShadow: '2px 2px 0 #0A0A0A' }}
            >
              <span
                className="text-white font-black text-[14px]"
                style={{ fontFamily: 'Bungee, sans-serif', letterSpacing: -0.5 }}
              >
                MS
              </span>
            </div>

            {/* 텍스트 */}
            <div className="flex-1 min-w-0">
              <p
                className="text-[13px] font-bold text-[#0A0A0A] leading-tight"
                style={{ fontFamily: 'Pretendard, sans-serif' }}
              >
                홈 화면에 추가하기 🎸
              </p>
              <p
                className="text-[11px] text-[#0A0A0A]/50 font-bold mt-0.5"
                style={{ fontFamily: 'Pretendard, sans-serif' }}
              >
                앱처럼 빠르게 연습실을 찾아요
              </p>
            </div>

            {/* 설치 버튼 */}
            <motion.button
              onClick={handleInstall}
              whileTap={{ scale: 0.95, y: 1 }}
              className="flex-shrink-0 px-3 py-2 bg-[#FF3D77] rounded-[10px] border-[2px] border-[#0A0A0A] text-white font-bold text-[12px]"
              style={{ boxShadow: '2px 2px 0 #0A0A0A', fontFamily: 'Bungee, sans-serif' }}
            >
              추가
            </motion.button>

            {/* 닫기 */}
            <motion.button
              onClick={handleDismiss}
              whileTap={{ scale: 0.9 }}
              className="flex-shrink-0 w-7 h-7 rounded-[8px] border-[2px] border-[#0A0A0A] bg-[#FFF8F0] flex items-center justify-center"
              style={{ boxShadow: '1px 1px 0 #0A0A0A' }}
            >
              <X className="w-3.5 h-3.5" />
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
