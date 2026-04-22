'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function FeedbackPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [rating, setRating] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;

    setSubmitting(true);
    const { error } = await supabase.from('feedbacks').insert({
      name: name.trim() || '익명',
      content: content.trim(),
      rating: rating || null,
      page_path: '/feedback',
    });

    setSubmitting(false);
    if (!error) {
      setSubmitted(true);
    } else {
      alert('제출에 실패했습니다. 다시 시도해주세요.');
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-comic-cream flex flex-col items-center justify-center px-6 text-center gap-4">
        <div
          className="bg-comic-yellow border-[3px] border-comic-black px-10 py-8"
          style={{ boxShadow: '6px 6px 0 #FF3D77' }}
        >
          <p className="text-5xl mb-3">🎸</p>
          <p className="font-bungee text-2xl text-comic-black mb-1">THANKS!</p>
          <p className="text-sm font-bold text-comic-black/70">
            더 나은 Music Spot을 만드는 데 큰 힘이 됩니다
          </p>
        </div>
        <button
          onClick={() => router.push('/')}
          className="px-6 py-3 bg-comic-pink border-[2px] border-comic-black text-white text-sm font-bold transition-transform active:translate-x-[2px] active:translate-y-[2px]"
          style={{ boxShadow: '3px 3px 0 #0A0A0A' }}
        >
          홈으로 돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-comic-cream pb-10">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-comic-cream border-b-[3px] border-comic-black px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="w-8 h-8 flex items-center justify-center border-[2px] border-comic-black bg-white"
          style={{ boxShadow: '2px 2px 0 #0A0A0A' }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-base font-bold">💬 Music Spot에 한마디</h1>
      </div>

      <form onSubmit={handleSubmit} className="px-4 mt-6 space-y-5 max-w-lg mx-auto">
        {/* Rating */}
        <div
          className="bg-white border-[2px] border-comic-black p-4"
          style={{ boxShadow: '3px 3px 0 #0A0A0A' }}
        >
          <label className="text-xs font-bold text-comic-black/50 block mb-3">⭐ 별점 (선택사항)</label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star === rating ? 0 : star)}
                className="text-3xl transition-transform hover:scale-110 active:scale-125"
              >
                {star <= rating ? '★' : '☆'}
              </button>
            ))}
          </div>
        </div>

        {/* Name */}
        <div>
          <label className="text-xs font-bold text-comic-black/50 block mb-1.5">이름 (선택사항)</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="익명"
            className="w-full px-3 py-2.5 bg-white border-[2px] border-comic-black text-sm font-medium placeholder:text-comic-black/30 focus:outline-none focus:border-comic-pink"
          />
        </div>

        {/* Content */}
        <div>
          <label className="text-xs font-bold text-comic-black/50 block mb-1.5">내용 *</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="서비스 이용 후 느낀 점을 자유롭게 적어주세요"
            rows={5}
            required
            className="w-full px-3 py-2.5 bg-white border-[2px] border-comic-black text-sm font-medium placeholder:text-comic-black/30 focus:outline-none focus:border-comic-pink resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={submitting || !content.trim()}
          className="w-full py-3 bg-comic-pink border-[2px] border-comic-black text-white font-bold disabled:opacity-50 transition-transform active:translate-x-[2px] active:translate-y-[2px]"
          style={{ boxShadow: '3px 3px 0 #0A0A0A' }}
        >
          {submitting ? '제출 중...' : '제출하기'}
        </button>
      </form>
    </div>
  );
}
