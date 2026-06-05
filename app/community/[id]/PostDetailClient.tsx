'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import Navigation from '@/components/Navigation';
import CommentSection from '../_components/CommentSection';
import EditPostModal from '../_components/EditPostModal';
import { Post, Category } from '../_data/posts';

interface UserProfile {
  display_name: string | null;
  avatar_url: string | null;
}

const CATEGORY_STYLE: Record<string, { bg: string; text: string }> = {
  후기: { bg: '#41C66B', text: '#FFFFFF' },
  구인: { bg: '#FF3D77', text: '#FFFFFF' },
  자유: { bg: '#F5FF4F', text: '#0A0A0A' },
  질문: { bg: '#4FC3F7', text: '#0A0A0A' },
};

interface PostDetail {
  id: string;
  category: string;
  title: string;
  body: string;
  author_id?: string;
  author_name?: string;
  author_emoji?: string;
  author_avatar_url?: string;
  created_at: string;
  tags: string[];
  likes_count: number;
  comments_count: number;
}

interface Props {
  postId: string;
  initialPost?: PostDetail | null;
}

export default function PostDetailClient({ postId, initialPost }: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const [myProfile, setMyProfile] = useState<UserProfile | null>(null);

  const [post, setPost] = useState<PostDetail | null>(initialPost ?? null);
  const [loading, setLoading] = useState(!initialPost);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isOwn = !!user && !!post?.author_id && user.id === post.author_id;

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

  async function deletePost() {
    if (!post) return;
    await supabase.from('posts').delete().eq('id', post.id);
    router.push('/community');
  }

  async function reloadPost() {
    if (!post) return;
    const { data } = await supabase
      .from('posts')
      .select('id, category, title, body, author_id, author_name, author_emoji, author_avatar_url, created_at, tags, post_likes(post_id), post_comments(id)')
      .eq('id', post.id)
      .eq('is_published', true)
      .single();
    if (!data) return;
    const likesArr = (data.post_likes as { post_id: string }[]) ?? [];
    const commentsArr = (data.post_comments as { id: string }[]) ?? [];
    setPost({
      id: data.id,
      category: data.category,
      title: data.title,
      body: data.body,
      author_id: data.author_id,
      author_name: data.author_name,
      author_emoji: data.author_emoji,
      author_avatar_url: data.author_avatar_url,
      created_at: data.created_at,
      tags: data.tags ?? [],
      likes_count: likesArr.length,
      comments_count: commentsArr.length,
    });
  }

  useEffect(() => {
    if (initialPost) {
      setLikeCount(initialPost.likes_count);
      setCommentCount(initialPost.comments_count);
      return;
    }

    async function load() {
      const { data, error } = await supabase
        .from('posts')
        .select('id, category, title, body, author_id, author_name, author_emoji, author_avatar_url, created_at, tags, post_likes(post_id), post_comments(id)')
        .eq('id', postId)
        .eq('is_published', true)
        .maybeSingle();

      if (error || !data) {
        setLoading(false);
        return;
      }

      const likesArr = (data.post_likes as { post_id: string }[]) ?? [];
      const commentsArr = (data.post_comments as { id: string }[]) ?? [];

      const loaded: PostDetail = {
        id: data.id,
        category: data.category,
        title: data.title,
        body: data.body,
        author_id: data.author_id,
        author_name: data.author_name,
        author_emoji: data.author_emoji,
        author_avatar_url: data.author_avatar_url,
        created_at: data.created_at,
        tags: data.tags ?? [],
        likes_count: likesArr.length,
        comments_count: commentsArr.length,
      };

      setPost(loaded);
      setLikeCount(likesArr.length);
      setCommentCount(commentsArr.length);
      setLoading(false);
    }

    load();
  }, [postId]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('user_profiles')
      .select('display_name, avatar_url')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => setMyProfile(data));
  }, [user]);

  useEffect(() => {
    if (!user || !postId) return;
    supabase
      .from('post_likes')
      .select('post_id')
      .eq('post_id', postId)
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => setLiked(!!data));
  }, [user, postId]);

  async function toggleLike() {
    if (!user) return;
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => Math.max(0, c + (next ? 1 : -1)));
    if (next) {
      await supabase.from('post_likes').insert({ post_id: postId, user_id: user.id });
    } else {
      await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', user.id);
    }
  }

  const createdAt = post
    ? new Date(post.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' })
    : '';

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundImage: 'url(/ms_character/chears.png)', backgroundSize: 'cover', backgroundPosition: 'center top', backgroundAttachment: 'fixed' }}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 0.9, ease: 'linear' }}
          className="w-10 h-10 rounded-full border-[3px] border-[#FF3D77] border-t-transparent"
        />
      </div>
    );
  }

  if (!post) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-4 px-4"
        style={{ backgroundImage: 'url(/ms_character/chears.png)', backgroundSize: 'cover', backgroundPosition: 'center top', backgroundAttachment: 'fixed' }}
      >
        <Navigation />
        <div
          className="bg-white rounded-[20px] border-[3px] border-[#0A0A0A] px-8 py-8 text-center"
          style={{ boxShadow: '6px 6px 0 #0A0A0A' }}
        >
          <p className="text-[#FF3D77] text-[32px] mb-2" style={{ fontFamily: 'Bungee, sans-serif' }}>404</p>
          <p className="text-[15px] font-bold text-[#0A0A0A]" style={{ fontFamily: 'Pretendard, sans-serif' }}>
            게시물을 찾을 수 없어요
          </p>
        </div>
        <motion.button
          onClick={() => router.push('/community')}
          whileTap={{ scale: 0.95 }}
          className="px-6 py-3 bg-[#4FC3F7] rounded-[14px] border-[2px] border-[#0A0A0A] font-bold text-[14px]"
          style={{ boxShadow: '3px 3px 0 #0A0A0A', fontFamily: 'Pretendard, sans-serif' }}
        >
          커뮤니티로
        </motion.button>
      </div>
    );
  }

  const style = CATEGORY_STYLE[post.category] ?? { bg: '#F5FF4F', text: '#0A0A0A' };

  return (
    <div
      className="min-h-screen pb-24"
      style={{ backgroundImage: 'url(/ms_character/chears.png)', backgroundSize: 'cover', backgroundPosition: 'center top', backgroundAttachment: 'fixed' }}
    >
      <Navigation />

      {/* 뒤로가기 */}
      <div className="px-4 pt-4 pb-2 max-w-2xl mx-auto">
        <motion.button
          onClick={() => router.push('/community')}
          whileTap={{ scale: 0.93 }}
          className="flex items-center gap-1 text-[14px] font-bold text-white/90 hover:text-white transition-colors"
          style={{ fontFamily: 'Pretendard, sans-serif', textShadow: '1px 1px 0 #0A0A0A' }}
        >
          <ChevronLeft className="w-5 h-5" />
          커뮤니티
        </motion.button>
      </div>

      <div className="px-4 py-2 max-w-2xl mx-auto space-y-4">
        {/* 본문 카드 */}
        <div
          className="bg-white/80 backdrop-blur-sm rounded-[20px] border-[3px] border-[#0A0A0A] p-5"
          style={{ boxShadow: '6px 6px 0 #0A0A0A' }}
        >
          {/* 카테고리 + 날짜 + 메뉴 */}
          <div className="flex items-center justify-between mb-3">
            <span
              className="px-2.5 py-1 rounded-[8px] border-[2px] border-[#0A0A0A] text-[12px] font-bold"
              style={{ backgroundColor: style.bg, color: style.text, fontFamily: 'Pretendard, sans-serif', boxShadow: '1px 1px 0 #0A0A0A' }}
            >
              {post.category}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-[#0A0A0A]/40 font-bold" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                {createdAt}
              </span>
              {isOwn && (
                <div className="relative" ref={menuRef}>
                  <motion.button
                    onClick={() => { setMenuOpen((v) => !v); setConfirmDelete(false); }}
                    whileTap={{ scale: 0.85 }}
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#0A0A0A]/8 transition-colors"
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
                              onClick={() => { setMenuOpen(false); setEditOpen(true); }}
                              className="w-full flex items-center gap-2 px-4 py-2.5 text-[13px] font-bold text-[#0A0A0A] hover:bg-[#FFF8F0] transition-colors"
                              style={{ fontFamily: 'Pretendard, sans-serif' }}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              수정
                            </button>
                            <button
                              onClick={() => setConfirmDelete(true)}
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
                                onClick={() => { setMenuOpen(false); setConfirmDelete(false); deletePost(); }}
                                className="flex-1 py-1.5 bg-[#FF3D77] text-white text-[11px] font-bold rounded-[8px] border border-[#0A0A0A]"
                                style={{ fontFamily: 'Pretendard, sans-serif' }}
                              >
                                삭제
                              </button>
                              <button
                                onClick={() => setConfirmDelete(false)}
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
          <h1
            className="text-[20px] font-bold text-[#0A0A0A] leading-tight mb-4"
            style={{ fontFamily: 'Pretendard, sans-serif' }}
          >
            {post.title}
          </h1>

          {/* 본문 */}
          <p
            className="text-[14px] text-[#0A0A0A]/80 font-bold leading-relaxed whitespace-pre-wrap mb-4"
            style={{ fontFamily: 'Pretendard, sans-serif' }}
          >
            {post.body}
          </p>

          {/* 태그 */}
          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
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
          )}

          {/* 작성자 + 좋아요 */}
          <div className="flex items-center justify-between pt-3 border-t-[1px] border-[#0A0A0A]/10">
            {post.author_id ? (
              <Link href={`/u/${post.author_id}`} className="flex items-center gap-2 group">
                {post.author_avatar_url ? (
                  <img
                    src={post.author_avatar_url}
                    alt={post.author_name ?? ''}
                    className="w-7 h-7 rounded-full border border-[#0A0A0A]/20 object-cover flex-shrink-0"
                  />
                ) : (
                  <span className="text-[16px]">{post.author_emoji ?? '🎵'}</span>
                )}
                <span
                  className="text-[13px] text-[#0A0A0A]/60 font-bold group-hover:text-[#FF3D77] transition-colors"
                  style={{ fontFamily: 'Pretendard, sans-serif' }}
                >
                  {post.author_name ?? '익명'}
                </span>
              </Link>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-[16px]">{post.author_emoji ?? '🎵'}</span>
                <span className="text-[13px] text-[#0A0A0A]/60 font-bold" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                  {post.author_name ?? '익명'}
                </span>
              </div>
            )}

            <motion.button
              onClick={toggleLike}
              whileTap={{ scale: 0.8 }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] border-[2px] border-[#0A0A0A]/10 bg-[#FFF8F0]"
            >
              <motion.span
                animate={{ scale: liked ? [1, 1.4, 1] : 1 }}
                transition={{ duration: 0.3 }}
                className="text-[16px]"
              >
                {liked ? '❤️' : '🤍'}
              </motion.span>
              <span
                className={`text-[13px] font-bold ${liked ? 'text-[#FF3D77]' : 'text-[#0A0A0A]/40'}`}
                style={{ fontFamily: 'Bungee, sans-serif' }}
              >
                {likeCount}
              </span>
            </motion.button>
          </div>
        </div>

        {/* 댓글 섹션 */}
        <div
          className="bg-white/80 backdrop-blur-sm rounded-[20px] border-[3px] border-[#0A0A0A] p-5"
          style={{ boxShadow: '6px 6px 0 #0A0A0A' }}
        >
          <h2
            className="text-[15px] font-bold text-[#0A0A0A] mb-4"
            style={{ fontFamily: 'Pretendard, sans-serif' }}
          >
            💬 댓글 {commentCount > 0 ? `(${commentCount})` : ''}
          </h2>
          <CommentSection
            postId={postId}
            currentUserId={user?.id}
            currentUserName={myProfile?.display_name ?? (user?.user_metadata?.full_name as string) ?? undefined}
            currentUserEmoji="🎵"
            currentUserAvatarUrl={myProfile?.avatar_url ?? undefined}
            onCommentAdded={() => setCommentCount((c) => c + 1)}
          />
        </div>
      </div>

      {editOpen && post && (
        <EditPostModal
          user={user}
          post={{
            id: post.id,
            category: post.category as Category,
            title: post.title,
            body: post.body,
            author: post.author_name ?? '익명',
            authorEmoji: post.author_emoji ?? '🎵',
            author_id: post.author_id,
            author_avatar_url: post.author_avatar_url,
            createdAt: post.created_at,
            tags: post.tags,
            likes_count: post.likes_count,
            comments_count: post.comments_count,
          }}
          onClose={() => setEditOpen(false)}
          onSuccess={() => { setEditOpen(false); reloadPost(); }}
        />
      )}
    </div>
  );
}
