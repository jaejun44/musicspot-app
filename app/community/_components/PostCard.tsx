'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { Post } from '../_data/posts';

const CATEGORY_STYLE: Record<Post['category'], { bg: string; text: string }> = {
  후기: { bg: '#00D26A', text: '#FFFFFF' },
  구인: { bg: '#FF3D77', text: '#FFFFFF' },
  자유: { bg: '#FFD600', text: '#0A0A0A' },
  질문: { bg: '#4FC3F7', text: '#0A0A0A' },
};

const LIKE_KEY = (id: string) => `musicspot_like_${id}`;

interface Props {
  post: Post;
  index: number;
  currentUserId?: string;
  onEdit?: () => void;
  onDelete?: () => void;
}

export default function PostCard({ post, index, currentUserId, onEdit, onDelete }: Props) {
  const [liked, setLiked] = useState(false);
  const parsed = parseInt(post.id);
  const [likeCount, setLikeCount] = useState(isNaN(parsed) ? 5 : Math.floor(parsed * 7 + 3));
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const rotate = index % 3 === 0 ? -1 : index % 3 === 1 ? 0 : 1;
  const style = CATEGORY_STYLE[post.category];
  const isOwn = !!currentUserId && currentUserId === post.author_id;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setConfirmDelete(false);
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  useEffect(() => {
    setLiked(localStorage.getItem(LIKE_KEY(post.id)) === '1');
  }, [post.id]);

  function toggleLike() {
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => c + (next ? 1 : -1));
    if (next) {
      localStorage.setItem(LIKE_KEY(post.id), '1');
    } else {
      localStorage.removeItem(LIKE_KEY(post.id));
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, type: 'spring', stiffness: 260, damping: 22 }}
      whileHover={{ y: -4, rotate: rotate + 0.5, boxShadow: '7px 7px 0 #0A0A0A' }}
      style={{ rotate, boxShadow: '5px 5px 0 #0A0A0A' }}
      className="bg-white rounded-[20px] border-[3px] border-[#0A0A0A] p-4 flex flex-col gap-3"
    >
      {/* 카테고리 + 날짜 + 메뉴 */}
      <div className="flex items-center justify-between">
        <span
          className="px-2.5 py-1 rounded-[8px] border-[2px] border-[#0A0A0A] text-[11px] font-bold"
          style={{ backgroundColor: style.bg, color: style.text, fontFamily: 'Pretendard, sans-serif', boxShadow: '1px 1px 0 #0A0A0A' }}
        >
          {post.category}
        </span>
        <div className="flex items-center gap-2">
          <span
            className="text-[11px] text-[#0A0A0A]/30 font-bold"
            style={{ fontFamily: 'Pretendard, sans-serif' }}
          >
            {post.createdAt}
          </span>
          {isOwn && (
            <div className="relative" ref={menuRef}>
              <motion.button
                onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); setConfirmDelete(false); }}
                whileTap={{ scale: 0.85 }}
                className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#0A0A0A]/8 transition-colors"
              >
                <MoreVertical className="w-4 h-4 text-[#0A0A0A]/40" />
              </motion.button>
              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: -4 }}
                    transition={{ duration: 0.12 }}
                    className="absolute right-0 top-8 z-20 bg-white border-[2px] border-[#0A0A0A] rounded-[12px] overflow-hidden min-w-[120px]"
                    style={{ boxShadow: '3px 3px 0 #0A0A0A' }}
                  >
                    {!confirmDelete ? (
                      <>
                        <button
                          onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onEdit?.(); }}
                          className="w-full flex items-center gap-2 px-4 py-2.5 text-[13px] font-bold text-[#0A0A0A] hover:bg-[#FFF8F0] transition-colors"
                          style={{ fontFamily: 'Pretendard, sans-serif' }}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          수정
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }}
                          className="w-full flex items-center gap-2 px-4 py-2.5 text-[13px] font-bold text-[#FF3D77] hover:bg-[#FF3D77]/8 transition-colors border-t border-[#0A0A0A]/10"
                          style={{ fontFamily: 'Pretendard, sans-serif' }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          삭제
                        </button>
                      </>
                    ) : (
                      <div className="px-4 py-3">
                        <p className="text-[12px] font-bold text-[#0A0A0A] mb-2" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                          정말 삭제할까요?
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); setMenuOpen(false); setConfirmDelete(false); onDelete?.(); }}
                            className="flex-1 py-1.5 bg-[#FF3D77] text-white text-[11px] font-bold rounded-[8px] border border-[#0A0A0A]"
                            style={{ fontFamily: 'Pretendard, sans-serif' }}
                          >
                            삭제
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setConfirmDelete(false); }}
                            className="flex-1 py-1.5 bg-white text-[#0A0A0A] text-[11px] font-bold rounded-[8px] border border-[#0A0A0A]/30"
                            style={{ fontFamily: 'Pretendard, sans-serif' }}
                          >
                            취소
                          </button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* 제목 */}
      <p
        className="text-[15px] font-bold text-[#0A0A0A] leading-tight"
        style={{ fontFamily: 'Pretendard, sans-serif' }}
      >
        {post.title}
      </p>

      {/* 본문 */}
      <p
        className="text-[12px] text-[#0A0A0A]/60 font-bold leading-relaxed line-clamp-3"
        style={{ fontFamily: 'Pretendard, sans-serif' }}
      >
        {post.body}
      </p>

      {/* 태그 */}
      <div className="flex flex-wrap gap-1.5">
        {post.tags.map((tag) => (
          <span
            key={tag}
            className="px-2 py-0.5 bg-[#FFF8F0] border-[1px] border-[#0A0A0A]/20 text-[#0A0A0A]/50 text-[11px] font-bold rounded-[6px]"
            style={{ fontFamily: 'Pretendard, sans-serif' }}
          >
            #{tag}
          </span>
        ))}
      </div>

      {/* 하단 바 */}
      <div className="flex items-center justify-between pt-1 border-t-[1px] border-[#0A0A0A]/10">
        <div className="flex items-center gap-2">
          {post.author_avatar_url ? (
            <img
              src={post.author_avatar_url}
              alt={post.author}
              className="w-6 h-6 rounded-full border border-[#0A0A0A]/20 object-cover flex-shrink-0"
            />
          ) : (
            <span className="text-[14px]">{post.authorEmoji}</span>
          )}
          <span
            className="text-[12px] text-[#0A0A0A]/50 font-bold"
            style={{ fontFamily: 'Pretendard, sans-serif' }}
          >
            {post.author}
          </span>
        </div>
        <motion.button
          onClick={toggleLike}
          whileTap={{ scale: 0.8 }}
          className="flex items-center gap-1.5"
        >
          <motion.span
            animate={{ scale: liked ? [1, 1.4, 1] : 1 }}
            transition={{ duration: 0.3 }}
            className="text-[16px]"
          >
            {liked ? '❤️' : '🤍'}
          </motion.span>
          <span
            className={`text-[12px] font-bold ${liked ? 'text-[#FF3D77]' : 'text-[#0A0A0A]/40'}`}
            style={{ fontFamily: 'Bungee, sans-serif' }}
          >
            {likeCount}
          </span>
        </motion.button>
      </div>
    </motion.div>
  );
}
