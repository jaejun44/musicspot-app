'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { kakaoChannelUrl, studioBookingLink } from '@/lib/studio-contact';
import { Studio } from '@/types/studio';
import { trackBookingAttempt, trackContactClick } from '@/lib/analytics';

interface RoomBookingWidgetProps {
  studio: Studio;
}

export default function RoomBookingWidget({ studio }: RoomBookingWidgetProps) {
  const [showNoLinkFallback, setShowNoLinkFallback] = useState(false);
  const priceLabel = studio.price_per_hour
    ? `₩${studio.price_per_hour.toLocaleString()}/h`
    : studio.price_info ?? '가격 문의';

  const bookingLink = studioBookingLink(studio);
  const bookingUrl = bookingLink?.url;
  const bookingUrlType = bookingLink?.type ?? 'source';
  const kakaoUrl = kakaoChannelUrl(studio.kakao_channel);

  const hasPhone = !!studio.phone;
  const hasKakao = !!kakaoUrl;
  const hasAlternatives = hasPhone || hasKakao;

  function handleBookingClick() {
    trackBookingAttempt(studio.id, studio.name);
    if (bookingUrl) {
      trackContactClick(bookingUrlType, studio.id, studio.name);
      window.open(bookingUrl, '_blank', 'noopener,noreferrer');
    } else {
      setShowNoLinkFallback(true);
    }
  }

  return (
    <>
      <div
        className="bg-white rounded-[20px] border-[3px] border-[#0A0A0A] p-5"
        style={{ boxShadow: '6px 6px 0 #0A0A0A' }}
      >
        <h2
          className="text-[16px] font-bold mb-4 text-[#0A0A0A]"
          style={{ fontFamily: 'Pretendard, sans-serif' }}
        >
          🎸 업체에 문의하기
        </h2>

        {/* 가격 */}
        <div
          className="bg-[#F5FF4F] rounded-[14px] border-[2px] border-[#0A0A0A] px-4 py-3 mb-4 flex items-center justify-between"
          style={{ boxShadow: '3px 3px 0 #FF3D77' }}
        >
          <span className="text-[12px] font-bold text-[#0A0A0A]/60" style={{ fontFamily: 'Pretendard, sans-serif' }}>
            이용 요금
          </span>
          <span
            className="text-[20px] font-bold text-[#0A0A0A]"
            style={{ fontFamily: 'Bungee, sans-serif' }}
          >
            {priceLabel}
          </span>
        </div>

        <p className="text-sm mb-5 text-[#0A0A0A]/70">
          이용 인원·장비·예약 가능한 시간과 최종 가격은 업체에서 확인해 주세요.
        </p>

        {/* CTA */}
        <motion.button
          onClick={handleBookingClick}
          whileTap={{ scale: 0.96, y: 2 }}
          className="w-full py-4 bg-[#FF3D77] rounded-[16px] border-[3px] border-[#0A0A0A] text-white font-bold text-[16px]"
          style={{ boxShadow: '4px 4px 0 #0A0A0A', fontFamily: 'Bungee, sans-serif' }}
        >
          업체 정보·예약 확인 ↗
        </motion.button>
        {bookingUrl && (
          <p
            className="text-[11px] text-[#0A0A0A]/40 font-bold text-center mt-2"
            style={{ fontFamily: 'Pretendard, sans-serif' }}
          >
            업체의 외부 페이지로 이동합니다.
          </p>
        )}
      </div>

      {/* 외부 예약 링크가 없는 극히 드문 경우의 대체 안내 */}
      <AnimatePresence>
        {showNoLinkFallback && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-6 sm:pb-0"
            style={{ backgroundColor: 'rgba(10,10,10,0.6)' }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowNoLinkFallback(false); }}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="w-full max-w-sm bg-[#FFF8F0] rounded-[24px] border-[3px] border-[#0A0A0A] p-6"
              style={{ boxShadow: '8px 8px 0 #0A0A0A' }}
            >
              {/* 닫기 */}
              <div className="flex justify-end mb-2">
                <motion.button
                  onClick={() => setShowNoLinkFallback(false)}
                  whileTap={{ scale: 0.9 }}
                  className="w-8 h-8 rounded-[8px] border-[2px] border-[#0A0A0A] bg-white flex items-center justify-center"
                  style={{ boxShadow: '2px 2px 0 #0A0A0A' }}
                >
                  <X className="w-4 h-4" />
                </motion.button>
              </div>

              {/* 아이콘 + 타이틀 */}
              <div className="text-center mb-5">
                <div className="text-[48px] mb-3">📞</div>
                <h3
                  className="text-[22px] font-bold text-[#0A0A0A] mb-2"
                  style={{ fontFamily: 'Bungee, sans-serif' }}
                >
                  직접 문의해서 예약해보세요
                </h3>
                <p
                  className="text-[13px] text-[#0A0A0A]/60 font-bold leading-relaxed"
                  style={{ fontFamily: 'Pretendard, sans-serif' }}
                >
                  이 연습실은 온라인 예약 링크가 아직 없어요.{'\n'}
                  아래 방법으로 문의해보세요.
                </p>
              </div>

              {/* 대안 안내 */}
              {hasAlternatives && (
                <div className="mb-4">
                  <div className="flex flex-col gap-2">
                    {hasPhone && (
                      <a
                        href={`tel:${studio.phone}`}
                        onClick={() => trackContactClick('phone', studio.id, studio.name)}
                        className="flex items-center gap-3 px-4 py-3 bg-[#4FC3F7] rounded-[14px] border-[2px] border-[#0A0A0A] text-[#0A0A0A] font-bold text-[13px]"
                        style={{ boxShadow: '3px 3px 0 #0A0A0A', fontFamily: 'Pretendard, sans-serif' }}
                      >
                        <span className="text-[16px]">📞</span>
                        전화 예약 — {studio.phone}
                      </a>
                    )}
                    {hasKakao && (
                      <a
                        href={kakaoUrl!}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => trackContactClick('kakao', studio.id, studio.name)}
                        className="flex items-center gap-3 px-4 py-3 bg-[#FFD600] rounded-[14px] border-[2px] border-[#0A0A0A] text-[#0A0A0A] font-bold text-[13px]"
                        style={{ boxShadow: '3px 3px 0 #0A0A0A', fontFamily: 'Pretendard, sans-serif' }}
                      >
                        <span className="text-[16px]">💛</span>
                        카카오 채널로 문의
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* 닫기 버튼 */}
              <motion.button
                onClick={() => setShowNoLinkFallback(false)}
                whileTap={{ scale: 0.96, y: 2 }}
                className="w-full py-3 bg-[#0A0A0A] rounded-[14px] border-[2px] border-[#0A0A0A] text-white font-bold text-[14px]"
                style={{ boxShadow: '3px 3px 0 #FF3D77', fontFamily: 'Bungee, sans-serif' }}
              >
                확인
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
