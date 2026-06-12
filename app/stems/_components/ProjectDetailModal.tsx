'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Pause, Music, Trash2, Pencil, Download, Video, ExternalLink, Share2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import type { StemProject } from '@/types/stem';
import { buildShareUrl } from '@/lib/share-utm';
import { trackEvent } from '@/lib/analytics';
import TrackUploadPanel, { extractYoutubeId } from './TrackUploadPanel';

interface StemTrack {
  id: string;
  project_id: string;
  user_id: string | null;
  user_name: string;
  user_emoji: string;
  file_url: string | null;
  youtube_url: string | null;
  instrument: string | null;
  track_order: number;
  created_at: string;
}

interface Props {
  project: StemProject;
  user: User | null;
  onClose: () => void;
  onUpdate: () => void;
  onEdit?: (p: StemProject) => void;
  onDelete?: (id: string) => void;
}

export default function ProjectDetailModal({ project, user, onClose, onUpdate, onEdit, onDelete }: Props) {
  const [tracks, setTracks] = useState<StemTrack[]>([]);
  const [localIsOpen, setLocalIsOpen] = useState(project.is_open);
  const isOwner = !!user && user.id === project.creator_id;
  const [loadingTracks, setLoadingTracks] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());

  useEffect(() => {
    fetchTracks();
  }, [project.id]);

  useEffect(() => {
    return () => {
      audioRefs.current.forEach((audio) => { audio.pause(); audio.src = ''; });
      audioRefs.current.clear();
    };
  }, []);

  async function fetchTracks() {
    setLoadingTracks(true);
    const { data } = await supabase
      .from('stem_tracks')
      .select('*')
      .eq('project_id', project.id)
      .order('track_order', { ascending: true });
    setTracks(data ?? []);
    setLoadingTracks(false);
  }

  async function handleToggleOpen() {
    const newVal = !localIsOpen;
    await supabase.from('stem_projects').update({ is_open: newVal }).eq('id', project.id);
    setLocalIsOpen(newVal);
    onUpdate();
  }

  const [shareCopied, setShareCopied] = useState(false);

  async function handleShare() {
    const shareUrl = buildShareUrl(`/stems/${project.id}`, 'kakao', 'challenge', project.id);
    const linkUrl = buildShareUrl(`/stems/${project.id}`, 'link', 'challenge', project.id);
    const ogImage = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.musicspotfest.com'}/stems/${project.id}/opengraph-image`;

    trackEvent('share_challenge', { project_id: project.id });

    // 1순위: 카카오 공유
    if (window.Kakao?.isInitialized()) {
      try {
        window.Kakao.Share.sendDefault({
          objectType: 'feed',
          content: {
            title: `${project.title} — 8마디 챌린지`,
            description: `${project.creator_name} 님이 시작한 릴레이. 8마디를 이어보세요!`,
            imageUrl: ogImage,
            link: { mobileWebUrl: shareUrl, webUrl: shareUrl },
          },
          buttons: [
            { title: '이어서 만들기', link: { mobileWebUrl: shareUrl, webUrl: shareUrl } },
          ],
        });
        return;
      } catch {
        // 폴백으로 진행
      }
    }

    // 2순위: 네이티브 공유 시트
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: project.title, url: linkUrl });
        return;
      } catch {
        // 사용자가 취소했거나 미지원 → 클립보드 폴백
      }
    }

    // 3순위: 클립보드 복사
    try {
      await navigator.clipboard.writeText(linkUrl);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      // 무시
    }
  }

  async function handleDeleteTrack(id: string) {
    if (!confirm('이 트랙을 삭제할까요?')) return;
    await supabase.from('stem_tracks').delete().eq('id', id);
    fetchTracks();
    onUpdate();
  }

  function handlePlayPause(trackId: string) {
    const audio = audioRefs.current.get(trackId);
    if (!audio) return;

    if (playingId && playingId !== trackId) {
      const prev = audioRefs.current.get(playingId);
      if (prev) { prev.pause(); prev.currentTime = 0; }
    }

    if (playingId === trackId) {
      audio.pause();
      setPlayingId(null);
    } else {
      audio.play();
      setPlayingId(trackId);
    }
  }

  function handleAudioEnded(trackId: string) {
    if (playingId === trackId) setPlayingId(null);
  }

  function setAudioRef(trackId: string, el: HTMLAudioElement | null) {
    if (el) {
      audioRefs.current.set(trackId, el);
    } else {
      audioRefs.current.delete(trackId);
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-[#0A0A0A]/60 backdrop-blur-sm flex items-stretch justify-end"
        onClick={onClose}
      >
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 32 }}
          className="w-full max-w-lg bg-[#FFF8F0] border-l-[3px] border-[#0A0A0A] flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Sticky header */}
          <div className="sticky top-0 bg-[#FFF8F0] border-b-[3px] border-[#0A0A0A] p-5 z-10 flex-shrink-0">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex-1 min-w-0">
                <span
                  className={[
                    'inline-block px-2 py-0.5 rounded-[8px] border-[2px] border-[#0A0A0A] text-[11px] font-bold mb-2',
                    localIsOpen ? 'bg-[#41C66B] text-white' : 'bg-[#0A0A0A]/10 text-[#0A0A0A]/50',
                  ].join(' ')}
                  style={{ fontFamily: 'Pretendard, sans-serif' }}
                >
                  {localIsOpen ? '🎵 참여중' : '🔒 마감'}
                </span>
                <h2
                  className="text-[20px] font-bold text-[#0A0A0A] leading-tight"
                  style={{ fontFamily: 'Pretendard, sans-serif' }}
                >
                  {project.title}
                </h2>
                <p
                  className="text-[12px] text-[#0A0A0A]/50 mt-1 font-bold"
                  style={{ fontFamily: 'Pretendard, sans-serif' }}
                >
                  {project.creator_emoji} {project.creator_name}
                </p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={handleShare}
                  className="p-1.5 flex items-center gap-1 text-[12px] font-bold text-[#FF3D77]"
                  aria-label="프로젝트 공유"
                >
                  <Share2 className="w-4 h-4" />
                  {shareCopied ? '복사됨!' : '공유'}
                </button>
                <button onClick={onClose} className="p-1" aria-label="닫기">
                  <X className="w-5 h-5 text-[#0A0A0A]/60" />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <span
                className="px-2 py-0.5 bg-[#0A0A0A] text-white text-[11px] font-bold rounded-[6px]"
                style={{ fontFamily: 'Pretendard, sans-serif' }}
              >
                ♩ {project.bpm} BPM
              </span>
              <span
                className="px-2 py-0.5 text-[#0A0A0A] text-[11px] font-bold rounded-[6px] border-[2px] border-[#0A0A0A] bg-[#FF3D77]/10"
                style={{ fontFamily: 'Pretendard, sans-serif' }}
              >
                🎼 {project.key_signature}
              </span>
              {project.genre && (
                <span
                  className="px-2 py-0.5 bg-[#FFF8F0] border-[2px] border-[#0A0A0A]/20 text-[#0A0A0A]/60 text-[11px] font-bold rounded-[6px]"
                  style={{ fontFamily: 'Pretendard, sans-serif' }}
                >
                  {project.genre}
                </span>
              )}
            </div>
            {project.description && (
              <p
                className="text-[12px] text-[#0A0A0A]/60 mt-2 font-bold leading-relaxed"
                style={{ fontFamily: 'Pretendard, sans-serif' }}
              >
                {project.description}
              </p>
            )}

            {isOwner && (
              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={handleToggleOpen}
                  className={[
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] border-[2px] border-[#0A0A0A] text-[11px] font-bold transition-colors',
                    localIsOpen ? 'bg-[#F5FF4F] text-[#0A0A0A]' : 'bg-[#41C66B] text-white',
                  ].join(' ')}
                  style={{ fontFamily: 'Pretendard, sans-serif' }}
                >
                  {localIsOpen ? '🔒 마감하기' : '🎵 다시 열기'}
                </button>
                {onEdit && (
                  <button
                    onClick={() => onEdit(project)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] border-[2px] border-[#0A0A0A] text-[11px] font-bold bg-white hover:bg-[#FFF8F0] transition-colors"
                    style={{ fontFamily: 'Pretendard, sans-serif' }}
                  >
                    <Pencil className="w-3 h-3" /> 수정
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={() => {
                      if (confirm('프로젝트를 삭제할까요? 모든 트랙도 함께 삭제됩니다.')) {
                        onDelete(project.id);
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] border-[2px] border-[#0A0A0A] text-[11px] font-bold bg-white text-[#FF3D77] hover:bg-[#FF3D77]/10 transition-colors"
                    style={{ fontFamily: 'Pretendard, sans-serif' }}
                  >
                    <Trash2 className="w-3 h-3" /> 삭제
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto p-5 pb-10 flex flex-col gap-6">
            {/* Track list */}
            <div>
              <h3
                className="text-[15px] font-bold text-[#0A0A0A] mb-3"
                style={{ fontFamily: 'Bungee, sans-serif' }}
              >
                TRACKS 🎧
              </h3>

              {loadingTracks ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-[3px] border-[#FF3D77] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : tracks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 bg-white rounded-[16px] border-[2px] border-[#0A0A0A]/20">
                  <Music className="w-8 h-8 text-[#0A0A0A]/20 mb-2" />
                  <p
                    className="text-[13px] text-[#0A0A0A]/40 font-bold text-center"
                    style={{ fontFamily: 'Pretendard, sans-serif' }}
                  >
                    아직 트랙이 없어요
                    <br />
                    첫 번째 8마디를 올려보세요!
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {tracks.map((track) => {
                    const youtubeId = track.youtube_url ? extractYoutubeId(track.youtube_url) : null;

                    if (youtubeId) {
                      // YouTube track card
                      return (
                        <motion.div
                          key={track.id}
                          whileHover={{ y: -2 }}
                          className="flex flex-col gap-2 p-3 bg-white rounded-[14px] border-[2px] border-[#0A0A0A]"
                          style={{ boxShadow: '3px 3px 0 #0A0A0A' }}
                        >
                          {/* Thumbnail row */}
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 flex-shrink-0 rounded-full bg-[#0A0A0A] flex items-center justify-center">
                              <span
                                className="text-white text-[12px] font-bold"
                                style={{ fontFamily: 'Bungee, sans-serif' }}
                              >
                                {track.track_order}
                              </span>
                            </div>

                            {/* YouTube thumbnail */}
                            <div className="w-14 h-10 flex-shrink-0 rounded-[8px] overflow-hidden border-[2px] border-[#0A0A0A]">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={`https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`}
                                alt="YouTube thumbnail"
                                className="w-full h-full object-cover"
                              />
                            </div>

                            {/* User info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[14px]">{track.user_emoji}</span>
                                <p
                                  className="text-[12px] font-bold text-[#0A0A0A] truncate"
                                  style={{ fontFamily: 'Pretendard, sans-serif' }}
                                >
                                  {track.user_name}
                                </p>
                              </div>
                              {track.instrument && (
                                <span
                                  className="text-[10px] font-bold text-[#0A0A0A]/50"
                                  style={{ fontFamily: 'Pretendard, sans-serif' }}
                                >
                                  {track.instrument}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <span
                                className="text-[10px] text-[#0A0A0A]/30 font-bold"
                                style={{ fontFamily: 'Pretendard, sans-serif' }}
                              >
                                #{track.track_order}
                              </span>

                              <a
                                href={track.youtube_url!}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="w-7 h-7 flex items-center justify-center rounded-[8px] border-[2px] border-[#FF3D77]/40 hover:bg-[#FF3D77]/10 hover:border-[#FF3D77] transition-colors"
                              >
                                <ExternalLink className="w-3.5 h-3.5 text-[#FF3D77]" />
                              </a>

                              {(user?.id === track.user_id || isOwner) && (
                                <button
                                  onClick={() => handleDeleteTrack(track.id)}
                                  className="w-7 h-7 flex items-center justify-center rounded-[8px] border-[2px] border-[#0A0A0A]/20 hover:bg-[#FF3D77]/10 hover:border-[#FF3D77] transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-[#FF3D77]" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* YouTube badge */}
                          <div className="flex items-center gap-1.5 px-2 py-1 bg-[#FF3D77]/5 rounded-[8px] border-[1px] border-[#FF3D77]/20">
                            <Video className="w-3 h-3 text-[#FF3D77]" />
                            <span
                              className="text-[10px] font-bold text-[#FF3D77]"
                              style={{ fontFamily: 'Pretendard, sans-serif' }}
                            >
                              YouTube 백킹 트랙
                            </span>
                          </div>
                        </motion.div>
                      );
                    }

                    // Audio track card
                    return (
                      <div key={track.id}>
                        <audio
                          ref={(el) => setAudioRef(track.id, el)}
                          src={track.file_url ?? ''}
                          onEnded={() => handleAudioEnded(track.id)}
                          preload="metadata"
                        />
                        <motion.div
                          whileHover={{ y: -2 }}
                          className="flex items-center gap-3 p-3 bg-white rounded-[14px] border-[2px] border-[#0A0A0A]"
                          style={{ boxShadow: '3px 3px 0 #0A0A0A' }}
                        >
                          {/* Track number */}
                          <div className="w-8 h-8 flex-shrink-0 rounded-full bg-[#0A0A0A] flex items-center justify-center">
                            <span
                              className="text-white text-[12px] font-bold"
                              style={{ fontFamily: 'Bungee, sans-serif' }}
                            >
                              {track.track_order}
                            </span>
                          </div>

                          {/* Play/Pause */}
                          <button
                            onClick={() => handlePlayPause(track.id)}
                            className="w-9 h-9 flex-shrink-0 rounded-full bg-[#FF3D77] border-[2px] border-[#0A0A0A] flex items-center justify-center"
                            style={{ boxShadow: '2px 2px 0 #0A0A0A' }}
                          >
                            {playingId === track.id ? (
                              <Pause className="w-4 h-4 text-white fill-white" />
                            ) : (
                              <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                            )}
                          </button>

                          {/* Playing indicator */}
                          {playingId === track.id && (
                            <div className="flex items-end gap-[2px] h-5 flex-shrink-0">
                              {[0, 1, 2].map((i) => (
                                <motion.div
                                  key={i}
                                  className="w-[3px] bg-[#FF3D77] rounded-full"
                                  animate={{ height: ['6px', '16px', '6px'] }}
                                  transition={{
                                    duration: 0.6,
                                    repeat: Infinity,
                                    delay: i * 0.15,
                                    ease: 'easeInOut',
                                  }}
                                />
                              ))}
                            </div>
                          )}

                          {/* User info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[14px]">{track.user_emoji}</span>
                              <p
                                className="text-[12px] font-bold text-[#0A0A0A] truncate"
                                style={{ fontFamily: 'Pretendard, sans-serif' }}
                              >
                                {track.user_name}
                              </p>
                            </div>
                            {track.instrument && (
                              <span
                                className="text-[10px] font-bold text-[#0A0A0A]/50"
                                style={{ fontFamily: 'Pretendard, sans-serif' }}
                              >
                                {track.instrument}
                              </span>
                            )}
                          </div>

                          <span
                            className="text-[10px] text-[#0A0A0A]/30 font-bold flex-shrink-0"
                            style={{ fontFamily: 'Pretendard, sans-serif' }}
                          >
                            #{track.track_order}
                          </span>

                          <a
                            href={track.file_url ?? '#'}
                            download={`track${track.track_order}_${track.user_name}.mp3`}
                            onClick={(e) => e.stopPropagation()}
                            className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-[8px] border-[2px] border-[#0A0A0A]/20 hover:bg-[#4FC3F7]/20 hover:border-[#4FC3F7] transition-colors"
                          >
                            <Download className="w-3.5 h-3.5 text-[#4FC3F7]" />
                          </a>

                          {(user?.id === track.user_id || isOwner) && (
                            <button
                              onClick={() => handleDeleteTrack(track.id)}
                              className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-[8px] border-[2px] border-[#0A0A0A]/20 hover:bg-[#FF3D77]/10 hover:border-[#FF3D77] transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-[#FF3D77]" />
                            </button>
                          )}
                        </motion.div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Upload panel */}
            {localIsOpen && user && (
              <div>
                <h3
                  className="text-[15px] font-bold text-[#0A0A0A] mb-3"
                  style={{ fontFamily: 'Bungee, sans-serif' }}
                >
                  내 8마디 올리기 ➕
                </h3>
                <TrackUploadPanel
                  user={user}
                  projectId={project.id}
                  trackOrder={tracks.length + 1}
                  onUploaded={() => {
                    fetchTracks();
                    onUpdate();
                  }}
                />
              </div>
            )}

            {/* Login nudge */}
            {localIsOpen && !user && (
              <div className="flex flex-col items-center py-6 bg-white rounded-[16px] border-[2px] border-[#0A0A0A]/20">
                <p
                  className="text-[13px] font-bold text-[#0A0A0A]/50 text-center"
                  style={{ fontFamily: 'Pretendard, sans-serif' }}
                >
                  트랙을 추가하려면 로그인이 필요해요 🎵
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
