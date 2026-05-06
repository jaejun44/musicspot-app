'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Studio } from '@/types/studio';

interface Review {
  id: string;
  user_name: string;
  user_emoji: string;
  rating_overall: number;
  body: string | null;
  created_at: string;
}

interface Booking {
  id: string;
  studio_name: string;
  booking_date: string | null;
  booking_time: string | null;
  total_price: number | null;
  status: string;
  created_at: string;
}

interface EditForm {
  hours: string;
  phone: string;
  price_info: string;
  naver_place_url: string;
  kakao_channel: string;
}

export default function PartnerClient() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [studio, setStudio] = useState<Studio | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [noPartner, setNoPartner] = useState(false);

  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState<EditForm>({ hours: '', phone: '', price_info: '', naver_place_url: '', kakao_channel: '' });
  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login?next=/partner');
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    fetchPartnerData();
  }, [user]);

  async function fetchPartnerData() {
    setDataLoading(true);

    const { data: link } = await supabase
      .from('partner_studios')
      .select('studio_id')
      .eq('user_id', user!.id)
      .maybeSingle();

    if (!link) {
      setNoPartner(true);
      setDataLoading(false);
      return;
    }

    const { data: studioData } = await supabase
      .from('studios')
      .select('*')
      .eq('id', link.studio_id)
      .maybeSingle();

    if (!studioData) {
      setNoPartner(true);
      setDataLoading(false);
      return;
    }

    setStudio(studioData as Studio);
    setForm({
      hours: studioData.hours ?? '',
      phone: studioData.phone ?? '',
      price_info: studioData.price_info ?? '',
      naver_place_url: studioData.naver_place_url ?? '',
      kakao_channel: studioData.kakao_channel ?? '',
    });

    const [{ data: reviewData }, { data: bookingData }] = await Promise.all([
      supabase
        .from('studio_reviews')
        .select('id, user_name, user_emoji, rating_overall, body, created_at')
        .eq('studio_id', link.studio_id)
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('bookings')
        .select('id, studio_name, booking_date, booking_time, total_price, status, created_at')
        .eq('studio_id', link.studio_id)
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

    setReviews((reviewData as Review[]) ?? []);
    setBookings((bookingData as Booking[]) ?? []);
    setDataLoading(false);
  }

  async function handleSave() {
    if (!studio) return;
    setSaving(true);
    const { error } = await supabase
      .from('studios')
      .update({
        hours: form.hours || null,
        phone: form.phone || null,
        price_info: form.price_info || null,
        naver_place_url: form.naver_place_url || null,
        kakao_channel: form.kakao_channel || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', studio.id);

    setSaving(false);
    if (!error) {
      setStudio((prev) => prev ? { ...prev, ...form } : prev);
      setSaveOk(true);
      setEditMode(false);
      setTimeout(() => setSaveOk(false), 3000);
    }
  }

  if (loading || (!user && !loading)) {
    return (
      <div className="min-h-screen bg-[#FFF8F0] flex items-center justify-center">
        <p className="font-bold text-[#0A0A0A]/40" style={{ fontFamily: 'Pretendard, sans-serif' }}>
          로딩 중...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF8F0]">
      <Navigation />

      <div className="max-w-2xl mx-auto px-4 pt-6 pb-28">
        {/* 헤더 */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 22 }}
          className="mb-6"
        >
          <h1
            className="text-[28px] font-bold text-[#0A0A0A]"
            style={{ fontFamily: 'Bungee, sans-serif' }}
          >
            파트너 대시보드
          </h1>
          <p className="text-[13px] text-[#0A0A0A]/50 mt-1 font-bold" style={{ fontFamily: 'Pretendard, sans-serif' }}>
            내 연습실 정보를 관리하세요
          </p>
        </motion.div>

        {dataLoading ? (
          <div className="flex justify-center py-24">
            <div
              className="px-6 py-3 bg-[#F5FF4F] border-[3px] border-[#0A0A0A] font-bold text-[14px] animate-pulse"
              style={{ boxShadow: '4px 4px 0 #0A0A0A' }}
            >
              불러오는 중...
            </div>
          </div>
        ) : noPartner ? (
          <NoPartnerState />
        ) : studio ? (
          <PartnerDashboard
            studio={studio}
            reviews={reviews}
            bookings={bookings}
            editMode={editMode}
            form={form}
            saving={saving}
            saveOk={saveOk}
            onEditToggle={() => setEditMode((v) => !v)}
            onFormChange={(k, v) => setForm((prev) => ({ ...prev, [k]: v }))}
            onSave={handleSave}
          />
        ) : null}
      </div>
    </div>
  );
}

function NoPartnerState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      className="bg-white rounded-[20px] border-[3px] border-[#0A0A0A] p-8 text-center"
      style={{ boxShadow: '6px 6px 0 #0A0A0A' }}
    >
      <div className="text-[56px] mb-4">🎸</div>
      <h2
        className="text-[20px] font-bold text-[#0A0A0A] mb-2"
        style={{ fontFamily: 'Bungee, sans-serif' }}
      >
        연결된 연습실 없음
      </h2>
      <p
        className="text-[14px] text-[#0A0A0A]/60 font-bold mb-6 leading-relaxed"
        style={{ fontFamily: 'Pretendard, sans-serif' }}
      >
        아직 연습실이 연결되어 있지 않아요.<br />
        연습실 등록 신청 후 관리자 승인을 받으면<br />
        대시보드가 활성화됩니다.
      </p>
      <Link
        href="/register"
        className="inline-block px-6 py-3 bg-[#FF3D77] rounded-[12px] border-[3px] border-[#0A0A0A] text-white font-bold text-[14px]"
        style={{ boxShadow: '4px 4px 0 #0A0A0A', fontFamily: 'Pretendard, sans-serif' }}
      >
        연습실 등록 신청하기 →
      </Link>
    </motion.div>
  );
}

interface DashboardProps {
  studio: Studio;
  reviews: Review[];
  bookings: Booking[];
  editMode: boolean;
  form: EditForm;
  saving: boolean;
  saveOk: boolean;
  onEditToggle: () => void;
  onFormChange: (key: keyof EditForm, value: string) => void;
  onSave: () => void;
}

function PartnerDashboard({ studio, reviews, bookings, editMode, form, saving, saveOk, onEditToggle, onFormChange, onSave }: DashboardProps) {
  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.rating_overall, 0) / reviews.length).toFixed(1)
    : null;

  return (
    <div className="flex flex-col gap-5">
      {/* 저장 완료 토스트 */}
      {saveOk && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="fixed top-24 left-1/2 -translate-x-1/2 z-50 px-5 py-3 bg-[#41C66B] border-[3px] border-[#0A0A0A] text-white font-bold text-[14px] rounded-[12px]"
          style={{ boxShadow: '4px 4px 0 #0A0A0A', fontFamily: 'Pretendard, sans-serif' }}
        >
          ✅ 저장 완료!
        </motion.div>
      )}

      {/* 스튜디오 헤더 카드 */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, type: 'spring', stiffness: 260, damping: 22 }}
        className="bg-white rounded-[20px] border-[3px] border-[#0A0A0A] p-5"
        style={{ boxShadow: '6px 6px 0 #0A0A0A' }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <h2
              className="text-[20px] font-bold text-[#0A0A0A] leading-tight"
              style={{ fontFamily: 'Pretendard, sans-serif' }}
            >
              {studio.name}
            </h2>
            {studio.address && (
              <p className="text-[13px] text-[#0A0A0A]/50 mt-1 font-bold" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                📍 {studio.address}
              </p>
            )}
          </div>
          <Link
            href={`/room/${studio.id}`}
            target="_blank"
            className="flex-shrink-0 px-3 py-2 bg-[#FFF8F0] rounded-[10px] border-[2px] border-[#0A0A0A] text-[12px] font-bold text-[#0A0A0A]"
            style={{ boxShadow: '2px 2px 0 #0A0A0A', fontFamily: 'Pretendard, sans-serif' }}
          >
            미리보기 →
          </Link>
        </div>

        {/* 스탯 */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <StatBox label="뮤지션 리뷰" value={studio.review_count > 0 ? `${studio.review_count}개` : '-'} color="#FF3D77" />
          <StatBox label="평균 별점" value={studio.review_avg ? `⭐ ${studio.review_avg.toFixed(1)}` : (avgRating ? `⭐ ${avgRating}` : '-')} color="#F5FF4F" dark />
          <StatBox label="예약 내역" value={bookings.length > 0 ? `${bookings.length}건` : '-'} color="#4FC3F7" />
        </div>
      </motion.div>

      {/* 정보 수정 카드 */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 260, damping: 22 }}
        className="bg-white rounded-[20px] border-[3px] border-[#0A0A0A] p-5"
        style={{ boxShadow: '6px 6px 0 #0A0A0A' }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3
            className="text-[16px] font-bold text-[#0A0A0A]"
            style={{ fontFamily: 'Pretendard, sans-serif' }}
          >
            기본 정보
          </h3>
          <motion.button
            onClick={onEditToggle}
            whileTap={{ scale: 0.95, y: 1 }}
            className={`px-3 py-1.5 rounded-[8px] border-[2px] border-[#0A0A0A] text-[12px] font-bold transition-colors ${
              editMode ? 'bg-[#0A0A0A] text-white' : 'bg-[#F5FF4F] text-[#0A0A0A]'
            }`}
            style={{ boxShadow: '2px 2px 0 #0A0A0A', fontFamily: 'Pretendard, sans-serif' }}
          >
            {editMode ? '취소' : '✏️ 수정'}
          </motion.button>
        </div>

        {editMode ? (
          <div className="flex flex-col gap-3">
            {(
              [
                { key: 'hours', label: '🕐 영업시간', placeholder: '예) 10:00 - 22:00' },
                { key: 'phone', label: '📞 전화번호', placeholder: '예) 02-1234-5678' },
                { key: 'price_info', label: '💰 가격 안내', placeholder: '예) T룸 30분 10,000원' },
                { key: 'naver_place_url', label: '🗺️ 네이버플레이스 URL', placeholder: 'https://map.naver.com/...' },
                { key: 'kakao_channel', label: '💬 카카오채널 ID', placeholder: '@채널ID' },
              ] as const
            ).map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="block text-[12px] font-bold text-[#0A0A0A]/50 mb-1" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                  {label}
                </label>
                <input
                  type="text"
                  value={form[key]}
                  onChange={(e) => onFormChange(key, e.target.value)}
                  placeholder={placeholder}
                  className="w-full px-3 py-2.5 bg-[#FFF8F0] border-[2px] border-[#0A0A0A] rounded-[10px] text-[14px] font-bold placeholder:text-[#0A0A0A]/30 focus:outline-none focus:border-[#FF3D77]"
                  style={{ fontFamily: 'Pretendard, sans-serif' }}
                />
              </div>
            ))}

            <motion.button
              onClick={onSave}
              disabled={saving}
              whileTap={{ scale: 0.95, y: 1 }}
              className="w-full py-3 bg-[#FF3D77] rounded-[12px] border-[3px] border-[#0A0A0A] text-white font-bold text-[15px] mt-1 disabled:opacity-60"
              style={{ boxShadow: '4px 4px 0 #0A0A0A', fontFamily: 'Pretendard, sans-serif' }}
            >
              {saving ? '저장 중...' : '저장하기 💾'}
            </motion.button>
          </div>
        ) : (
          <dl className="flex flex-col gap-2.5">
            <InfoRow label="영업시간" value={studio.hours} />
            <InfoRow label="전화번호" value={studio.phone} />
            <InfoRow label="가격 안내" value={studio.price_info} />
            <InfoRow label="네이버플레이스" value={studio.naver_place_url} isLink />
            <InfoRow label="카카오채널" value={studio.kakao_channel} />
          </dl>
        )}
      </motion.div>

      {/* 최근 리뷰 */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, type: 'spring', stiffness: 260, damping: 22 }}
        className="bg-white rounded-[20px] border-[3px] border-[#0A0A0A] p-5"
        style={{ boxShadow: '6px 6px 0 #0A0A0A' }}
      >
        <h3
          className="text-[16px] font-bold text-[#0A0A0A] mb-4"
          style={{ fontFamily: 'Pretendard, sans-serif' }}
        >
          최근 뮤지션 리뷰
        </h3>
        {reviews.length === 0 ? (
          <p className="text-[13px] text-[#0A0A0A]/40 font-bold text-center py-6" style={{ fontFamily: 'Pretendard, sans-serif' }}>
            아직 리뷰가 없어요
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {reviews.map((r) => (
              <div key={r.id} className="bg-[#FFF8F0] rounded-[12px] p-3 border-[2px] border-[#0A0A0A]/10">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[18px]">{r.user_emoji}</span>
                  <span className="text-[13px] font-bold text-[#0A0A0A]" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                    {r.user_name}
                  </span>
                  <span className="ml-auto text-[12px] text-[#FF3D77] font-bold">
                    {'⭐'.repeat(Math.round(r.rating_overall))}
                  </span>
                </div>
                {r.body && (
                  <p className="text-[13px] text-[#0A0A0A]/70 font-bold leading-relaxed" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                    {r.body}
                  </p>
                )}
                <p className="text-[11px] text-[#0A0A0A]/30 mt-1" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                  {new Date(r.created_at).toLocaleDateString('ko-KR')}
                </p>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* 최근 예약 */}
      {bookings.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 260, damping: 22 }}
          className="bg-white rounded-[20px] border-[3px] border-[#0A0A0A] p-5"
          style={{ boxShadow: '6px 6px 0 #0A0A0A' }}
        >
          <h3
            className="text-[16px] font-bold text-[#0A0A0A] mb-4"
            style={{ fontFamily: 'Pretendard, sans-serif' }}
          >
            최근 예약 내역
          </h3>
          <div className="flex flex-col gap-2">
            {bookings.map((b) => (
              <div key={b.id} className="flex items-center gap-3 py-2 border-b border-[#0A0A0A]/10 last:border-0">
                <div className="flex-1">
                  <p className="text-[13px] font-bold text-[#0A0A0A]" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                    {b.booking_date ?? new Date(b.created_at).toLocaleDateString('ko-KR')}
                    {b.booking_time && ` ${b.booking_time}`}
                  </p>
                  {b.total_price && (
                    <p className="text-[12px] text-[#0A0A0A]/50 font-bold" style={{ fontFamily: 'Bungee, sans-serif' }}>
                      ₩{b.total_price.toLocaleString()}
                    </p>
                  )}
                </div>
                <span
                  className={`text-[11px] font-bold px-2 py-1 rounded-[6px] border-[2px] border-[#0A0A0A] ${
                    b.status === 'confirmed' ? 'bg-[#41C66B] text-white' : 'bg-[#F5FF4F] text-[#0A0A0A]'
                  }`}
                >
                  {b.status === 'confirmed' ? '확정' : b.status === 'pending' ? '대기' : b.status}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}

function StatBox({ label, value, color, dark }: { label: string; value: string; color: string; dark?: boolean }) {
  return (
    <div
      className="rounded-[14px] border-[2px] border-[#0A0A0A] px-3 py-3 text-center"
      style={{ backgroundColor: color, boxShadow: '3px 3px 0 #0A0A0A' }}
    >
      <p className={`text-[16px] font-bold ${dark ? 'text-[#0A0A0A]' : 'text-white'}`} style={{ fontFamily: 'Bungee, sans-serif' }}>
        {value}
      </p>
      <p className={`text-[10px] font-bold mt-0.5 ${dark ? 'text-[#0A0A0A]/60' : 'text-white/80'}`} style={{ fontFamily: 'Pretendard, sans-serif' }}>
        {label}
      </p>
    </div>
  );
}

function InfoRow({ label, value, isLink }: { label: string; value: string | null | undefined; isLink?: boolean }) {
  if (!value) return null;
  return (
    <div className="flex gap-3">
      <dt className="text-[13px] text-[#0A0A0A]/40 font-bold w-24 flex-shrink-0" style={{ fontFamily: 'Pretendard, sans-serif' }}>
        {label}
      </dt>
      <dd className="flex-1 text-[13px] font-bold text-[#0A0A0A]" style={{ fontFamily: 'Pretendard, sans-serif' }}>
        {isLink ? (
          <a href={value} target="_blank" rel="noopener noreferrer" className="text-[#4FC3F7] underline underline-offset-2 break-all">
            {value}
          </a>
        ) : value}
      </dd>
    </div>
  );
}
