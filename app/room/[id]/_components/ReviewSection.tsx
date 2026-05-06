'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface Review {
  id: string;
  user_id: string;
  author: string;
  rating_overall: number;
  rating_soundproof: number | null;
  rating_gear: number | null;
  rating_cleanliness: number | null;
  tags: string[];
  body: string | null;
  created_at: string;
}

const MUSICIAN_TAGS = [
  '드럼킷 상태 좋음', '앰프 세팅 편함', '기타 앰프 있음', '베이스 앰프 있음',
  '키보드/신스 있음', '마이크 세팅 좋음', '모니터 스피커 좋음', '믹서 있음',
  '주차 가능', '24시간 운영', '예약 쉬움', '스태프 친절',
];

const SUB_RATINGS = [
  { key: 'rating_soundproof', label: '방음', emoji: '🔇' },
  { key: 'rating_gear', label: '장비', emoji: '🎸' },
  { key: 'rating_cleanliness', label: '청결', emoji: '✨' },
] as const;

function StarRow({
  value,
  onChange,
  size = 'md',
}: {
  value: number;
  onChange?: (v: number) => void;
  size?: 'sm' | 'md' | 'lg';
}) {
  const [hovered, setHovered] = useState(0);
  const sz = size === 'lg' ? 'text-[32px]' : size === 'sm' ? 'text-[16px]' : 'text-[22px]';
  const display = onChange ? (hovered || value) : value;

  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className={`${sz} leading-none cursor-pointer select-none transition-transform active:scale-125`}
          style={{ filter: n <= display ? 'none' : 'grayscale(1) opacity(0.3)' }}
          onMouseEnter={() => onChange && setHovered(n)}
          onMouseLeave={() => onChange && setHovered(0)}
          onClick={() => onChange?.(n)}
        >
          ⭐
        </span>
      ))}
    </div>
  );
}

function ReviewCard({ review }: { review: Review }) {
  const date = new Date(review.created_at).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'short', day: 'numeric',
  });

  return (
    <div
      className="bg-white rounded-[16px] border-[2px] border-[#0A0A0A] p-4"
      style={{ boxShadow: '3px 3px 0 #0A0A0A' }}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <span className="text-[13px] font-bold text-[#0A0A0A]" style={{ fontFamily: 'Pretendard, sans-serif' }}>
            {review.author}
          </span>
          <div className="flex items-center gap-2 mt-0.5">
            <StarRow value={review.rating_overall} size="sm" />
            <span className="text-[11px] text-[#0A0A0A]/40 font-bold" style={{ fontFamily: 'Pretendard, sans-serif' }}>
              {date}
            </span>
          </div>
        </div>
      </div>

      {/* Sub ratings */}
      {(review.rating_soundproof || review.rating_gear || review.rating_cleanliness) ? (
        <div className="flex gap-3 mb-2 flex-wrap">
          {SUB_RATINGS.map(({ key, label, emoji }) => {
            const val = review[key];
            if (!val) return null;
            return (
              <div key={key} className="flex items-center gap-1">
                <span className="text-[12px]">{emoji}</span>
                <span className="text-[11px] font-bold text-[#0A0A0A]/60" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                  {label}
                </span>
                <StarRow value={val} size="sm" />
              </div>
            );
          })}
        </div>
      ) : null}

      {/* Tags */}
      {review.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {review.tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 bg-[#F5FF4F] border-[1.5px] border-[#0A0A0A] rounded-[6px] text-[11px] font-bold text-[#0A0A0A]"
              style={{ fontFamily: 'Pretendard, sans-serif' }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {review.body && (
        <p className="text-[13px] text-[#0A0A0A]/70 leading-relaxed" style={{ fontFamily: 'Pretendard, sans-serif' }}>
          {review.body}
        </p>
      )}
    </div>
  );
}

function WriteReviewModal({
  studioId,
  user,
  onClose,
  onSaved,
}: {
  studioId: string;
  user: { id: string; user_metadata?: Record<string, string>; email?: string };
  onClose: () => void;
  onSaved: () => void;
}) {
  const [overall, setOverall] = useState(0);
  const [soundproof, setSoundproof] = useState(0);
  const [gear, setGear] = useState(0);
  const [cleanliness, setCleanliness] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  async function handleSubmit() {
    if (overall === 0) { setErr('전체 별점을 선택해 주세요.'); return; }
    setSaving(true);
    setErr('');
    const author = user.user_metadata?.full_name || user.email?.split('@')[0] || '뮤지션';
    const { error } = await supabase.from('studio_reviews').insert({
      studio_id: studioId,
      user_id: user.id,
      author,
      rating_overall: overall,
      rating_soundproof: soundproof || null,
      rating_gear: gear || null,
      rating_cleanliness: cleanliness || null,
      tags: selectedTags,
      body: body.trim() || null,
    });
    setSaving(false);
    if (error) { setErr('저장에 실패했어요. 다시 시도해 주세요.'); return; }
    onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#0A0A0A]/60 flex items-end sm:items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 60 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="w-full sm:max-w-lg bg-[#FFF8F0] rounded-t-[24px] sm:rounded-[24px] border-[3px] border-[#0A0A0A] max-h-[90vh] overflow-y-auto"
        style={{ boxShadow: '0 -6px 0 #0A0A0A' }}
      >
        {/* Header */}
        <div className="sticky top-0 bg-[#FFF8F0] px-5 pt-5 pb-3 border-b-[2px] border-[#0A0A0A]/10 z-10 flex items-center justify-between">
          <div>
            <h2 className="text-[18px] font-bold text-[#0A0A0A]" style={{ fontFamily: 'Bungee, sans-serif' }}>
              REVIEW ⭐
            </h2>
            <p className="text-[12px] text-[#0A0A0A]/50 font-bold mt-0.5" style={{ fontFamily: 'Pretendard, sans-serif' }}>
              실제 이용 경험을 남겨주세요
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#0A0A0A]/10 flex items-center justify-center"
          >
            <span className="text-[16px] leading-none">✕</span>
          </button>
        </div>

        <div className="px-5 py-5 flex flex-col gap-5">
          {/* Overall */}
          <section>
            <p className="text-[13px] font-bold text-[#0A0A0A] mb-2" style={{ fontFamily: 'Pretendard, sans-serif' }}>
              🌟 전체 별점 <span className="text-[#FF3D77]">*</span>
            </p>
            <StarRow value={overall} onChange={setOverall} size="lg" />
          </section>

          {/* Sub ratings */}
          <section>
            <p className="text-[13px] font-bold text-[#0A0A0A] mb-3" style={{ fontFamily: 'Pretendard, sans-serif' }}>
              세부 평가 <span className="text-[#0A0A0A]/40">(선택)</span>
            </p>
            <div className="flex flex-col gap-3">
              {[
                { label: '방음', emoji: '🔇', val: soundproof, set: setSoundproof },
                { label: '장비', emoji: '🎸', val: gear, set: setGear },
                { label: '청결', emoji: '✨', val: cleanliness, set: setCleanliness },
              ].map(({ label, emoji, val, set }) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="text-[14px] w-5">{emoji}</span>
                  <span className="text-[13px] font-bold text-[#0A0A0A] w-8" style={{ fontFamily: 'Pretendard, sans-serif' }}>{label}</span>
                  <StarRow value={val} onChange={set} size="md" />
                  {val > 0 && (
                    <button onClick={() => set(0)} className="text-[11px] text-[#0A0A0A]/30 font-bold" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                      초기화
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Tags */}
          <section>
            <p className="text-[13px] font-bold text-[#0A0A0A] mb-3" style={{ fontFamily: 'Pretendard, sans-serif' }}>
              🏷️ 태그 <span className="text-[#0A0A0A]/40">(복수 선택)</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {MUSICIAN_TAGS.map((tag) => {
                const active = selectedTags.includes(tag);
                return (
                  <motion.button
                    key={tag}
                    whileTap={{ scale: 0.94 }}
                    onClick={() => toggleTag(tag)}
                    className={[
                      'px-3 py-1.5 rounded-[10px] border-[2px] border-[#0A0A0A] text-[12px] font-bold',
                      active ? 'bg-[#F5FF4F] text-[#0A0A0A]' : 'bg-white text-[#0A0A0A]',
                    ].join(' ')}
                    style={{ boxShadow: '2px 2px 0 #0A0A0A', fontFamily: 'Pretendard, sans-serif' }}
                  >
                    {tag}
                  </motion.button>
                );
              })}
            </div>
          </section>

          {/* Body */}
          <section>
            <p className="text-[13px] font-bold text-[#0A0A0A] mb-2" style={{ fontFamily: 'Pretendard, sans-serif' }}>
              💬 한 줄 리뷰 <span className="text-[#0A0A0A]/40">(선택 · 최대 200자)</span>
            </p>
            <textarea
              placeholder="예) 방음이 정말 잘 돼서 마음껏 연주할 수 있었어요!"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={200}
              rows={3}
              className="w-full px-4 py-3 bg-white border-[2px] border-[#0A0A0A] rounded-[14px] text-[13px] font-bold text-[#0A0A0A] resize-none focus:outline-none focus:border-[#FF3D77]"
              style={{ boxShadow: '2px 2px 0 #0A0A0A', fontFamily: 'Pretendard, sans-serif' }}
            />
            <p className="text-right text-[11px] text-[#0A0A0A]/30 mt-1 font-bold" style={{ fontFamily: 'Pretendard, sans-serif' }}>
              {body.length}/200
            </p>
          </section>

          {err && (
            <p className="text-[13px] font-bold text-[#FF3D77] text-center" style={{ fontFamily: 'Pretendard, sans-serif' }}>
              ⚠️ {err}
            </p>
          )}

          <motion.button
            onClick={handleSubmit}
            disabled={saving}
            whileTap={{ scale: 0.96, y: 2 }}
            className="w-full py-4 bg-[#FF3D77] text-white rounded-[16px] border-[3px] border-[#0A0A0A] font-bold text-[15px] flex items-center justify-center gap-2 disabled:opacity-60"
            style={{ boxShadow: '4px 4px 0 #0A0A0A', fontFamily: 'Bungee, sans-serif' }}
          >
            {saving ? (
              <>
                <span className="w-4 h-4 rounded-full border-[2px] border-white border-t-transparent animate-spin" />
                저장 중...
              </>
            ) : '리뷰 등록하기 💥'}
          </motion.button>
          <div className="h-2" />
        </div>
      </motion.div>
    </div>
  );
}

export default function ReviewSection({ studioId, onReviewSaved }: { studioId: string; onReviewSaved?: () => void }) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [myReviewId, setMyReviewId] = useState<string | null>(null);

  const fetchReviews = useCallback(async () => {
    setLoadingReviews(true);
    const { data } = await supabase
      .from('studio_reviews')
      .select('*')
      .eq('studio_id', studioId)
      .order('created_at', { ascending: false });
    setReviews(data ?? []);
    setLoadingReviews(false);
  }, [studioId]);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  useEffect(() => {
    if (!user || reviews.length === 0) { setMyReviewId(null); return; }
    const mine = reviews.find((r) => r.user_id === user.id);
    setMyReviewId(mine?.id ?? null);
  }, [user, reviews]);

  const avg = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating_overall, 0) / reviews.length).toFixed(1)
    : null;

  return (
    <>
      <div
        className="bg-white rounded-[20px] border-[3px] border-[#0A0A0A] p-5"
        style={{ boxShadow: '6px 6px 0 #0A0A0A' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-[15px] font-bold text-[#0A0A0A]" style={{ fontFamily: 'Pretendard, sans-serif' }}>
              ⭐ 뮤지션 리뷰
            </h2>
            {avg && (
              <div
                className="px-2 py-0.5 bg-[#FF3D77] rounded-[8px] border-[2px] border-[#0A0A0A] flex items-center gap-1"
                style={{ boxShadow: '2px 2px 0 #0A0A0A' }}
              >
                <span className="text-white text-[13px] font-bold" style={{ fontFamily: 'Bungee, sans-serif' }}>
                  {avg}
                </span>
                <span className="text-white text-[11px] font-bold" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                  ({reviews.length})
                </span>
              </div>
            )}
          </div>

          {user ? (
            myReviewId ? (
              <span className="text-[12px] font-bold text-[#41C66B]" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                ✅ 리뷰 작성 완료
              </span>
            ) : (
              <motion.button
                whileTap={{ scale: 0.95, y: 1 }}
                onClick={() => setShowModal(true)}
                className="px-3 py-2 bg-[#FF3D77] text-white rounded-[10px] border-[2px] border-[#0A0A0A] text-[12px] font-bold"
                style={{ boxShadow: '2px 2px 0 #0A0A0A', fontFamily: 'Pretendard, sans-serif' }}
              >
                + 리뷰 쓰기
              </motion.button>
            )
          ) : (
            <span className="text-[12px] font-bold text-[#0A0A0A]/40" style={{ fontFamily: 'Pretendard, sans-serif' }}>
              로그인 후 작성 가능
            </span>
          )}
        </div>

        {/* Reviews */}
        {loadingReviews ? (
          <div className="flex justify-center py-6">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 0.9, ease: 'linear' }}
              className="w-7 h-7 rounded-full border-[2px] border-[#FF3D77] border-t-transparent"
            />
          </div>
        ) : reviews.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <span className="text-[32px]">🎸</span>
            <p className="text-[13px] font-bold text-[#0A0A0A]/40 text-center" style={{ fontFamily: 'Pretendard, sans-serif' }}>
              아직 리뷰가 없어요<br />첫 리뷰를 남겨보세요!
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {reviews.map((r) => (
              <ReviewCard key={r.id} review={r} />
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showModal && user && (
          <WriteReviewModal
            studioId={studioId}
            user={user}
            onClose={() => setShowModal(false)}
            onSaved={() => { fetchReviews(); onReviewSaved?.(); }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
