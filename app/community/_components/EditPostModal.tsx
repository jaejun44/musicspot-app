'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Category, Post } from '../_data/posts';

const CATEGORIES: { value: Category; emoji: string; color: string }[] = [
  { value: '후기', emoji: '⭐', color: '#00D26A' },
  { value: '구인', emoji: '🎤', color: '#FF3D77' },
  { value: '자유', emoji: '💬', color: '#FFD600' },
  { value: '질문', emoji: '🙋', color: '#4FC3F7' },
];

interface Props {
  user: { id: string } | null;
  post: Post;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditPostModal({ user, post, onClose, onSuccess }: Props) {
  const [category, setCategory] = useState<Category>(post.category);
  const [title, setTitle] = useState(post.title);
  const [body, setBody] = useState(post.body);
  const [tagsInput, setTagsInput] = useState(post.tags.join(' '));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    if (!title.trim()) { setError('제목을 입력해주세요'); return; }
    if (!body.trim()) { setError('내용을 입력해주세요'); return; }
    setError('');
    setSubmitting(true);

    const tags = tagsInput
      .split(/[,\s]+/)
      .map((t) => t.replace(/^#/, '').trim())
      .filter(Boolean);

    const { error: dbErr } = await supabase
      .from('posts')
      .update({ category, title: title.trim(), body: body.trim(), tags })
      .eq('id', post.id)
      .eq('author_id', user!.id);

    setSubmitting(false);
    if (dbErr) { setError('저장 중 오류가 발생했어요. 다시 시도해주세요.'); return; }
    onSuccess();
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-[#0A0A0A]/60 flex items-end md:items-center justify-center px-0 md:px-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 28 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full md:max-w-lg bg-[#FFF8F0] rounded-t-[28px] md:rounded-[28px] border-[3px] border-[#0A0A0A] pb-8"
          style={{ boxShadow: '0 -6px 0 #0A0A0A' }}
        >
          <div className="flex justify-center pt-3 pb-1 md:hidden">
            <div className="w-10 h-1 bg-[#0A0A0A]/20 rounded-full" />
          </div>

          <div className="flex items-center justify-between px-5 pt-3 pb-4 border-b-[2px] border-[#0A0A0A]/10">
            <h2
              className="text-[20px] font-bold text-[#0A0A0A]"
              style={{ fontFamily: 'Bungee, sans-serif' }}
            >
              EDIT POST ✏️
            </h2>
            <motion.button
              onClick={onClose}
              whileTap={{ scale: 0.9 }}
              className="w-8 h-8 flex items-center justify-center rounded-full border-[2px] border-[#0A0A0A] bg-white"
              style={{ boxShadow: '2px 2px 0 #0A0A0A' }}
            >
              <X className="w-4 h-4" />
            </motion.button>
          </div>

          <div className="px-5 pt-5 space-y-4">
            {/* 카테고리 */}
            <div>
              <p className="text-[12px] font-bold text-[#0A0A0A]/50 mb-2" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                카테고리
              </p>
              <div className="flex gap-2 flex-wrap">
                {CATEGORIES.map((cat) => (
                  <motion.button
                    key={cat.value}
                    type="button"
                    onClick={() => setCategory(cat.value)}
                    whileTap={{ scale: 0.95 }}
                    className="px-4 py-2 rounded-[12px] border-[2px] border-[#0A0A0A] text-[13px] font-bold transition-colors"
                    style={{
                      backgroundColor: category === cat.value ? cat.color : '#FFFFFF',
                      color: category === cat.value && cat.value === '자유' ? '#0A0A0A' : category === cat.value ? '#FFFFFF' : '#0A0A0A',
                      boxShadow: category === cat.value ? '3px 3px 0 #0A0A0A' : '2px 2px 0 #0A0A0A',
                      fontFamily: 'Pretendard, sans-serif',
                    }}
                  >
                    {cat.emoji} {cat.value}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* 제목 */}
            <div>
              <p className="text-[12px] font-bold text-[#0A0A0A]/50 mb-2" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                제목
              </p>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={60}
                className="w-full px-4 py-3 bg-white border-[2px] border-[#0A0A0A] rounded-[14px] text-[14px] font-bold text-[#0A0A0A] outline-none placeholder:text-[#0A0A0A]/30 focus:border-[#FF3D77]"
                style={{ fontFamily: 'Pretendard, sans-serif', boxShadow: '2px 2px 0 #0A0A0A' }}
              />
            </div>

            {/* 본문 */}
            <div>
              <p className="text-[12px] font-bold text-[#0A0A0A]/50 mb-2" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                내용
              </p>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={1000}
                rows={4}
                className="w-full px-4 py-3 bg-white border-[2px] border-[#0A0A0A] rounded-[14px] text-[14px] font-bold text-[#0A0A0A] outline-none placeholder:text-[#0A0A0A]/30 focus:border-[#FF3D77] resize-none"
                style={{ fontFamily: 'Pretendard, sans-serif', boxShadow: '2px 2px 0 #0A0A0A' }}
              />
              <p className="text-right text-[11px] text-[#0A0A0A]/30 mt-1 font-bold" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                {body.length}/1000
              </p>
            </div>

            {/* 태그 */}
            <div>
              <p className="text-[12px] font-bold text-[#0A0A0A]/50 mb-2" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                태그 <span className="text-[#0A0A0A]/30">(선택, 공백 또는 쉼표로 구분)</span>
              </p>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                className="w-full px-4 py-3 bg-white border-[2px] border-[#0A0A0A] rounded-[14px] text-[14px] font-bold text-[#0A0A0A] outline-none placeholder:text-[#0A0A0A]/30 focus:border-[#FF3D77]"
                style={{ fontFamily: 'Pretendard, sans-serif', boxShadow: '2px 2px 0 #0A0A0A' }}
              />
            </div>

            {error && (
              <p className="text-[13px] font-bold text-[#FF3D77]" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                {error}
              </p>
            )}

            <motion.button
              onClick={handleSubmit}
              disabled={submitting}
              whileTap={submitting ? undefined : { scale: 0.97, y: 2 }}
              className="w-full py-4 bg-[#FF3D77] rounded-[16px] border-[3px] border-[#0A0A0A] text-white font-bold text-[16px] disabled:opacity-60"
              style={{ boxShadow: '4px 4px 0 #0A0A0A', fontFamily: 'Bungee, sans-serif' }}
            >
              {submitting ? '저장 중...' : '수정 완료 💥'}
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
