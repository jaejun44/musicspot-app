'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Musician } from '../_data/musicians';
import { trackBandContact } from '@/lib/analytics';

interface Props {
  musician: Musician | null;
  onClose: () => void;
}

export default function ContactModal({ musician, onClose }: Props) {
  return (
    <AnimatePresence>
      {musician && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#0A0A0A]/50 z-50"
          />
          <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 280, damping: 24 }}
            className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-8"
          >
            <div
              className="bg-white rounded-[24px] border-[3px] border-[#0A0A0A] p-6 max-w-sm mx-auto"
              style={{ boxShadow: '6px 6px 0 #0A0A0A' }}
            >
              {/* 헤더 */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-full border-[3px] border-[#0A0A0A] flex items-center justify-center text-[22px]"
                    style={{ backgroundColor: musician.color, boxShadow: '2px 2px 0 #0A0A0A' }}
                  >
                    {musician.emoji}
                  </div>
                  <div>
                    <p
                      className="text-[15px] font-bold text-[#0A0A0A]"
                      style={{ fontFamily: 'Pretendard, sans-serif' }}
                    >
                      {musician.name}
                    </p>
                    <p
                      className="text-[12px] text-[#0A0A0A]/50 font-bold"
                      style={{ fontFamily: 'Pretendard, sans-serif' }}
                    >
                      {musician.position} · {musician.location}
                    </p>
                  </div>
                </div>
                <motion.button
                  onClick={onClose}
                  whileTap={{ scale: 0.9 }}
                  className="w-8 h-8 rounded-full bg-[#0A0A0A]/10 flex items-center justify-center"
                >
                  <X className="w-4 h-4 text-[#0A0A0A]" />
                </motion.button>
              </div>

              <p
                className="text-[13px] text-[#0A0A0A]/60 font-bold mb-5 bg-[#FFF8F0] rounded-[12px] p-3"
                style={{ fontFamily: 'Pretendard, sans-serif' }}
              >
                💬 {musician.lookingFor}
              </p>

              <div className="flex flex-col gap-2">
                <motion.button
                  whileTap={{ scale: 0.96, y: 2 }}
                  onClick={() => { trackBandContact('kakao', musician.name, musician.position); alert('카카오 채널 연동 준비 중이에요! 🎸'); }}
                  className="w-full py-3.5 bg-[#F5FF4F] rounded-[14px] border-[2px] border-[#0A0A0A] font-bold text-[14px] text-[#0A0A0A]"
                  style={{ boxShadow: '3px 3px 0 #0A0A0A', fontFamily: 'Pretendard, sans-serif' }}
                >
                  💛 카카오로 연락하기
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.96, y: 2 }}
                  onClick={onClose}
                  className="w-full py-3.5 bg-white rounded-[14px] border-[2px] border-[#0A0A0A] font-bold text-[14px] text-[#0A0A0A]/50"
                  style={{ boxShadow: '2px 2px 0 #0A0A0A', fontFamily: 'Pretendard, sans-serif' }}
                >
                  닫기
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
