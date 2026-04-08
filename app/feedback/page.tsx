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
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <p className="text-4xl mb-4">🎸</p>
        <h2 className="text-xl font-bold mb-2">소중한 의견 감사합니다</h2>
        <p className="text-brand-muted text-sm mb-6">
          더 나은 Music Spot을 만드는 데 큰 힘이 됩니다
        </p>
        <button
          onClick={() => router.push('/')}
          className="px-6 py-2.5 bg-brand-red text-white text-sm font-semibold rounded-xl"
        >
          홈으로 돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-8 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => router.back()} className="text-brand-muted">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-lg font-bold">Music Spot에 한마디</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Rating */}
        <div>
          <label className="text-xs text-brand-muted block mb-2">
            별점 (선택사항)
          </label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star === rating ? 0 : star)}
                className="text-2xl transition-transform hover:scale-110"
              >
                {star <= rating ? '★' : '☆'}
              </button>
            ))}
          </div>
        </div>

        {/* Name */}
        <div>
          <label className="text-xs text-brand-muted block mb-1.5">이름 (선택사항)</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="익명"
            className="w-full px-3 py-2.5 bg-brand-card border border-brand-border rounded-lg text-sm placeholder:text-brand-muted focus:outline-none focus:border-brand-red"
          />
        </div>

        {/* Content */}
        <div>
          <label className="text-xs text-brand-muted block mb-1.5">내용</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="서비스 이용 후 느낀 점을 자유롭게 적어주세요"
            rows={5}
            required
            className="w-full px-3 py-2.5 bg-brand-card border border-brand-border rounded-lg text-sm placeholder:text-brand-muted focus:outline-none focus:border-brand-red resize-none"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting || !content.trim()}
          className="w-full py-3 bg-brand-red text-white font-semibold rounded-xl disabled:opacity-50"
        >
          {submitting ? '제출 중...' : '제출하기'}
        </button>
      </form>
    </div>
  );
}
