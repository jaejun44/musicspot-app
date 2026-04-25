'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { Studio } from '@/types/studio';
import { trackBookingAttempt } from '@/lib/analytics';

interface RoomBookingWidgetProps {
  studio: Studio;
}

type SelectedRoom = 'T' | 'M' | null;

export default function RoomBookingWidget({ studio }: RoomBookingWidgetProps) {
  const router = useRouter();

  const [selectedRoom, setSelectedRoom] = useState<SelectedRoom>(
    studio.room_type === 'T' ? 'T' : studio.room_type === 'M' ? 'M' : null
  );
  const [persons, setPersons] = useState(2);
  const [showComingSoon, setShowComingSoon] = useState(false);

  const showRoomSelector = studio.room_type === 'both';
  const priceLabel = studio.price_per_hour
    ? `₩${studio.price_per_hour.toLocaleString()}/h`
    : studio.price_info ?? '가격 문의';

  // 실제 예약 플로우 — B2B 계약 완료 후 이 함수를 CTA에 연결
  function handleBooking() {
    const params = new URLSearchParams({ roomId: studio.id });
    if (selectedRoom) params.set('room_type', selectedRoom);
    params.set('persons', String(persons));
    router.push(`/booking?${params.toString()}`);
  }

  const hasNaverUrl = !!studio.naver_place_url;
  const hasPhone = !!studio.phone;
  const hasKakao = !!studio.kakao_channel;
  const hasAlternatives = hasNaverUrl || hasPhone || hasKakao;

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
          🎸 예약하기
        </h2>

        {/* 가격 */}
        <div
          className="bg-[#FFD600] rounded-[14px] border-[2px] border-[#0A0A0A] px-4 py-3 mb-4 flex items-center justify-between"
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

        {/* 룸 선택 (T/M both일 때만) */}
        {showRoomSelector && (
          <div className="mb-4">
            <p className="text-[12px] font-bold text-[#0A0A0A]/50 mb-2" style={{ fontFamily: 'Pretendard, sans-serif' }}>
              룸 타입
            </p>
            <div className="flex gap-2">
              {(['T', 'M'] as const).map((r) => (
                <motion.button
                  key={r}
                  onClick={() => setSelectedRoom(r)}
                  whileTap={{ scale: 0.95 }}
                  className={[
                    'flex-1 py-3 rounded-[12px] border-[2px] border-[#0A0A0A] font-bold text-[14px] transition-colors',
                    selectedRoom === r
                      ? 'bg-[#FF3D77] text-white'
                      : 'bg-[#FFF8F0] text-[#0A0A0A]',
                  ].join(' ')}
                  style={{
                    boxShadow: selectedRoom === r ? '3px 3px 0 #0A0A0A' : '2px 2px 0 #0A0A0A',
                    fontFamily: 'Pretendard, sans-serif',
                  }}
                >
                  {r}룸
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {/* 인원 선택 */}
        <div className="mb-5">
          <p className="text-[12px] font-bold text-[#0A0A0A]/50 mb-2" style={{ fontFamily: 'Pretendard, sans-serif' }}>
            인원
          </p>
          <div className="flex items-center gap-3">
            <motion.button
              onClick={() => setPersons((p) => Math.max(1, p - 1))}
              whileTap={{ scale: 0.88 }}
              className="w-10 h-10 rounded-[10px] border-[2px] border-[#0A0A0A] bg-[#FFF8F0] font-bold text-[18px] flex items-center justify-center"
              style={{ boxShadow: '2px 2px 0 #0A0A0A' }}
            >
              −
            </motion.button>
            <span
              className="text-[20px] font-bold w-8 text-center"
              style={{ fontFamily: 'Bungee, sans-serif' }}
            >
              {persons}
            </span>
            <motion.button
              onClick={() => setPersons((p) => Math.min(20, p + 1))}
              whileTap={{ scale: 0.88 }}
              className="w-10 h-10 rounded-[10px] border-[2px] border-[#0A0A0A] bg-[#FFF8F0] font-bold text-[18px] flex items-center justify-center"
              style={{ boxShadow: '2px 2px 0 #0A0A0A' }}
            >
              +
            </motion.button>
            <span className="text-[13px] text-[#0A0A0A]/50 ml-1" style={{ fontFamily: 'Pretendard, sans-serif' }}>
              명
            </span>
          </div>
        </div>

        {/* CTA */}
        <motion.button
          onClick={() => {
            trackBookingAttempt(studio.id, studio.name);
            setShowComingSoon(true);
          }}
          whileTap={{ scale: 0.96, y: 2 }}
          className="w-full py-4 bg-[#FF3D77] rounded-[16px] border-[3px] border-[#0A0A0A] text-white font-bold text-[16px]"
          style={{ boxShadow: '4px 4px 0 #0A0A0A', fontFamily: 'Bungee, sans-serif' }}
        >
          🔥 지금 예약하기
        </motion.button>
      </div>

      {/* 준비중 모달 */}
      <AnimatePresence>
        {showComingSoon && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-6 sm:pb-0"
            style={{ backgroundColor: 'rgba(10,10,10,0.6)' }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowComingSoon(false); }}
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
                  onClick={() => setShowComingSoon(false)}
                  whileTap={{ scale: 0.9 }}
                  className="w-8 h-8 rounded-[8px] border-[2px] border-[#0A0A0A] bg-white flex items-center justify-center"
                  style={{ boxShadow: '2px 2px 0 #0A0A0A' }}
                >
                  <X className="w-4 h-4" />
                </motion.button>
              </div>

              {/* 아이콘 + 타이틀 */}
              <div className="text-center mb-5">
                <div className="text-[48px] mb-3">🚧</div>
                <h3
                  className="text-[22px] font-bold text-[#0A0A0A] mb-2"
                  style={{ fontFamily: 'Bungee, sans-serif' }}
                >
                  COMING SOON!
                </h3>
                <p
                  className="text-[13px] text-[#0A0A0A]/60 font-bold leading-relaxed"
                  style={{ fontFamily: 'Pretendard, sans-serif' }}
                >
                  Music Spot 온라인 예약 기능을 준비 중이에요.{'\n'}
                  파트너십 계약 완료 후 바로 오픈됩니다! 🎸
                </p>
              </div>

              {/* 대안 안내 */}
              {hasAlternatives && (
                <div className="mb-4">
                  <p
                    className="text-[11px] font-bold text-[#0A0A0A]/40 text-center mb-3"
                    style={{ fontFamily: 'Pretendard, sans-serif' }}
                  >
                    지금은 아래 방법으로 예약해보세요
                  </p>
                  <div className="flex flex-col gap-2">
                    {hasNaverUrl && (
                      <a
                        href={studio.naver_place_url!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 px-4 py-3 bg-[#00C73C] rounded-[14px] border-[2px] border-[#0A0A0A] text-white font-bold text-[13px]"
                        style={{ boxShadow: '3px 3px 0 #0A0A0A', fontFamily: 'Pretendard, sans-serif' }}
                      >
                        <span className="text-[16px]">🗺</span>
                        네이버 예약으로 이동
                      </a>
                    )}
                    {hasPhone && (
                      <a
                        href={`tel:${studio.phone}`}
                        className="flex items-center gap-3 px-4 py-3 bg-[#4FC3F7] rounded-[14px] border-[2px] border-[#0A0A0A] text-[#0A0A0A] font-bold text-[13px]"
                        style={{ boxShadow: '3px 3px 0 #0A0A0A', fontFamily: 'Pretendard, sans-serif' }}
                      >
                        <span className="text-[16px]">📞</span>
                        전화 예약 — {studio.phone}
                      </a>
                    )}
                    {hasKakao && (
                      <a
                        href={studio.kakao_channel!}
                        target="_blank"
                        rel="noopener noreferrer"
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
                onClick={() => setShowComingSoon(false)}
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
