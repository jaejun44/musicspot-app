'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

const KEY_OPTIONS = [
  'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B',
  'Cm', 'C#m', 'Dm', 'D#m', 'Em', 'Fm', 'F#m', 'Gm', 'G#m', 'Am', 'A#m', 'Bm',
];
const GENRE_PRESETS = ['팝', '록', '재즈', '힙합', 'R&B', '발라드', '인디', '일렉트로닉', '포크', '클래식'];

interface Props {
  user: User;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateProjectModal({ user, onClose, onSuccess }: Props) {
  const [title, setTitle] = useState('');
  const [bpm, setBpm] = useState(120);
  const [keySignature, setKeySignature] = useState('C');
  const [genre, setGenre] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const creatorName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split('@')[0] ||
    '익명';

  async function handleSubmit() {
    if (!title.trim() || loading) return;
    setLoading(true);
    await supabase.from('stem_projects').insert({
      title: title.trim(),
      creator_id: user.id,
      creator_name: creatorName,
      creator_emoji: '🎵',
      bpm,
      key_signature: keySignature,
      genre: genre.trim() || null,
      description: description.trim() || null,
      is_open: true,
    });
    setLoading(false);
    onSuccess();
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-[#0A0A0A]/60 backdrop-blur-sm flex items-end justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 32 }}
          className="w-full max-w-2xl bg-[#FFF8F0] rounded-t-[28px] border-t-[3px] border-x-[3px] border-[#0A0A0A] p-6 pb-10 max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* handle */}
          <div className="w-10 h-1.5 bg-[#0A0A0A]/20 rounded-full mx-auto mb-5" />

          <div className="flex items-center justify-between mb-5">
            <h2
              className="text-[18px] font-bold text-[#0A0A0A]"
              style={{ fontFamily: 'Bungee, sans-serif' }}
            >
              새 프로젝트 🎵
            </h2>
            <button onClick={onClose} className="p-1">
              <X className="w-5 h-5 text-[#0A0A0A]/60" />
            </button>
          </div>

          <div className="flex flex-col gap-4">
            {/* 제목 */}
            <div>
              <label
                className="text-[12px] font-bold text-[#0A0A0A]/60 mb-1.5 block"
                style={{ fontFamily: 'Pretendard, sans-serif' }}
              >
                프로젝트 이름 *
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: 여름밤 발라드 릴레이"
                className="w-full px-4 py-3 bg-white rounded-[12px] border-[2px] border-[#0A0A0A] text-[14px] font-bold outline-none focus:border-[#FF3D77]"
                style={{ fontFamily: 'Pretendard, sans-serif', boxShadow: '3px 3px 0 #0A0A0A' }}
              />
            </div>

            {/* BPM */}
            <div>
              <label
                className="text-[12px] font-bold text-[#0A0A0A]/60 mb-1.5 block"
                style={{ fontFamily: 'Pretendard, sans-serif' }}
              >
                BPM ♩ {bpm}
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={60}
                  max={200}
                  value={bpm}
                  onChange={(e) => setBpm(Number(e.target.value))}
                  className="flex-1 h-2 rounded-full accent-[#FF3D77]"
                />
                <input
                  type="number"
                  min={40}
                  max={300}
                  value={bpm}
                  onChange={(e) => setBpm(Number(e.target.value))}
                  className="w-16 px-2 py-1.5 bg-white rounded-[10px] border-[2px] border-[#0A0A0A] text-[13px] font-bold text-center outline-none"
                  style={{ fontFamily: 'Pretendard, sans-serif' }}
                />
              </div>
            </div>

            {/* Key */}
            <div>
              <label
                className="text-[12px] font-bold text-[#0A0A0A]/60 mb-1.5 block"
                style={{ fontFamily: 'Pretendard, sans-serif' }}
              >
                조성 (Key)
              </label>
              <div className="flex flex-wrap gap-1.5">
                {KEY_OPTIONS.map((k) => (
                  <button
                    key={k}
                    onClick={() => setKeySignature(k)}
                    className={[
                      'px-2.5 py-1 rounded-[8px] border-[2px] border-[#0A0A0A] text-[12px] font-bold transition-colors',
                      keySignature === k ? 'bg-[#FF3D77] text-white' : 'bg-white text-[#0A0A0A]',
                    ].join(' ')}
                    style={{ fontFamily: 'Pretendard, sans-serif' }}
                  >
                    {k}
                  </button>
                ))}
              </div>
            </div>

            {/* 장르 */}
            <div>
              <label
                className="text-[12px] font-bold text-[#0A0A0A]/60 mb-1.5 block"
                style={{ fontFamily: 'Pretendard, sans-serif' }}
              >
                장르 (선택)
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {GENRE_PRESETS.map((g) => (
                  <button
                    key={g}
                    onClick={() => setGenre(genre === g ? '' : g)}
                    className={[
                      'px-3 py-1 rounded-[10px] border-[2px] border-[#0A0A0A] text-[12px] font-bold transition-colors',
                      genre === g ? 'bg-[#4FC3F7] text-[#0A0A0A]' : 'bg-white text-[#0A0A0A]',
                    ].join(' ')}
                    style={{ fontFamily: 'Pretendard, sans-serif' }}
                  >
                    {g}
                  </button>
                ))}
              </div>
              <input
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                placeholder="직접 입력..."
                className="w-full px-4 py-2.5 bg-white rounded-[12px] border-[2px] border-[#0A0A0A] text-[13px] font-bold outline-none focus:border-[#4FC3F7]"
                style={{ fontFamily: 'Pretendard, sans-serif' }}
              />
            </div>

            {/* 설명 */}
            <div>
              <label
                className="text-[12px] font-bold text-[#0A0A0A]/60 mb-1.5 block"
                style={{ fontFamily: 'Pretendard, sans-serif' }}
              >
                설명 (선택)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="어떤 분위기인지, 어떤 악기가 필요한지 알려주세요"
                rows={3}
                className="w-full px-4 py-3 bg-white rounded-[12px] border-[2px] border-[#0A0A0A] text-[13px] font-bold outline-none focus:border-[#4FC3F7] resize-none"
                style={{ fontFamily: 'Pretendard, sans-serif' }}
              />
            </div>

            <motion.button
              whileTap={{ scale: 0.96, y: 2 }}
              onClick={handleSubmit}
              disabled={!title.trim() || loading}
              className="w-full py-4 bg-[#FF3D77] rounded-[16px] border-[3px] border-[#0A0A0A] text-white font-bold text-[15px] disabled:opacity-60"
              style={{ boxShadow: '4px 4px 0 #0A0A0A', fontFamily: 'Bungee, sans-serif' }}
            >
              {loading ? '생성 중...' : '🎵 프로젝트 시작!'}
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
