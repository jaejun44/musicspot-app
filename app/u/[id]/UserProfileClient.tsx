'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Play, Pause, Music, FileText } from 'lucide-react';
import Navigation from '@/components/Navigation';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

interface UserProfile {
  user_id: string;
  display_name: string | null;
  bio: string | null;
  instruments: string[];
  genres: string[];
  region: string | null;
  purposes: string[];
  looking_for: string | null;
  avatar_url: string | null;
  is_public: boolean;
}

interface StemTrack {
  id: string;
  file_url: string;
  instrument: string | null;
  track_order: number;
  created_at: string;
  stem_projects: {
    id: string;
    title: string;
    bpm: number;
    key_signature: string;
  } | null;
}

interface Post {
  id: string;
  category: string;
  title: string;
  body: string;
  tags: string[];
  created_at: string;
}

const POSITION_EMOJIS: Record<string, string> = {
  보컬: '🎤', 기타: '🎸', 베이스: '🎵', 드럼: '🥁', 건반: '🎹', '기타(other)': '🎶',
};
const CATEGORY_LABELS: Record<string, string> = {
  free: '자유', gear: '장비', band: '밴드', practice: '연습', cover: '커버', original: '창작',
};

type Tab = 'tracks' | 'posts';

export default function UserProfileClient({ userId }: { userId: string }) {
  const router = useRouter();
  const { user } = useAuth();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [tracks, setTracks] = useState<StemTrack[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [tab, setTab] = useState<Tab>('tracks');
  const [pageLoading, setPageLoading] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());

  const isSelf = user?.id === userId;
  const canFollow = !!(user && !isSelf);

  useEffect(() => {
    async function load() {
      setPageLoading(true);

      const [profileRes, tracksRes, postsRes, followerRes, followingRes] = await Promise.all([
        supabase.from('user_profiles').select('*').eq('user_id', userId).maybeSingle(),
        supabase
          .from('stem_tracks')
          .select('id, file_url, instrument, track_order, created_at, stem_projects(id, title, bpm, key_signature)')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('posts')
          .select('id, category, title, body, tags, created_at')
          .eq('author_id', userId)
          .eq('is_published', true)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase.from('user_follows').select('follower_id', { count: 'exact', head: true }).eq('following_id', userId),
        supabase.from('user_follows').select('following_id', { count: 'exact', head: true }).eq('follower_id', userId),
      ]);

      setProfile(profileRes.data ?? null);
      setTracks((tracksRes.data ?? []) as unknown as StemTrack[]);
      setPosts(postsRes.data ?? []);
      setFollowerCount(followerRes.count ?? 0);
      setFollowingCount(followingRes.count ?? 0);
      setPageLoading(false);
    }

    load();
  }, [userId]);

  useEffect(() => {
    if (!user || !canFollow) return;
    supabase
      .from('user_follows')
      .select('follower_id')
      .eq('follower_id', user.id)
      .eq('following_id', userId)
      .maybeSingle()
      .then(({ data }) => setIsFollowing(!!data));
  }, [user, userId, canFollow]);

  async function handleFollow() {
    if (!canFollow || followLoading || !user) return;
    setFollowLoading(true);
    if (isFollowing) {
      await supabase.from('user_follows').delete().eq('follower_id', user.id).eq('following_id', userId);
      setIsFollowing(false);
      setFollowerCount((c) => Math.max(0, c - 1));
    } else {
      await supabase.from('user_follows').insert({ follower_id: user.id, following_id: userId });
      setIsFollowing(true);
      setFollowerCount((c) => c + 1);
    }
    setFollowLoading(false);
  }

  function togglePlay(trackId: string, fileUrl: string) {
    const existing = audioRefs.current.get(trackId);

    if (playingId && playingId !== trackId) {
      const prev = audioRefs.current.get(playingId);
      prev?.pause();
    }

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

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-[#FFF8F0]">
        <Navigation />
        <div className="flex items-center justify-center py-32">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
            className="w-8 h-8 border-[3px] border-[#FF3D77] border-t-transparent rounded-full"
          />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#FFF8F0]">
        <Navigation />
        <div className="flex flex-col items-center justify-center py-32 px-4">
          <span className="text-[48px] mb-4">🔍</span>
          <p className="text-[18px] font-bold text-[#0A0A0A]/50" style={{ fontFamily: 'Bungee, sans-serif' }}>
            프로필을 찾을 수 없어요
          </p>
          <button
            onClick={() => router.back()}
            className="mt-6 px-6 py-3 bg-[#FF3D77] rounded-[14px] border-[3px] border-[#0A0A0A] text-white font-bold text-[14px]"
            style={{ boxShadow: '4px 4px 0 #0A0A0A', fontFamily: 'Bungee, sans-serif' }}
          >
            ← 돌아가기
          </button>
        </div>
      </div>
    );
  }

  const positionEmoji = POSITION_EMOJIS[profile.instruments[0] ?? ''] ?? '🎶';

  return (
    <div className="min-h-screen bg-[#FFF8F0]">
      <Navigation />

      <div className="max-w-2xl mx-auto px-4 pb-20">
        {/* 뒤로가기 */}
        <motion.button
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => router.back()}
          className="flex items-center gap-1 mt-5 mb-4 text-[13px] font-bold text-[#0A0A0A]/50 hover:text-[#FF3D77] transition-colors"
          style={{ fontFamily: 'Pretendard, sans-serif' }}
        >
          <ChevronLeft className="w-4 h-4" />
          뒤로
        </motion.button>

        {/* 프로필 카드 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 22 }}
          className="bg-white rounded-[24px] border-[3px] border-[#0A0A0A] p-6 mb-5"
          style={{ boxShadow: '6px 6px 0 #0A0A0A' }}
        >
          {/* 아바타 + 이름 행 */}
          <div className="flex items-start gap-4 mb-4">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.display_name ?? '뮤지션'}
                className="w-20 h-20 rounded-full border-[3px] border-[#0A0A0A] flex-shrink-0 object-cover"
                style={{ boxShadow: '3px 3px 0 #0A0A0A' }}
              />
            ) : (
              <div
                className="w-20 h-20 rounded-full border-[3px] border-[#0A0A0A] flex items-center justify-center text-[36px] flex-shrink-0 bg-[#FF3D77]"
                style={{ boxShadow: '3px 3px 0 #0A0A0A' }}
              >
                {positionEmoji}
              </div>
            )}
            <div className="flex-1 min-w-0 pt-1">
              <h1
                className="text-[22px] font-bold text-[#0A0A0A] leading-tight"
                style={{ fontFamily: 'Pretendard, sans-serif' }}
              >
                {profile.display_name ?? '이름 없음'}
              </h1>
              {profile.region && (
                <p className="text-[12px] text-[#0A0A0A]/50 font-bold mt-0.5" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                  📍 {profile.region}
                </p>
              )}
              {/* 팔로우/팔로잉 통계 */}
              <div className="flex gap-4 mt-2">
                <div className="text-center">
                  <p className="text-[16px] font-bold text-[#0A0A0A]" style={{ fontFamily: 'Bungee, sans-serif' }}>
                    {followerCount}
                  </p>
                  <p className="text-[10px] text-[#0A0A0A]/50 font-bold" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                    팔로워
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[16px] font-bold text-[#0A0A0A]" style={{ fontFamily: 'Bungee, sans-serif' }}>
                    {followingCount}
                  </p>
                  <p className="text-[10px] text-[#0A0A0A]/50 font-bold" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                    팔로잉
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[16px] font-bold text-[#0A0A0A]" style={{ fontFamily: 'Bungee, sans-serif' }}>
                    {tracks.length}
                  </p>
                  <p className="text-[10px] text-[#0A0A0A]/50 font-bold" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                    트랙
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 뱃지 행 */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {profile.instruments.map((inst) => (
              <span
                key={inst}
                className="px-2.5 py-1 bg-[#0A0A0A] text-white text-[11px] font-bold rounded-[8px]"
                style={{ fontFamily: 'Pretendard, sans-serif' }}
              >
                {POSITION_EMOJIS[inst] ?? '🎶'} {inst}
              </span>
            ))}
            {profile.genres.map((g) => (
              <span
                key={g}
                className="px-2.5 py-1 bg-[#FFF8F0] border-[2px] border-[#0A0A0A]/20 text-[#0A0A0A]/60 text-[11px] font-bold rounded-[8px]"
                style={{ fontFamily: 'Pretendard, sans-serif' }}
              >
                {g}
              </span>
            ))}
          </div>

          {/* 소개 */}
          {profile.bio && (
            <p
              className="text-[13px] text-[#0A0A0A]/70 font-bold leading-relaxed mb-3"
              style={{ fontFamily: 'Pretendard, sans-serif' }}
            >
              {profile.bio}
            </p>
          )}

          {/* 구인 메시지 */}
          {profile.looking_for && (
            <div className="bg-[#FFF8F0] rounded-[12px] px-4 py-2.5 mb-4">
              <p className="text-[12px] text-[#0A0A0A]/50 font-bold" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                💬 {profile.looking_for}
              </p>
            </div>
          )}

          {/* 액션 버튼 */}
          {!isSelf && (
            <div className="flex gap-2">
              <motion.button
                onClick={handleFollow}
                disabled={!canFollow || followLoading}
                whileTap={{ scale: 0.96, y: 1 }}
                className={[
                  'flex-1 py-3 rounded-[14px] border-[3px] border-[#0A0A0A] font-bold text-[13px] transition-colors disabled:opacity-50',
                  isFollowing ? 'bg-[#41C66B] text-white' : 'bg-white text-[#0A0A0A]',
                ].join(' ')}
                style={{ boxShadow: '3px 3px 0 #0A0A0A', fontFamily: 'Bungee, sans-serif' }}
              >
                {!canFollow ? '로그인 필요' : isFollowing ? '✓ 팔로잉' : '+ 팔로우'}
              </motion.button>
              <Link
                href={`/band-matching`}
                className="flex-1 py-3 bg-[#FF3D77] rounded-[14px] border-[3px] border-[#0A0A0A] text-white font-bold text-[13px] text-center"
                style={{ boxShadow: '3px 3px 0 #0A0A0A', fontFamily: 'Bungee, sans-serif' }}
              >
                연락하기 💥
              </Link>
            </div>
          )}

          {isSelf && (
            <Link
              href="/my-bookings"
              className="block w-full py-3 bg-[#4FC3F7] rounded-[14px] border-[3px] border-[#0A0A0A] text-[#0A0A0A] font-bold text-[13px] text-center"
              style={{ boxShadow: '3px 3px 0 #0A0A0A', fontFamily: 'Bungee, sans-serif' }}
            >
              ✏️ 프로필 수정
            </Link>
          )}
        </motion.div>

        {/* 탭 */}
        <div className="flex gap-2 mb-4">
          {([
            { key: 'tracks', label: '🎧 8마디 트랙', count: tracks.length },
            { key: 'posts', label: '✍️ 게시물', count: posts.length },
          ] as { key: Tab; label: string; count: number }[]).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={[
                'flex-1 py-2.5 rounded-[12px] border-[2px] border-[#0A0A0A] font-bold text-[13px] transition-colors',
                tab === t.key ? 'bg-[#0A0A0A] text-white' : 'bg-white text-[#0A0A0A]',
              ].join(' ')}
              style={{ fontFamily: 'Pretendard, sans-serif', boxShadow: tab === t.key ? '3px 3px 0 #FF3D77' : '3px 3px 0 #0A0A0A' }}
            >
              {t.label} ({t.count})
            </button>
          ))}
        </div>

        {/* 트랙 탭 */}
        <AnimatePresence mode="wait">
          {tab === 'tracks' && (
            <motion.div
              key="tracks"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex flex-col gap-3"
            >
              {tracks.length === 0 ? (
                <div className="flex flex-col items-center py-16">
                  <span className="text-[40px] mb-3">🎵</span>
                  <p className="text-[14px] font-bold text-[#0A0A0A]/40" style={{ fontFamily: 'Bungee, sans-serif' }}>
                    아직 트랙이 없어요
                  </p>
                </div>
              ) : (
                tracks.map((track, i) => (
                  <motion.div
                    key={track.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-white rounded-[16px] border-[2px] border-[#0A0A0A] p-4 flex items-center gap-3"
                    style={{ boxShadow: '3px 3px 0 #0A0A0A' }}
                  >
                    {/* 재생 버튼 */}
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => togglePlay(track.id, track.file_url)}
                      className={[
                        'w-10 h-10 rounded-full border-[2px] border-[#0A0A0A] flex items-center justify-center flex-shrink-0',
                        playingId === track.id ? 'bg-[#FF3D77] text-white' : 'bg-[#F5FF4F] text-[#0A0A0A]',
                      ].join(' ')}
                      style={{ boxShadow: '2px 2px 0 #0A0A0A' }}
                    >
                      {playingId === track.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                    </motion.button>

                    {/* 트랙 정보 */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold text-[#0A0A0A] truncate" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                        {track.stem_projects?.title ?? '프로젝트'}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {track.instrument && (
                          <span className="text-[10px] font-bold text-[#0A0A0A]/60" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                            {track.instrument}
                          </span>
                        )}
                        {track.stem_projects && (
                          <>
                            <span className="text-[10px] text-[#0A0A0A]/30">•</span>
                            <span className="text-[10px] font-bold text-[#0A0A0A]/60" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                              ♩{track.stem_projects.bpm} BPM · {track.stem_projects.key_signature}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* 날짜 */}
                    <span className="text-[10px] text-[#0A0A0A]/30 font-bold flex-shrink-0" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                      {track.created_at.slice(0, 10)}
                    </span>
                  </motion.div>
                ))
              )}
            </motion.div>
          )}

          {/* 게시물 탭 */}
          {tab === 'posts' && (
            <motion.div
              key="posts"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex flex-col gap-3"
            >
              {posts.length === 0 ? (
                <div className="flex flex-col items-center py-16">
                  <span className="text-[40px] mb-3">✍️</span>
                  <p className="text-[14px] font-bold text-[#0A0A0A]/40" style={{ fontFamily: 'Bungee, sans-serif' }}>
                    아직 게시물이 없어요
                  </p>
                </div>
              ) : (
                posts.map((post, i) => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-white rounded-[16px] border-[2px] border-[#0A0A0A] p-4"
                    style={{ boxShadow: '3px 3px 0 #0A0A0A' }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className="px-2 py-0.5 bg-[#4FC3F7]/20 border-[2px] border-[#4FC3F7] text-[#0A0A0A] text-[10px] font-bold rounded-[6px]"
                        style={{ fontFamily: 'Pretendard, sans-serif' }}
                      >
                        {CATEGORY_LABELS[post.category] ?? post.category}
                      </span>
                      <span className="text-[10px] text-[#0A0A0A]/30 font-bold ml-auto" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                        {post.created_at.slice(0, 10)}
                      </span>
                    </div>
                    <p className="text-[14px] font-bold text-[#0A0A0A] mb-1 leading-snug" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                      {post.title}
                    </p>
                    <p className="text-[12px] text-[#0A0A0A]/60 font-bold line-clamp-2 leading-relaxed" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                      {post.body}
                    </p>
                    {post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {post.tags.map((tag) => (
                          <span key={tag} className="text-[10px] text-[#FF3D77] font-bold" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </motion.div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
