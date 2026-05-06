'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import CategoryFilter, { FeedTab } from './CategoryFilter';
import PostCard from './PostCard';
import WritePostModal from './WritePostModal';
import { POSTS, Post, Category } from '../_data/posts';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import EditPostModal from './EditPostModal';

const SELECT_FIELDS = 'id, category, title, body, author_id, author_name, author_emoji, author_avatar_url, created_at, tags';

function mapPost(p: Record<string, unknown>): Post {
  return {
    id: p.id as string,
    category: p.category as Category,
    title: p.title as string,
    body: p.body as string,
    author: p.author_name as string,
    authorEmoji: p.author_emoji as string,
    author_id: (p.author_id as string) ?? undefined,
    author_avatar_url: (p.author_avatar_url as string) ?? undefined,
    createdAt: (p.created_at as string).slice(0, 10),
    tags: (p.tags as string[]) ?? [],
  };
}

export default function CommunityClient() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<FeedTab>('all');
  const [posts, setPosts] = useState<Post[]>(POSTS);
  const [followFeed, setFollowFeed] = useState<Post[]>([]);
  const [showWrite, setShowWrite] = useState(false);
  const [editPost, setEditPost] = useState<Post | null>(null);

  useEffect(() => {
    async function fetchPosts() {
      const { data } = await supabase
        .from('posts')
        .select(SELECT_FIELDS)
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(50);
      const mapped = (data ?? []).map(mapPost);
      setPosts(mapped.length > 0 ? mapped : POSTS);
    }
    fetchPosts();
  }, []);

  useEffect(() => {
    if (activeTab !== '팔로잉' || !user) return;
    async function fetchFollowFeed() {
      const { data: follows } = await supabase
        .from('user_follows')
        .select('following_id')
        .eq('follower_id', user!.id);
      const ids = (follows ?? []).map((r: { following_id: string }) => r.following_id);
      if (ids.length === 0) { setFollowFeed([]); return; }
      const { data } = await supabase
        .from('posts')
        .select(SELECT_FIELDS)
        .eq('is_published', true)
        .in('author_id', ids)
        .order('created_at', { ascending: false })
        .limit(50);
      setFollowFeed((data ?? []).map(mapPost));
    }
    fetchFollowFeed();
  }, [activeTab, user]);

  async function refreshPosts() {
    const { data } = await supabase
      .from('posts')
      .select(SELECT_FIELDS)
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(50);
    if (data && data.length > 0) {
      setPosts(data.map(mapPost));
    }
  }

  async function handleDelete(postId: string) {
    await supabase.from('posts').delete().eq('id', postId);
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    setFollowFeed((prev) => prev.filter((p) => p.id !== postId));
  }

  const filtered: Post[] =
    activeTab === '팔로잉'
      ? followFeed
      : activeTab === 'all'
      ? posts
      : posts.filter((p) => p.category === activeTab as Category);

  return (
    <div className="min-h-screen bg-[#FFF8F0]">
      <Navigation />

      {/* 헤더 */}
      <div className="px-4 pt-6 pb-3 max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        >
          <h1
            className="text-[28px] font-bold text-[#0A0A0A]"
            style={{ fontFamily: 'Bungee, sans-serif' }}
          >
            COMMUNITY 🎵
          </h1>
          <p
            className="text-[13px] text-[#0A0A0A]/50 mt-1 font-bold"
            style={{ fontFamily: 'Pretendard, sans-serif' }}
          >
            뮤지션들의 이야기가 모이는 곳
          </p>
        </motion.div>
      </div>

      {/* 필터 */}
      <div className="px-4 pb-4 max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <CategoryFilter active={activeTab} onChange={(tab) => {
          if (tab === '팔로잉' && !user) { router.push('/login'); return; }
          setActiveTab(tab);
        }} />
        </motion.div>
      </div>

      {/* 카운트 */}
      <div className="px-4 pb-3 max-w-2xl mx-auto">
        <motion.p
          key={`${activeTab}-${filtered.length}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-[12px] text-[#0A0A0A]/40 font-bold"
          style={{ fontFamily: 'Pretendard, sans-serif' }}
        >
          {activeTab === '팔로잉' ? `팔로잉 피드 ${filtered.length}개` : `게시물 ${filtered.length}개`}
        </motion.p>
      </div>

      {/* 게시물 목록 */}
      <div className="px-4 pb-28 max-w-2xl mx-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex flex-col gap-4"
          >
            {filtered.length > 0 ? (
              filtered.map((post, i) => (
                <PostCard
                  key={post.id}
                  post={post}
                  index={i}
                  currentUserId={user?.id}
                  onEdit={() => setEditPost(post)}
                  onDelete={() => handleDelete(post.id)}
                />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-20">
                <span className="text-[48px] mb-4">📭</span>
                <p
                  className="text-[16px] font-bold text-[#0A0A0A]/40 text-center"
                  style={{ fontFamily: 'Bungee, sans-serif' }}
                >
                  NO POSTS YET
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* 글쓰기 FAB */}
      <div className="fixed bottom-6 right-4 z-40">
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5, type: 'spring', stiffness: 260, damping: 20 }}
          whileHover={{ scale: 1.07, rotate: 5 }}
          whileTap={{ scale: 0.92, y: 2 }}
          onClick={() => {
            if (loading) return;
            if (!user) { router.push('/login'); return; }
            setShowWrite(true);
          }}
          className="w-14 h-14 bg-[#FF3D77] rounded-full border-[3px] border-[#0A0A0A] flex items-center justify-center text-[24px]"
          style={{ boxShadow: '4px 4px 0 #0A0A0A' }}
        >
          ✏️
        </motion.button>
      </div>

      {/* 글쓰기 모달 */}
      {showWrite && (
        <WritePostModal
          user={user}
          initialCategory={activeTab === 'all' || activeTab === '팔로잉' ? '자유' : activeTab}
          onClose={() => setShowWrite(false)}
          onSuccess={() => {
            setShowWrite(false);
            refreshPosts();
          }}
        />
      )}

      {/* 수정 모달 */}
      {editPost && (
        <EditPostModal
          user={user}
          post={editPost}
          onClose={() => setEditPost(null)}
          onSuccess={() => {
            setEditPost(null);
            refreshPosts();
          }}
        />
      )}
    </div>
  );
}
