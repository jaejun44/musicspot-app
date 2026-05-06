'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';

interface Comment {
  id: string;
  user_id: string;
  user_name: string;
  user_emoji: string;
  user_avatar_url?: string | null;
  body: string;
  created_at: string;
}

interface Props {
  postId: string;
  currentUserId?: string;
  currentUserName?: string;
  currentUserEmoji?: string;
  currentUserAvatarUrl?: string;
  onCommentAdded?: () => void;
}

export default function CommentSection({
  postId, currentUserId, currentUserName, currentUserEmoji, currentUserAvatarUrl, onCommentAdded,
}: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    supabase
      .from('post_comments')
      .select('id, user_id, user_name, user_emoji, user_avatar_url, body, created_at')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
      .then(({ data }) => setComments((data ?? []) as Comment[]));
  }, [postId]);

  async function submitComment() {
    if (!currentUserId || !body.trim()) return;
    setSubmitting(true);
    const { data, error } = await supabase
      .from('post_comments')
      .insert({
        post_id: postId,
        user_id: currentUserId,
        user_name: currentUserName ?? '뮤지션',
        user_emoji: currentUserEmoji ?? '🎵',
        user_avatar_url: currentUserAvatarUrl ?? null,
        body: body.trim(),
      })
      .select()
      .single();
    if (!error && data) {
      setComments((prev) => [...prev, data as Comment]);
      onCommentAdded?.();
    }
    setBody('');
    setSubmitting(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitComment();
    }
  }

  return (
    <div className="border-t-[1px] border-[#0A0A0A]/10 pt-3 flex flex-col gap-3">
      {/* 댓글 목록 */}
      {comments.length === 0 ? (
        <p
          className="text-[12px] text-[#0A0A0A]/30 font-bold text-center py-2"
          style={{ fontFamily: 'Pretendard, sans-serif' }}
        >
          아직 댓글이 없어요. 첫 댓글을 남겨보세요!
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-2">
              <div className="flex-shrink-0 w-7 h-7 flex items-center justify-center">
                {c.user_avatar_url ? (
                  <img
                    src={c.user_avatar_url}
                    alt={c.user_name}
                    className="w-7 h-7 rounded-full border border-[#0A0A0A]/20 object-cover"
                  />
                ) : (
                  <span className="text-[16px]">{c.user_emoji}</span>
                )}
              </div>
              <div className="flex-1 bg-[#FFF8F0] rounded-[12px] px-3 py-2">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span
                    className="text-[11px] font-bold text-[#0A0A0A]/70"
                    style={{ fontFamily: 'Pretendard, sans-serif' }}
                  >
                    {c.user_name}
                  </span>
                  <span
                    className="text-[10px] text-[#0A0A0A]/30 font-bold"
                    style={{ fontFamily: 'Pretendard, sans-serif' }}
                  >
                    {c.created_at.slice(0, 10)}
                  </span>
                </div>
                <p
                  className="text-[12px] text-[#0A0A0A]/70 font-bold leading-relaxed"
                  style={{ fontFamily: 'Pretendard, sans-serif' }}
                >
                  {c.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 댓글 입력창 */}
      {currentUserId ? (
        <div className="flex gap-2">
          <div className="flex-shrink-0 w-7 h-7 flex items-center justify-center mt-1">
            {currentUserAvatarUrl ? (
              <img
                src={currentUserAvatarUrl}
                alt="나"
                className="w-7 h-7 rounded-full border border-[#0A0A0A]/20 object-cover"
              />
            ) : (
              <span className="text-[16px]">{currentUserEmoji ?? '🎵'}</span>
            )}
          </div>
          <div className="flex-1 flex gap-2">
            <textarea
              ref={textareaRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="댓글을 입력하세요... (Enter로 전송)"
              rows={1}
              className="flex-1 px-3 py-2 bg-[#FFF8F0] border-[2px] border-[#0A0A0A]/20 rounded-[12px] text-[12px] font-bold text-[#0A0A0A] placeholder-[#0A0A0A]/30 resize-none focus:outline-none focus:border-[#0A0A0A]/50"
              style={{ fontFamily: 'Pretendard, sans-serif', minHeight: '36px' }}
            />
            <motion.button
              onClick={submitComment}
              disabled={!body.trim() || submitting}
              whileTap={{ scale: 0.9 }}
              className="px-3 py-2 bg-[#FF3D77] text-white text-[12px] font-bold rounded-[12px] border-[2px] border-[#0A0A0A] disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
              style={{ boxShadow: '2px 2px 0 #0A0A0A', fontFamily: 'Bungee, sans-serif' }}
            >
              전송
            </motion.button>
          </div>
        </div>
      ) : (
        <p
          className="text-[12px] text-[#0A0A0A]/30 font-bold text-center py-1"
          style={{ fontFamily: 'Pretendard, sans-serif' }}
        >
          댓글을 달려면 로그인하세요
        </p>
      )}
    </div>
  );
}
