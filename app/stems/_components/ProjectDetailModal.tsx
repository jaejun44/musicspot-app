'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Pause, Upload, Music } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import { StemProject } from './StemsClient';

const INSTRUMENTS = ['보컬', '기타', '베이스', '드럼', '건반', '현악기', '관악기', '기타악기'];
const MAX_FILE_BYTES = 30 * 1024 * 1024;

interface StemTrack {
  id: string;
  project_id: string;
  user_id: string | null;
  user_name: string;
  user_emoji: string;
  file_url: string;
  instrument: string | null;
  track_order: number;
  created_at: string;
}

interface Props {
  project: StemProject;
  user: User | null;
  onClose: () => void;
  onUpdate: () => void;
}

export default function ProjectDetailModal({ project, user, onClose, onUpdate }: Props) {
  const [tracks, setTracks] = useState<StemTrack[]>([]);
  const [loadingTracks, setLoadingTracks] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());

  const [file, setFile] = useState<File | null>(null);
  const [instrument, setInstrument] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  useEffect(() => {
    fetchTracks();
  }, [project.id]);

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

  async function handleUpload() {
    if (!file || !user || uploading) return;
    setUploadError('');

    if (file.size > MAX_FILE_BYTES) {
      setUploadError('파일 크기는 30MB 이하여야 합니다.');
      return;
    }

    setUploading(true);
    const ext = file.name.split('.').pop() ?? 'mp3';
    const path = `${project.id}/${user.id}_${Date.now()}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from('stems')
      .upload(path, file, { contentType: file.type });

    if (uploadErr) {
      setUploadError('업로드 실패: ' + uploadErr.message);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from('stems').getPublicUrl(path);
    const fileUrl = urlData.publicUrl;

    const userName =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split('@')[0] ||
      '익명';

    const { error: insertErr } = await supabase.from('stem_tracks').insert({
      project_id: project.id,
      user_id: user.id,
      user_name: userName,
      user_emoji: '🎵',
      file_url: fileUrl,
      instrument: instrument.trim() || null,
      track_order: tracks.length + 1,
    });

    if (insertErr) {
      setUploadError('트랙 저장 실패: ' + insertErr.message);
      setUploading(false);
      return;
    }

    setFile(null);
    setInstrument('');
    setUploading(false);
    fetchTracks();
    onUpdate();
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
                    project.is_open ? 'bg-[#41C66B] text-white' : 'bg-[#0A0A0A]/10 text-[#0A0A0A]/50',
                  ].join(' ')}
                  style={{ fontFamily: 'Pretendard, sans-serif' }}
                >
                  {project.is_open ? '🎵 참여중' : '🔒 마감'}
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
              <button onClick={onClose} className="p-1 flex-shrink-0">
                <X className="w-5 h-5 text-[#0A0A0A]/60" />
              </button>
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
                  {tracks.map((track) => (
                    <div key={track.id}>
                      <audio
                        ref={(el) => setAudioRef(track.id, el)}
                        src={track.file_url}
                        onEnded={() => handleAudioEnded(track.id)}
                        preload="metadata"
                      />
                      <motion.div
                        whileHover={{ y: -2 }}
                        className="flex items-center gap-3 p-3 bg-white rounded-[14px] border-[2px] border-[#0A0A0A]"
                        style={{ boxShadow: '3px 3px 0 #0A0A0A' }}
                      >
                        {/* Track number */}
                        <div
                          className="w-8 h-8 flex-shrink-0 rounded-full bg-[#0A0A0A] flex items-center justify-center"
                        >
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
                      </motion.div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Upload section */}
            {project.is_open && user && (
              <div>
                <h3
                  className="text-[15px] font-bold text-[#0A0A0A] mb-3"
                  style={{ fontFamily: 'Bungee, sans-serif' }}
                >
                  내 8마디 올리기 ➕
                </h3>

                <div className="flex flex-col gap-3">
                  {/* File drop area */}
                  <label
                    className={[
                      'flex flex-col items-center justify-center p-6 rounded-[16px] border-[3px] border-dashed cursor-pointer transition-colors',
                      file ? 'border-[#41C66B] bg-[#41C66B]/10' : 'border-[#0A0A0A]/30 bg-white hover:border-[#FF3D77] hover:bg-[#FF3D77]/5',
                    ].join(' ')}
                  >
                    <Upload
                      className={`w-8 h-8 mb-2 ${file ? 'text-[#41C66B]' : 'text-[#0A0A0A]/30'}`}
                    />
                    <p
                      className={`text-[13px] font-bold text-center ${file ? 'text-[#41C66B]' : 'text-[#0A0A0A]/50'}`}
                      style={{ fontFamily: 'Pretendard, sans-serif' }}
                    >
                      {file ? `✅ ${file.name}` : '오디오 파일 선택\nMP3, WAV, OGG, M4A, FLAC (30MB 이하)'}
                    </p>
                    <input
                      type="file"
                      accept=".mp3,.wav,.ogg,.m4a,.aac,.flac,audio/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0] ?? null;
                        setFile(f);
                        setUploadError('');
                      }}
                    />
                  </label>

                  {/* Instrument chips */}
                  <div>
                    <p
                      className="text-[11px] font-bold text-[#0A0A0A]/50 mb-2"
                      style={{ fontFamily: 'Pretendard, sans-serif' }}
                    >
                      파트 (선택)
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {INSTRUMENTS.map((inst) => (
                        <button
                          key={inst}
                          onClick={() => setInstrument(instrument === inst ? '' : inst)}
                          className={[
                            'px-2.5 py-1 rounded-[8px] border-[2px] border-[#0A0A0A] text-[11px] font-bold transition-colors',
                            instrument === inst ? 'bg-[#4FC3F7] text-[#0A0A0A]' : 'bg-white text-[#0A0A0A]',
                          ].join(' ')}
                          style={{ fontFamily: 'Pretendard, sans-serif' }}
                        >
                          {inst}
                        </button>
                      ))}
                    </div>
                  </div>

                  {uploadError && (
                    <p
                      className="text-[12px] font-bold text-[#FF3D77]"
                      style={{ fontFamily: 'Pretendard, sans-serif' }}
                    >
                      ⚠️ {uploadError}
                    </p>
                  )}

                  <motion.button
                    whileTap={{ scale: 0.96, y: 2 }}
                    onClick={handleUpload}
                    disabled={!file || uploading}
                    className="w-full py-3.5 bg-[#FF3D77] rounded-[14px] border-[3px] border-[#0A0A0A] text-white font-bold text-[14px] disabled:opacity-50"
                    style={{ boxShadow: '4px 4px 0 #0A0A0A', fontFamily: 'Bungee, sans-serif' }}
                  >
                    {uploading ? '업로드 중...' : '🎵 트랙 추가!'}
                  </motion.button>
                </div>
              </div>
            )}

            {/* Login nudge */}
            {project.is_open && !user && (
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
