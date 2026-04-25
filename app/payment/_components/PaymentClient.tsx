'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';
import Navigation from '@/components/Navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { trackBookingComplete } from '@/lib/analytics';

interface BookingData {
  studioId: string;
  studioName: string;
  studioAddress: string;
  roomType: 'T' | 'M' | null;
  date: string;
  time: string;
  duration: number;
  persons: number;
  bandName: string;
  contact: string;
  purpose: string;
  pricePerHour: number | null;
  priceInfo: string | null;
  totalPrice: number | null;
}

type PaymentMethod = 'card' | 'bank' | 'kakao';

const PAYMENT_METHODS: { id: PaymentMethod; label: string; emoji: string; color: string }[] = [
  { id: 'card', label: '신용/체크카드', emoji: '💳', color: '#4FC3F7' },
  { id: 'bank', label: '계좌이체', emoji: '🏦', color: '#00D26A' },
  { id: 'kakao', label: '카카오페이', emoji: '💛', color: '#FFD600' },
];

export default function PaymentClient() {
  const router = useRouter();
  const { user } = useAuth();
  const [booking, setBooking] = useState<BookingData | null>(null);
  const [method, setMethod] = useState<PaymentMethod>('card');
  const [coupon, setCoupon] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem('musicspot_booking');
    if (!raw) { router.replace('/search'); return; }
    try { setBooking(JSON.parse(raw)); } catch { router.replace('/search'); }
  }, [router]);

  const discount = couponApplied ? 5000 : 0;
  const finalPrice = booking?.totalPrice ? Math.max(0, booking.totalPrice - discount) : null;

  function applyCoupon() {
    if (coupon.trim().toUpperCase() === 'MUSIC10') {
      setCouponApplied(true);
    } else {
      alert('유효하지 않은 쿠폰 코드입니다. (힌트: MUSIC10)');
    }
  }

  async function handlePay() {
    setPaying(true);
    await new Promise((r) => setTimeout(r, 1200));

    if (user && booking) {
      await supabase.from('bookings').insert({
        user_id: user.id,
        studio_id: booking.studioId,
        studio_name: booking.studioName,
        studio_address: booking.studioAddress,
        room_type: booking.roomType,
        date: booking.date,
        time: booking.time,
        duration: booking.duration,
        persons: booking.persons,
        band_name: booking.bandName,
        contact: booking.contact,
        purpose: booking.purpose,
        total_price: finalPrice,
        price_info: booking.priceInfo,
        payment_method: method,
        status: 'confirmed',
      });
      trackBookingComplete(booking.studioId, booking.studioName, finalPrice);
    }

    router.push('/complete');
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-[#FFF8F0] flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 0.9, ease: 'linear' }}
          className="w-10 h-10 rounded-full border-[3px] border-[#FF3D77] border-t-transparent"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF8F0] pb-32">
      <Navigation />

      <div className="px-4 pt-4 pb-2">
        <motion.button
          onClick={() => router.back()}
          whileTap={{ scale: 0.93 }}
          className="flex items-center gap-1 text-[14px] font-bold text-[#0A0A0A]/60 hover:text-[#0A0A0A] transition-colors"
          style={{ fontFamily: 'Pretendard, sans-serif' }}
        >
          <ChevronLeft className="w-5 h-5" />
          예약 정보로
        </motion.button>
      </div>

      <div className="px-4 pb-4">
        <h1
          className="text-[28px] font-bold text-[#0A0A0A]"
          style={{ fontFamily: 'Bungee, sans-serif' }}
        >
          PAYMENT 💳
        </h1>
        <p
          className="text-[13px] text-[#0A0A0A]/50 mt-1"
          style={{ fontFamily: 'Pretendard, sans-serif' }}
        >
          결제 수단을 선택해주세요
        </p>
      </div>

      <div className="px-4 space-y-5 max-w-2xl mx-auto">
        {/* 주문 요약 */}
        <div
          className="bg-white rounded-[20px] border-[3px] border-[#0A0A0A] p-5"
          style={{ boxShadow: '6px 6px 0 #0A0A0A' }}
        >
          <h2
            className="text-[15px] font-bold mb-3 text-[#0A0A0A]"
            style={{ fontFamily: 'Pretendard, sans-serif' }}
          >
            🎸 주문 요약
          </h2>

          <div className="space-y-2">
            <Row label="연습실" value={booking.studioName} />
            {booking.roomType && <Row label="룸 타입" value={`${booking.roomType}룸`} />}
            <Row label="날짜" value={booking.date} />
            <Row label="시간" value={`${booking.time} ~ (+${booking.duration}h)`} />
            <Row label="인원" value={`${booking.persons}명`} />
            <Row label="밴드명" value={booking.bandName} />
            <Row label="이용 목적" value={booking.purpose} />
          </div>

          <div className="mt-4 pt-3 border-t-[2px] border-dashed border-[#0A0A0A]/20">
            {booking.pricePerHour ? (
              <>
                <Row
                  label={`₩${booking.pricePerHour.toLocaleString()} × ${booking.duration}시간`}
                  value={`₩${booking.totalPrice!.toLocaleString()}`}
                />
                {couponApplied && (
                  <Row label="쿠폰 할인" value={`-₩${discount.toLocaleString()}`} valueClass="text-[#00D26A]" />
                )}
                <div className="flex justify-between items-center mt-2 pt-2 border-t-[2px] border-[#0A0A0A]">
                  <span
                    className="text-[14px] font-bold text-[#0A0A0A]"
                    style={{ fontFamily: 'Pretendard, sans-serif' }}
                  >
                    최종 결제
                  </span>
                  <span
                    className="text-[24px] font-bold text-[#FF3D77]"
                    style={{ fontFamily: 'Bungee, sans-serif' }}
                  >
                    ₩{finalPrice!.toLocaleString()}
                  </span>
                </div>
              </>
            ) : (
              <p
                className="text-[13px] text-[#0A0A0A]/50 font-bold"
                style={{ fontFamily: 'Pretendard, sans-serif' }}
              >
                {booking.priceInfo ?? '현장 결제'}
              </p>
            )}
          </div>
        </div>

        {/* 쿠폰 */}
        <div
          className="bg-white rounded-[20px] border-[3px] border-[#0A0A0A] p-5"
          style={{ boxShadow: '6px 6px 0 #0A0A0A' }}
        >
          <h2
            className="text-[15px] font-bold mb-3 text-[#0A0A0A]"
            style={{ fontFamily: 'Pretendard, sans-serif' }}
          >
            🎟️ 쿠폰
          </h2>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="쿠폰 코드 입력"
              value={coupon}
              onChange={(e) => setCoupon(e.target.value)}
              disabled={couponApplied}
              className="flex-1 px-4 py-3 bg-[#FFF8F0] border-[2px] border-[#0A0A0A] rounded-[12px] text-[13px] font-bold text-[#0A0A0A] outline-none disabled:opacity-40 placeholder:text-[#0A0A0A]/30 focus:border-[#FF3D77]"
              style={{ fontFamily: 'Pretendard, sans-serif' }}
            />
            <motion.button
              type="button"
              onClick={applyCoupon}
              disabled={couponApplied || !coupon.trim()}
              whileTap={{ scale: 0.95 }}
              className="px-4 py-3 bg-[#FFD600] rounded-[12px] border-[2px] border-[#0A0A0A] font-bold text-[13px] text-[#0A0A0A] disabled:opacity-40"
              style={{ boxShadow: '2px 2px 0 #0A0A0A', fontFamily: 'Pretendard, sans-serif' }}
            >
              {couponApplied ? '적용됨 ✓' : '적용'}
            </motion.button>
          </div>
        </div>

        {/* 결제 수단 */}
        <div
          className="bg-white rounded-[20px] border-[3px] border-[#0A0A0A] p-5"
          style={{ boxShadow: '6px 6px 0 #0A0A0A' }}
        >
          <h2
            className="text-[15px] font-bold mb-3 text-[#0A0A0A]"
            style={{ fontFamily: 'Pretendard, sans-serif' }}
          >
            💳 결제 수단
          </h2>
          <div className="space-y-2">
            {PAYMENT_METHODS.map((m) => (
              <motion.button
                key={m.id}
                type="button"
                onClick={() => setMethod(m.id)}
                whileTap={{ scale: 0.98 }}
                className={[
                  'w-full flex items-center gap-3 px-4 py-3.5 rounded-[14px] border-[2px] border-[#0A0A0A] transition-colors text-left',
                  method === m.id ? 'bg-[#0A0A0A] text-white' : 'bg-[#FFF8F0] text-[#0A0A0A]',
                ].join(' ')}
                style={{
                  boxShadow: method === m.id ? '3px 3px 0 #FF3D77' : '2px 2px 0 #0A0A0A',
                }}
              >
                <span className="text-[20px]">{m.emoji}</span>
                <span
                  className="text-[14px] font-bold"
                  style={{ fontFamily: 'Pretendard, sans-serif' }}
                >
                  {m.label}
                </span>
                {method === m.id && (
                  <span className="ml-auto text-[#FFD600] text-[12px] font-bold" style={{ fontFamily: 'Bungee, sans-serif' }}>
                    ✓
                  </span>
                )}
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* 결제 버튼 */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#FFF8F0] border-t-[3px] border-[#0A0A0A] px-4 py-3">
        <div className="max-w-2xl mx-auto">
          <motion.button
            onClick={handlePay}
            disabled={paying}
            whileTap={paying ? undefined : { scale: 0.96, y: 2 }}
            className="w-full py-4 bg-[#FF3D77] rounded-[16px] border-[3px] border-[#0A0A0A] text-white font-bold text-[16px] disabled:opacity-70"
            style={{ boxShadow: '4px 4px 0 #0A0A0A', fontFamily: 'Bungee, sans-serif' }}
          >
            {paying ? '결제 중...' : finalPrice ? `₩${finalPrice.toLocaleString()} 결제하기 💥` : '결제하기 💥'}
          </motion.button>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  valueClass = 'text-[#0A0A0A]',
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex justify-between items-center">
      <span
        className="text-[12px] text-[#0A0A0A]/50 font-bold"
        style={{ fontFamily: 'Pretendard, sans-serif' }}
      >
        {label}
      </span>
      <span
        className={`text-[13px] font-bold ${valueClass}`}
        style={{ fontFamily: 'Pretendard, sans-serif' }}
      >
        {value}
      </span>
    </div>
  );
}
