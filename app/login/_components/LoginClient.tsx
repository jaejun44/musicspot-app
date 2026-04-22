'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import { supabase } from '@/lib/supabase';

type Step = 'select' | 'email-input' | 'email-sent';

export default function LoginClient() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('select');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const redirectTo =
    typeof window !== 'undefined'
      ? `${window.location.origin}/auth/callback`
      : '/auth/callback';

  async function handleOAuth(provider: 'kakao' | 'google') {
    setLoading(provider);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    });
    if (error) {
      setError('로그인 중 오류가 발생했어요. 다시 시도해 주세요.');
      setLoading(null);
    }
  }

  async function handleEmailSend() {
    if (!email.trim()) return;
    setLoading('email');
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirectTo },
    });
    setLoading(null);
    if (error) {
      setError('이메일 전송에 실패했어요. 이메일 주소를 확인해 주세요.');
    } else {
      setStep('email-sent');
    }
  }

  return (
    <div className="min-h-screen bg-[#FFF8F0] flex flex-col">
      <Navigation />

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-10">
        {/* 로고 */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          className="mb-8"
        >
          <div
            className="w-24 h-24 rounded-full bg-[#FF3D77] border-[4px] border-[#0A0A0A] flex items-center justify-center"
            style={{ boxShadow: '6px 6px 0 #0A0A0A' }}
          >
            <span className="text-[40px]">🎸</span>
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-[32px] font-bold text-[#0A0A0A] mb-2 text-center"
          style={{ fontFamily: 'Bungee, sans-serif' }}
        >
          MUSIC SPOT
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-[14px] text-[#0A0A0A]/50 font-bold mb-10 text-center"
          style={{ fontFamily: 'Pretendard, sans-serif' }}
        >
          뮤지션을 위한 합주/연습실 플랫폼
        </motion.p>

        <AnimatePresence mode="wait">
          {/* 로그인 방법 선택 */}
          {step === 'select' && (
            <motion.div
              key="select"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ delay: 0.4 }}
              className="w-full max-w-sm flex flex-col gap-3"
            >
              {/* 카카오 — 비즈 앱 승인 후 활성화 예정 */}
              {false && (
              <motion.button
                onClick={() => handleOAuth('kakao')}
                disabled={!!loading}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.45, type: 'spring' }}
                whileTap={{ scale: 0.96, y: 2 }}
                className="w-full py-4 rounded-[16px] border-[3px] border-[#0A0A0A] font-bold text-[15px] flex items-center justify-center gap-3 disabled:opacity-60"
                style={{
                  backgroundColor: '#FFD600',
                  color: '#0A0A0A',
                  boxShadow: '4px 4px 0 #0A0A0A',
                  fontFamily: 'Pretendard, sans-serif',
                }}
              >
                {loading === 'kakao' ? (
                  <span className="w-5 h-5 rounded-full border-[2px] border-[#0A0A0A] border-t-transparent animate-spin" />
                ) : (
                  <span className="text-[20px]">💛</span>
                )}
                카카오로 시작하기
              </motion.button>
              )}

              {/* 구글 */}
              <motion.button
                onClick={() => handleOAuth('google')}
                disabled={!!loading}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.53, type: 'spring' }}
                whileTap={{ scale: 0.96, y: 2 }}
                className="w-full py-4 rounded-[16px] border-[3px] border-[#0A0A0A] font-bold text-[15px] flex items-center justify-center gap-3 bg-white disabled:opacity-60"
                style={{
                  color: '#0A0A0A',
                  boxShadow: '4px 4px 0 #0A0A0A',
                  fontFamily: 'Pretendard, sans-serif',
                }}
              >
                {loading === 'google' ? (
                  <span className="w-5 h-5 rounded-full border-[2px] border-[#0A0A0A] border-t-transparent animate-spin" />
                ) : (
                  <span className="text-[20px]">🔵</span>
                )}
                Google로 시작하기
              </motion.button>

              {/* 이메일 */}
              <motion.button
                onClick={() => setStep('email-input')}
                disabled={!!loading}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.61, type: 'spring' }}
                whileTap={{ scale: 0.96, y: 2 }}
                className="w-full py-4 rounded-[16px] border-[3px] border-[#0A0A0A] font-bold text-[15px] flex items-center justify-center gap-3 bg-[#FF3D77] text-white disabled:opacity-60"
                style={{
                  boxShadow: '4px 4px 0 #0A0A0A',
                  fontFamily: 'Pretendard, sans-serif',
                }}
              >
                <span className="text-[20px]">✉️</span>
                이메일로 시작하기
              </motion.button>

              {error && (
                <p
                  className="text-center text-[12px] text-[#FF3D77] font-bold mt-1"
                  style={{ fontFamily: 'Pretendard, sans-serif' }}
                >
                  {error}
                </p>
              )}
            </motion.div>
          )}

          {/* 이메일 입력 */}
          {step === 'email-input' && (
            <motion.div
              key="email-input"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="w-full max-w-sm flex flex-col gap-3"
            >
              <p
                className="text-[14px] font-bold text-[#0A0A0A]/60 text-center mb-1"
                style={{ fontFamily: 'Pretendard, sans-serif' }}
              >
                이메일로 로그인 링크를 보내드릴게요
              </p>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleEmailSend()}
                placeholder="이메일 주소 입력"
                className="w-full px-4 py-4 rounded-[16px] border-[3px] border-[#0A0A0A] bg-white font-bold text-[15px] text-[#0A0A0A] outline-none focus:border-[#FF3D77] placeholder:text-[#0A0A0A]/30"
                style={{ boxShadow: '4px 4px 0 #0A0A0A', fontFamily: 'Pretendard, sans-serif' }}
                autoFocus
              />
              <motion.button
                onClick={handleEmailSend}
                disabled={!email.trim() || loading === 'email'}
                whileTap={{ scale: 0.96, y: 2 }}
                className="w-full py-4 bg-[#FF3D77] text-white rounded-[16px] border-[3px] border-[#0A0A0A] font-bold text-[15px] flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ boxShadow: '4px 4px 0 #0A0A0A', fontFamily: 'Pretendard, sans-serif' }}
              >
                {loading === 'email' ? (
                  <span className="w-5 h-5 rounded-full border-[2px] border-white border-t-transparent animate-spin" />
                ) : (
                  '링크 받기 ✉️'
                )}
              </motion.button>
              <button
                onClick={() => { setStep('select'); setError(null); }}
                className="text-center text-[13px] font-bold text-[#0A0A0A]/40 mt-1"
                style={{ fontFamily: 'Pretendard, sans-serif' }}
              >
                ← 뒤로
              </button>
              {error && (
                <p
                  className="text-center text-[12px] text-[#FF3D77] font-bold"
                  style={{ fontFamily: 'Pretendard, sans-serif' }}
                >
                  {error}
                </p>
              )}
            </motion.div>
          )}

          {/* 이메일 전송 완료 */}
          {step === 'email-sent' && (
            <motion.div
              key="email-sent"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-sm flex flex-col items-center gap-4"
            >
              <div
                className="w-20 h-20 rounded-full bg-[#00D26A] border-[4px] border-[#0A0A0A] flex items-center justify-center"
                style={{ boxShadow: '6px 6px 0 #0A0A0A' }}
              >
                <span className="text-[36px]">✉️</span>
              </div>
              <h2
                className="text-[22px] font-bold text-[#0A0A0A] text-center"
                style={{ fontFamily: 'Bungee, sans-serif' }}
              >
                CHECK YOUR EMAIL!
              </h2>
              <p
                className="text-[14px] font-bold text-[#0A0A0A]/50 text-center"
                style={{ fontFamily: 'Pretendard, sans-serif' }}
              >
                <span className="text-[#FF3D77]">{email}</span>로<br />
                로그인 링크를 보냈어요. 메일을 확인해 주세요!
              </p>
              <button
                onClick={() => { setStep('select'); setEmail(''); }}
                className="text-center text-[13px] font-bold text-[#0A0A0A]/40 mt-2"
                style={{ fontFamily: 'Pretendard, sans-serif' }}
              >
                다른 방법으로 로그인 →
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 구분선 + 비회원 (select 단계만) */}
        {step === 'select' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="w-full max-w-sm mt-6 flex flex-col gap-4"
          >
            <div className="flex items-center gap-3">
              <div className="flex-1 h-[2px] bg-[#0A0A0A]/10 rounded-full" />
              <span
                className="text-[12px] text-[#0A0A0A]/30 font-bold"
                style={{ fontFamily: 'Pretendard, sans-serif' }}
              >
                또는
              </span>
              <div className="flex-1 h-[2px] bg-[#0A0A0A]/10 rounded-full" />
            </div>
            <motion.button
              onClick={() => router.push('/search')}
              whileTap={{ scale: 0.97 }}
              className="w-full py-3.5 bg-white rounded-[16px] border-[3px] border-[#0A0A0A] font-bold text-[14px] text-[#0A0A0A]/60"
              style={{ boxShadow: '4px 4px 0 #0A0A0A', fontFamily: 'Pretendard, sans-serif' }}
            >
              비회원으로 둘러보기 →
            </motion.button>
          </motion.div>
        )}

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.85 }}
          className="text-[11px] text-[#0A0A0A]/30 font-bold mt-6 text-center"
          style={{ fontFamily: 'Pretendard, sans-serif' }}
        >
          로그인 시 이용약관 및 개인정보 처리방침에 동의하게 됩니다.
        </motion.p>
      </div>
    </div>
  );
}
