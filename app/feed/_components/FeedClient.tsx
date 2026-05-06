'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Play, Pause } from 'lucide-react';
import Navigation from '@/components/Navigation';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

const POSITION_EMOJIS: Record<string, string> = {
  보컬: '🎤', 기타: '🎸', 베이스: '🎵', 드럼: '🥁', 건반: '🎹', '기타(other)': '🎶',
};

const CATEGORY_LABELS: Record<string, string> = {
  free: '자유', gear: '장비', band: '밴드', practice: '연습', cover: '커버', original: '창작',
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '방금';
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;
  return dateStr.slice(0, 10);
}

interface FeedPost {
  type: 'post';
  id: string;
  author_id: string;
  author_name: string;
  author_emoji: string;
  author_avatar_url: string | null;
  category: string;
  title: string;
  body: string;
  tags: string[];
  created_at: string;
}

interface FeedTrack {
  type: 'track';
  id: string;
  author_id: string;
  author_name: string;
  author_emoji: string;
  author_avatar_url: string | null;
  file_url: string;
  instrument: string | null;
  project_title: string;
  project_bpm: number;
  project_key: string;
  created_at: string;
}

type FeedItem = FeedPost | FeedTrack;

type ProfileRow = {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  instruments: string[];
};

export default function FeedClient() {
  const { user, loading } = useAuth();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [hasFollows, setHasFollows] = useState(false);
  const [followingCount, setFollowingCount] = useState(0);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());

  useEffect(() => {
    if (loading) return;
    if (!user) { setFeedLoading(false); return; }
    loadFeed();
  }, [user, loading]);

  async function loadFeed() {
    setFeedLoading(true);

    const { data: follows } = await supabase
      .from('user_follows')
      .select('following_id')
      .eq('follower_id', user!.id);

    const followingIds = (follows ?? []).map((f: { following_id: string }) => f.following_id);
    setFollowingCount(followingIds.length);
    setHasFollows(followingIds.length > 0);

    if (followingIds.length === 0) {
      setItems([]);
      setFeedLoading(false);
      return;
    }

    const [postsRes, tracksRes, profilesRes] = await Promise.all([
      supabase
        .from('posts')
        .select('id, author_id, author_name, author_emoji, author_avatar_url, category, title, body, tags, created_at')
        .in('author_id', followingIds)
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(30),
      supabase
        .from('stem_tracks')
        .select('id, user_id, file_url, instrument, created_at, stem_projects(title, bpm, key_signature)')
        .in('user_id', followingIds)
        .order('created_at', { ascending: false })
        .limit(30),
      supabase
        .from('user_profiles')
        .select('user_id, display_name, avatar_url, instruments')
        .in('user_id', followingIds),
    ]);

    const profileMap = new Map<string, ProfileRow>(
      (profilesRes.data ?? []).map((p: ProfileRow) => [p.user_id, p])
    );

    const postItems: FeedPost[] = (postsRes.data ?? []).map((p: Record<string, unknown>) => ({
      type: 'post' as const,
      id: p.id as string,
      author_id: p.author_id as string,
      author_name: (p.author_name as string) || '뮤지션',
      author_emoji: (p.author_emoji as string) || '🎶',
      author_avatar_url: (p.author_avatar_url as string | null) ?? null,
      category: p.category as string,
      title: p.title as string,
      body: p.body as string,
      tags: (p.tags as string[]) ?? [],
      created_at: p.created_at as string,
    }));

    const trackItems: FeedTrack[] = (tracksRes.data ?? []).map((t: Record<string, unknown>) => {
      const project = t.stem_projects as Record<string, unknown> | null;
      const profile = profileMap.get(t.user_id as string);
      const firstInstrument = profile?.instruments?.[0] ?? '';
      return {
        type: 'track' as const,
        id: t.id as string,
        author_id: t.user_id as string,
        author_name: profile?.display_name ?? '뮤지션',
        author_emoji: POSITION_EMOJIS[firstInstrument] ?? '🎶',
        author_avatar_url: profile?.avatar_url ?? null,
        file_url: t.file_url as string,
        instrument: (t.instrument as string | null) ?? null,
        project_title: (project?.title as string) ?? '프로젝트',
        project_bpm: (project?.bpm as number) ?? 120,
        project_key: (project?.key_signature as string) ?? 'C',
        created_at: t.created_at as string,
      };
    });

    const merged = [...postItems, ...trackItems].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    setItems(merged);
    setFeedLoading(false);
  }

  function togglePlay(trackId: string, fileUrl: string) {
    if (playingId && playingId !== trackId) {
      audioRefs.current.get(playingId)?.pause();
    }
    const existing = audioRefs.current.get(trackId);
    if (!existing) {
      const audio = new Audio(fileUrl);
      audioRefs.current.set(trackId, audio);
      audio.play();
      audio.onended = () => setPlayingId(null);
      setPlayingId(trackId);
    } else if (playingId === trackId) {
      existing.pause();
      setPlayingId(null);
    } else {
      existing.play();
      setPlayingId(trackId);
    }
  }

  return (
    <div className="min-h-screen bg-[#FFF8F0]">
      <Navigation />

      <div className="max-w-2xl mx-auto px-4 pt-6 pb-24">
        {/* 헤더 */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 22 }}
          className="mb-5"
        >
          <h1
            className="text-[28px] font-bold text-[#0A0A0A]"
            style={{ fontFamily: 'Bungee, sans-serif' }}
          >
            피드 📡
          </h1>
          <p
            className="text-[13px] text-[#0A0A0A]/50 mt-1 font-bold"
            style={{ fontFamily: 'Pretendard, sans-serif' }}
          >
            팔로우한 뮤지션의 최신 활동
          </p>
        </motion.div>

        {/* 비로그인 */}
        {!loading && !user && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center py-20"
          >
            <span className="text-[52px] mb-4">🔐</span>
            <p
              className="text-[16px] font-bold text-[#0A0A0A]/50 mb-2 text-center"
              style={{ fontFamily: 'Bungee, sans-serif' }}
            >
              로그인이 필요해요
            </p>
            <p
              className="text-[13px] text-[#0A0A0A]/40 mb-6 text-center"
              style={{ fontFamily: 'Pretendard, sans-serif' }}
            >
              팔로우한 뮤지션의 게시물과<br />8마디 트랙을 모아볼 수 있어요
            </p>
            <Link
              href="/login"
              className="px-6 py-3 bg-[#FF3D77] rounded-[14px] border-[3px] border-[#0A0A0A] text-white font-bold text-[14px]"
              style={{ boxShadow: '4px 4px 0 #0A0A0A', fontFamily: 'Bungee, sans-serif' }}
            >
              로그인하기 →
            </Link>
          </motion.div>
        )}

        {/* 로딩 */}
        {feedLoading && (
          <div className="flex items-center justify-center py-32">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              className="w-8 h-8 border-[3px] border-[#FF3D77] border-t-transparent rounded-full"
            />
          </div>
        )}

        {/* 팔로우 없음 */}
        {!feedLoading && user && !hasFollows && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center py-20"
          >
            <span className="text-[52px] mb-4">👋</span>
            <p
              className="text-[16px] font-bold text-[#0A0A0A]/50 mb-2 text-center"
              style={{ fontFamily: 'Bungee, sans-serif' }}
            >
              아직 팔로우한 뮤지션이 없어요
            </p>
            <p
              className="text-[13px] text-[#0A0A0A]/40 mb-6 text-center"
              style={{ fontFamily: 'Pretendard, sans-serif' }}
            >
              밴드찾기에서 뮤지션을 팔로우하면<br />이곳에서 활동을 모아볼 수 있어요
            </p>
            <Link
              href="/band-matching"
              className="px-6 py-3 bg-[#41C66B] rounded-[14px] border-[3px] border-[#0A0A0A] text-white font-bold text-[14px]"
              style={{ boxShadow: '4px 4px 0 #0A0A0A', fontFamily: 'Bungee, sans-serif' }}
            >
              뮤지션 찾기 🎸
            </Link>
          </motion.div>
        )}

        {/* 팔로우 있지만 활동 없음 */}
        {!feedLoading && user && hasFollows && items.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center py-20"
          >
            <span className="text-[52px] mb-4">🎵</span>
            <p
              className="text-[14px] font-bold text-[#0A0A0A]/50 text-center"
              style={{ fontFamily: 'Bungee, sans-serif' }}
            >
              아직 새 활동이 없어요
            </p>
            <p
              className="text-[12px] text-[#0A0A0A]/30 mt-2 text-center"
              style={{ fontFamily: 'Pretendard, sans-serif' }}
            >
              {followingCount}명을 팔로우 중 · 활동이 생기면 여기에 표시돼요
            </p>
          </motion.div>
        )}

        {/* 팔로잉 카운트 */}
        {!feedLoading && user && hasFollows && items.length > 0 && (
          <p
            className="text-[11px] text-[#0A0A0A]/30 font-bold mb-4"
            style={{ fontFamily: 'Pretendard, sans-serif' }}
          >
            {followingCount}명 팔로우 중 · {items.length}개의 활동
          </p>
        )}

        {/* 피드 목록 */}
        {!feedLoading && items.length > 0 && (
          <div className="flex flex-col gap-4">
            {items.map((item, i) => (
              <motion.div
                key={`${item.type}-${item.id}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, type: 'spring', stiffness: 260, damping: 22 }}
              >
                {item.type === 'post' ? (
                  <PostCard item={item} />
                ) : (
                  <TrackCard
                    item={item}
                    isPlaying={playingId === item.id}
                    onTogglePlay={() => togglePlay(item.id, item.file_url)}
                  />
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AuthorRow({ item }: { item: FeedItem }) {
  return (
    <Link
      href={`/u/${item.author_id}`}
      className="flex items-center gap-2.5 mb-3 group"
    >
      {item.author_avatar_url ? (
        <img
          src={item.author_avatar_url}
          alt={item.author_name}
          className="w-8 h-8 rounded-full border-[2px] border-[#0A0A0A] object-cover flex-shrink-0"
        />
      ) : (
        <div className="w-8 h-8 rounded-full bg-[#FF3D77] border-[2px] border-[#0A0A0A] flex items-center justify-center text-[14px] flex-shrink-0">
          {item.author_emoji}
        </div>
      )}
      <span
        className="text-[13px] font-bold text-[#0A0A0A] group-hover:text-[#FF3D77] transition-colors"
        style={{ fontFamily: 'Pretendard, sans-serif' }}
      >
        {item.author_name}
      </span>
      <span
        className="text-[11px] text-[#0A0A0A]/30 font-bold ml-auto"
        style={{ fontFamily: 'Pretendard, sans-serif' }}
      >
        {timeAgo(item.created_at)}
      </span>
    </Link>
  );
}

function PostCard({ item }: { item: FeedPost }) {
  return (
    <div
      className="bg-white rounded-[20px] border-[3px] border-[#0A0A0A] p-5"
      style={{ boxShadow: '5px 5px 0 #0A0A0A' }}
    >
      <AuthorRow item={item} />
      <span
        className="inline-block px-2 py-0.5 bg-[#4FC3F7]/20 border-[1.5px] border-[#4FC3F7] text-[#0A0A0A] text-[10px] font-bold rounded-[6px] mb-2.5"
        style={{ fontFamily: 'Pretendard, sans-serif' }}
      >
        ✍️ {CATEGORY_LABELS[item.category] ?? item.category}
      </span>
      <h3
        className="text-[15px] font-bold text-[#0A0A0A] mb-1.5 leading-snug"
        style={{ fontFamily: 'Pretendard, sans-serif' }}
      >
        {item.title}
      </h3>
      <p
        className="text-[12px] text-[#0A0A0A]/60 font-bold line-clamp-3 leading-relaxed"
        style={{ fontFamily: 'Pretendard, sans-serif' }}
      >
        {item.body}
      </p>
      {item.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2.5">
          {item.tags.map((tag) => (
            <span
              key={tag}
              className="text-[10px] text-[#FF3D77] font-bold"
              style={{ fontFamily: 'Pretendard, sans-serif' }}
            >
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function TrackCard({
  item,
  isPlaying,
  onTogglePlay,
}: {
  item: FeedTrack;
  isPlaying: boolean;
  onTogglePlay: () => void;
}) {
  return (
    <div
      className="bg-white rounded-[20px] border-[3px] border-[#0A0A0A] p-5"
      style={{ boxShadow: '5px 5px 0 #0A0A0A' }}
    >
      <AuthorRow item={item} />
      <span
        className="inline-block px-2 py-0.5 bg-[#F5FF4F] border-[1.5px] border-[#0A0A0A] text-[#0A0A0A] text-[10px] font-bold rounded-[6px] mb-3"
        style={{ fontFamily: 'Pretendard, sans-serif' }}
      >
        🎸 8마디 트랙 업로드
      </span>
      <div className="flex items-center gap-3">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onTogglePlay}
          className={[
            'w-11 h-11 rounded-full border-[2px] border-[#0A0A0A] flex items-center justify-center flex-shrink-0',
            isPlaying ? 'bg-[#FF3D77] text-white' : 'bg-[#F5FF4F] text-[#0A0A0A]',
          ].join(' ')}
          style={{ boxShadow: '2px 2px 0 #0A0A0A' }}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4 ml-0.5" />
          )}
        </motion.button>
        <div className="flex-1 min-w-0">
          <p
            className="text-[14px] font-bold text-[#0A0A0A] truncate"
            style={{ fontFamily: 'Pretendard, sans-serif' }}
          >
            {item.project_title}
          </p>
          <p
            className="text-[11px] text-[#0A0A0A]/50 font-bold mt-0.5"
            style={{ fontFamily: 'Pretendard, sans-serif' }}
          >
            ♩{item.project_bpm} BPM · {item.project_key}
          </p>
        </div>
        {item.instrument && (
          <span
            className="px-2 py-0.5 bg-[#0A0A0A] text-white text-[10px] font-bold rounded-[6px] flex-shrink-0"
            style={{ fontFamily: 'Pretendard, sans-serif' }}
          >
            {item.instrument}
          </span>
        )}
      </div>
    </div>
  );
}
