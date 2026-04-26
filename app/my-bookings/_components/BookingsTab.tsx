'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface Booking {
  id: string;
  studio_id: string;
  studio_name: string;
  studio_address: string | null;
  room_type: 'T' | 'M' | null;
  date: string;
  time: string;
  duration: number;
  persons: number;
  band_name: string;
  total_price: number | null;
  price_info: string | null;
  payment_method: string | null;
  status: 'confirmed' | 'cancelled';
  created_at: string;
}

const STATUS_LABEL: Record<string, { label: string; bg: string; color: string }> = {
  confirmed: { label: '예약 확정', bg: '#41C66B', color: '#fff' },
  cancelled: { label: '취소됨', bg: '#0A0A0A', color: '#fff' },
};

export default function BookingsTab() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); return; }

    supabase
      .from('bookings')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setBookings((data as Booking[]) ?? []);
        setLoading(false);
      });
  }, [user, authLoading]);

  if (loading || authLoading) {
    return (
      <div className="flex justify-center py-20">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 0.9, ease: 'linear' }}
          className="w-8 h-8 rounded-full border-[3px] border-[#FF3D77] border-t-transparent"
        />
      </div>
    );
  }

  if (!user) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        className="flex flex-col items-center justify-center py-16 px-4"
      >
        <div
          className="w-20 h-20 rounded-full bg-[#FF3D77] border-[3px] border-[#0A0A0A] flex items-center justify-center mb-5"
          style={{ boxShadow: '4px 4px 0 #0A0A0A' }}
        >
          <span className="text-[32px]">🔐</span>
        </div>
        <p
          className="text-[18px] font-bold text-[#0A0A0A] mb-2 text-center"
          style={{ fontFamily: 'Bungee, sans-serif' }}
        >
          LOGIN REQUIRED
        </p>
        <p
          className="text-[13px] text-[#0A0A0A]/50 font-bold text-center mb-6"
          style={{ fontFamily: 'Pretendard, sans-serif' }}
        >
          예약 내역을 보려면 로그인이 필요해요
        </p>
        <motion.button
          onClick={() => router.push('/login')}
          whileTap={{ scale: 0.95, y: 2 }}
          className="px-6 py-3 bg-[#FF3D77] rounded-[14px] border-[3px] border-[#0A0A0A] text-white font-bold text-[14px]"
          style={{ boxShadow: '3px 3px 0 #0A0A0A', fontFamily: 'Bungee, sans-serif' }}
        >
          로그인하기
        </motion.button>
      </motion.div>
    );
  }

  if (bookings.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        className="flex flex-col items-center justify-center py-16 px-4"
      >
        <div
          className="w-20 h-20 rounded-full bg-[#F5FF4F] border-[3px] border-[#0A0A0A] flex items-center justify-center mb-5"
          style={{ boxShadow: '4px 4px 0 #0A0A0A' }}
        >
          <span className="text-[32px]">📋</span>
        </div>
        <p
          className="text-[18px] font-bold text-[#0A0A0A] mb-2 text-center"
          style={{ fontFamily: 'Bungee, sans-serif' }}
        >
          NO BOOKINGS YET
        </p>
        <p
          className="text-[13px] text-[#0A0A0A]/50 font-bold text-center mb-6"
          style={{ fontFamily: 'Pretendard, sans-serif' }}
        >
          아직 예약 내역이 없어요.<br />마음에 드는 연습실을 찾아 예약해보세요 🎸
        </p>
        <motion.button
          onClick={() => router.push('/search')}
          whileTap={{ scale: 0.95, y: 2 }}
          className="px-6 py-3 bg-[#FF3D77] rounded-[14px] border-[3px] border-[#0A0A0A] text-white font-bold text-[14px]"
          style={{ boxShadow: '3px 3px 0 #0A0A0A', fontFamily: 'Bungee, sans-serif' }}
        >
          🔍 연습실 찾기
        </motion.button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      className="px-4 pb-8 space-y-4"
    >
      {bookings.map((b, i) => {
        const status = STATUS_LABEL[b.status] ?? STATUS_LABEL.confirmed;
        const createdDate = new Date(b.created_at).toLocaleDateString('ko-KR', {
          year: 'numeric', month: 'short', day: 'numeric',
        });

        return (
          <motion.div
            key={b.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, type: 'spring', stiffness: 260, damping: 22 }}
            onClick={() => router.push(`/room/${b.studio_id}`)}
            className="bg-white rounded-[20px] border-[3px] border-[#0A0A0A] p-5 cursor-pointer active:translate-y-[2px] active:translate-x-[2px]"
            style={{ boxShadow: '5px 5px 0 #0A0A0A', transition: 'box-shadow 0.1s, transform 0.1s' }}
          >
            {/* 헤더 */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                <p
                  className="text-[16px] font-bold text-[#0A0A0A] truncate"
                  style={{ fontFamily: 'Pretendard, sans-serif' }}
                >
                  {b.studio_name}
                </p>
                {b.studio_address && (
                  <p
                    className="text-[12px] text-[#0A0A0A]/40 font-bold mt-0.5 truncate"
                    style={{ fontFamily: 'Pretendard, sans-serif' }}
                  >
                    {b.studio_address}
                  </p>
                )}
              </div>
              <span
                className="ml-3 flex-shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold border-[2px] border-[#0A0A0A]"
                style={{ background: status.bg, color: status.color, fontFamily: 'Pretendard, sans-serif' }}
              >
                {status.label}
              </span>
            </div>

            {/* 예약 정보 */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <Info label="날짜" value={b.date} />
              <Info label="시간" value={`${b.time} (+${b.duration}h)`} />
              <Info label="인원" value={`${b.persons}명`} />
              {b.room_type && <Info label="룸 타입" value={`${b.room_type}룸`} />}
              <Info label="밴드명" value={b.band_name} />
              {b.payment_method && (
                <Info
                  label="결제"
                  value={b.payment_method === 'card' ? '카드' : b.payment_method === 'bank' ? '계좌이체' : '카카오페이'}
                />
              )}
            </div>

            {/* 금액 + 날짜 */}
            <div className="flex justify-between items-center pt-3 border-t-[2px] border-dashed border-[#0A0A0A]/20">
              <span
                className="text-[11px] text-[#0A0A0A]/40 font-bold"
                style={{ fontFamily: 'Pretendard, sans-serif' }}
              >
                예약일: {createdDate}
              </span>
              {b.total_price ? (
                <span
                  className="text-[18px] font-bold text-[#FF3D77]"
                  style={{ fontFamily: 'Bungee, sans-serif' }}
                >
                  ₩{b.total_price.toLocaleString()}
                </span>
              ) : (
                <span
                  className="text-[13px] font-bold text-[#0A0A0A]/50"
                  style={{ fontFamily: 'Pretendard, sans-serif' }}
                >
                  {b.price_info ?? '현장 결제'}
                </span>
              )}
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p
        className="text-[10px] text-[#0A0A0A]/40 font-bold uppercase tracking-wide"
        style={{ fontFamily: 'Pretendard, sans-serif' }}
      >
        {label}
      </p>
      <p
        className="text-[13px] font-bold text-[#0A0A0A] truncate"
        style={{ fontFamily: 'Pretendard, sans-serif' }}
      >
        {value}
      </p>
    </div>
  );
}
