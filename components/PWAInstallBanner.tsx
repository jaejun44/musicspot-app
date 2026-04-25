'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Share } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISSED_KEY = 'ms_pwa_dismissed';

function isIOSSafari() {
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isWebkit = /WebKit/.test(ua);
  const isChrome = /CriOS/.test(ua);
  const isFirefox = /FxiOS/.test(ua);
  return isIOS && isWebkit && !isChrome && !isFirefox;
}

export default function PWAInstallBanner() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [mode, setMode] = useState<'android' | 'ios' | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem(DISMISSED_KEY)) return;
    if (window.matchMedia('(display-mode: standalone)').matches) return;

    if (isIOSSafari()) {
      // iOS는 beforeinstallprompt 미지원 — 수동 안내 배너
      setMode('ios');
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
      setMode('android');
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  async function handleInstall() {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') setMode(null);
    setPrompt(null);
  }

  function handleDismiss() {
    localStorage.setItem(DISMISSED_KEY, '1');
    setMode(null);
  }

  const visible = mode !== null;

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
          {mode === 'ios' ? (
            /* iOS Safari 전용 — 수동 설치 안내 */
            <div
              className="bg-white rounded-[20px] border-[3px] border-[#0A0A0A] px-4 py-4"
              style={{ boxShadow: '5px 5px 0 #0A0A0A' }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-12 h-12 rounded-[12px] bg-[#FF3D77] border-[2px] border-[#0A0A0A] flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ boxShadow: '2px 2px 0 #0A0A0A' }}
                >
                  <span
                    className="text-white font-black text-[14px]"
                    style={{ fontFamily: 'Bungee, sans-serif', letterSpacing: -0.5 }}
                  >
                    MS
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-[13px] font-bold text-[#0A0A0A] leading-tight"
                    style={{ fontFamily: 'Pretendard, sans-serif' }}
                  >
                    홈 화면에 추가하기 🎸
                  </p>
                  <p
                    className="text-[11px] text-[#0A0A0A]/60 font-medium mt-1 leading-relaxed"
                    style={{ fontFamily: 'Pretendard, sans-serif' }}
                  >
                    아래 공유 버튼을 탭한 후<br />
                    <span className="font-bold text-[#0A0A0A]/80">"홈 화면에 추가"</span>를 선택하세요
                  </p>
                  {/* 시각적 단계 안내 */}
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex items-center gap-1 bg-[#FFF8F0] border-[2px] border-[#0A0A0A] rounded-[8px] px-2 py-1">
                      <Share className="w-3 h-3 text-[#0A0A0A]" />
                      <span className="text-[10px] font-bold text-[#0A0A0A]" style={{ fontFamily: 'Pretendard, sans-serif' }}>공유</span>
                    </div>
                    <span className="text-[10px] text-[#0A0A0A]/40 font-bold">→</span>
                    <div className="bg-[#FF3D77] border-[2px] border-[#0A0A0A] rounded-[8px] px-2 py-1">
                      <span className="text-[10px] font-bold text-white" style={{ fontFamily: 'Pretendard, sans-serif' }}>홈 화면에 추가</span>
                    </div>
                  </div>
                </div>
                <motion.button
                  onClick={handleDismiss}
                  whileTap={{ scale: 0.9 }}
                  className="flex-shrink-0 w-7 h-7 rounded-[8px] border-[2px] border-[#0A0A0A] bg-[#FFF8F0] flex items-center justify-center"
                  style={{ boxShadow: '1px 1px 0 #0A0A0A' }}
                >
                  <X className="w-3.5 h-3.5" />
                </motion.button>
              </div>
              {/* 하단 화살표 — Safari 하단 공유 버튼 위치 표시 */}
              <div className="flex justify-center mt-3">
                <div className="flex flex-col items-center gap-0.5">
                  <div className="w-4 h-4 text-[#FF3D77] font-black text-[18px] leading-none">↓</div>
                  <span className="text-[10px] text-[#0A0A0A]/40 font-medium" style={{ fontFamily: 'Pretendard, sans-serif' }}>화면 하단 공유 버튼</span>
                </div>
              </div>
            </div>
          ) : (
            /* Android / Chrome — 자동 install prompt */
            <div
              className="bg-white rounded-[20px] border-[3px] border-[#0A0A0A] px-4 py-4 flex items-center gap-3"
              style={{ boxShadow: '5px 5px 0 #0A0A0A' }}
            >
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
              <motion.button
                onClick={handleInstall}
                whileTap={{ scale: 0.95, y: 1 }}
                className="flex-shrink-0 px-3 py-2 bg-[#FF3D77] rounded-[10px] border-[2px] border-[#0A0A0A] text-white font-bold text-[12px]"
                style={{ boxShadow: '2px 2px 0 #0A0A0A', fontFamily: 'Bungee, sans-serif' }}
              >
                추가
              </motion.button>
              <motion.button
                onClick={handleDismiss}
                whileTap={{ scale: 0.9 }}
                className="flex-shrink-0 w-7 h-7 rounded-[8px] border-[2px] border-[#0A0A0A] bg-[#FFF8F0] flex items-center justify-center"
                style={{ boxShadow: '1px 1px 0 #0A0A0A' }}
              >
                <X className="w-3.5 h-3.5" />
              </motion.button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
