'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { track } from '@/lib/analytics';
import { getClientCountry } from '@/lib/geo';
import { useLocale, useT } from '@/lib/i18n';

// 온라인 잼 방 열기. 방 정보(SonoBus 그룹·비밀번호)는 저장하지 않는다 — 서버가 세션 id로 만든다.

interface Props {
  open: boolean;
  user: User;
  onClose: () => void;
  onCreated: () => void;
}

const FONT = { fontFamily: 'Pretendard, sans-serif' };
const POSITIONS = [
  { value: '보컬', emoji: '🎤' },
  { value: '기타', emoji: '🎸' },
  { value: '베이스', emoji: '🎵' },
  { value: '드럼', emoji: '🥁' },
  { value: '건반', emoji: '🎹' },
];
const CAPACITIES = [2, 3, 4, 5, 6, 7, 8];
const TITLE_MAX = 60;
const DESCRIPTION_MAX = 300;

/** <input type="datetime-local"> 값(로컬 시각). 기본은 다음 정각 */
function nextHourLocal(): string {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return toLocalInput(d);
}

function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function CreateJamSheet({ open, user, onClose, onCreated }: Props) {
  const t = useT();
  const locale = useLocale();
  const [title, setTitle] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [capacity, setCapacity] = useState(4);
  const [wanted, setWanted] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTitle('');
    setStartsAt(nextHourLocal());
    setCapacity(4);
    setWanted([]);
    setDescription('');
    setError(null);
  }, [open]);

  async function submit() {
    const trimmed = title.trim();
    if (!trimmed) { setError(t('제목을 입력해 주세요.')); return; }
    const start = new Date(startsAt);
    if (Number.isNaN(start.getTime())) { setError(t('시작 시간을 골라 주세요.')); return; }
    if (start.getTime() < Date.now() - 5 * 60 * 1000) { setError(t('시작 시간은 지금 이후로 골라 주세요.')); return; }

    setSaving(true);
    setError(null);
    const { error: insertError } = await supabase.from('jam_sessions').insert({
      host_id: user.id,
      title: trimmed,
      description: description.trim() || null,
      instruments_wanted: wanted,
      starts_at: start.toISOString(),
      capacity,
      country: getClientCountry() ?? 'KR',
      language: locale,
    });
    setSaving(false);
    if (insertError) {
      console.error('[jam-sessions] create failed', insertError);
      setError(t('잼 방을 열지 못했어요. 잠시 후 다시 시도해 주세요.'));
      return;
    }
    track('match_jam_session_create', {
      capacity,
      instrument_count: wanted.length,
      has_description: !!description.trim(),
    });
    onCreated();
  }

  const labelClass = 'text-[12px] font-bold text-[#0A0A0A]/60';
  const inputClass = 'w-full px-3 py-2.5 rounded-[12px] border-[2px] border-[#0A0A0A]/20 bg-[#FFF8F0] text-[14px] font-bold text-[#0A0A0A] outline-none focus:border-[#FF3D77]';

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#0A0A0A]/50 z-[60]"
          />
          <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 280, damping: 24 }}
            className="fixed bottom-0 left-0 right-0 z-[60] px-4 pb-6"
          >
            <div
              className="bg-white rounded-[24px] border-[3px] border-[#0A0A0A] max-w-sm mx-auto flex flex-col"
              style={{ boxShadow: '6px 6px 0 #0A0A0A', maxHeight: '85vh' }}
            >
              <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b-[2px] border-[#0A0A0A]/10 flex-shrink-0">
                <p className="text-[15px] font-bold text-[#0A0A0A]" style={FONT}>{t('🎧 잼 방 열기')}</p>
                <motion.button onClick={onClose} whileTap={{ scale: 0.9 }} aria-label={t('닫기')} className="w-8 h-8 rounded-full bg-[#0A0A0A]/10 flex items-center justify-center">
                  <X className="w-4 h-4 text-[#0A0A0A]" />
                </motion.button>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
                <label className="flex flex-col gap-1.5">
                  <span className={labelClass} style={FONT}>{t('제목')}</span>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value.slice(0, TITLE_MAX))}
                    placeholder={t('예: 오늘 밤 블루스 잼')}
                    className={inputClass}
                    style={FONT}
                  />
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className={labelClass} style={FONT}>{t('시작 시간')}</span>
                  <input
                    type="datetime-local"
                    value={startsAt}
                    min={toLocalInput(new Date())}
                    onChange={(e) => setStartsAt(e.target.value)}
                    className={inputClass}
                    style={FONT}
                  />
                </label>

                <div className="flex flex-col gap-1.5">
                  <span className={labelClass} style={FONT}>{t('인원 (나 포함)')}</span>
                  <div className="flex flex-wrap gap-1.5">
                    {CAPACITIES.map((n) => (
                      <motion.button
                        key={n}
                        type="button"
                        whileTap={{ scale: 0.92 }}
                        onClick={() => setCapacity(n)}
                        className={`w-10 h-10 rounded-[12px] border-[2px] border-[#0A0A0A] text-[14px] font-bold ${capacity === n ? 'bg-[#FF3D77] text-white' : 'bg-white text-[#0A0A0A]'}`}
                        style={{ boxShadow: '2px 2px 0 #0A0A0A', ...FONT }}
                      >
                        {n}
                      </motion.button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className={labelClass} style={FONT}>{t('구하는 악기 (선택)')}</span>
                  <div className="flex flex-wrap gap-1.5">
                    {POSITIONS.map((p) => {
                      const active = wanted.includes(p.value);
                      return (
                        <motion.button
                          key={p.value}
                          type="button"
                          whileTap={{ scale: 0.92 }}
                          onClick={() => setWanted(active ? wanted.filter((w) => w !== p.value) : [...wanted, p.value])}
                          className={`px-3 py-1.5 rounded-[12px] border-[2px] border-[#0A0A0A] text-[13px] font-bold ${active ? 'bg-[#4FC3F7]' : 'bg-white'} text-[#0A0A0A]`}
                          style={{ boxShadow: '2px 2px 0 #0A0A0A', ...FONT }}
                        >
                          {p.emoji} {t(p.value)}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                <label className="flex flex-col gap-1.5">
                  <span className={labelClass} style={FONT}>{t('한 줄 소개 (선택)')}</span>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value.slice(0, DESCRIPTION_MAX))}
                    rows={2}
                    placeholder={t('예: 12마디 블루스 A키, 편하게 즉흥해요')}
                    className={`${inputClass} resize-none`}
                    style={FONT}
                  />
                </label>

                {error && (
                  <p className="text-[12px] font-bold text-[#FF3D77]" style={FONT}>{error}</p>
                )}
              </div>

              <div className="px-5 pb-5 pt-3 border-t-[2px] border-[#0A0A0A]/10 flex-shrink-0">
                <motion.button
                  whileTap={{ scale: 0.95, x: 2, y: 2 }}
                  disabled={saving}
                  onClick={submit}
                  className="w-full py-3.5 bg-[#FF3D77] rounded-[14px] border-[2px] border-[#0A0A0A] font-bold text-[14px] text-white disabled:opacity-50"
                  style={{ boxShadow: '3px 3px 0 #0A0A0A', ...FONT }}
                >
                  {saving ? t('여는 중...') : t('잼 방 열기')}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
