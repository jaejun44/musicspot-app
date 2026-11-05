'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { track } from '@/lib/analytics';
import { SLOT_START_TIME, VOTE_SLOTS, topKey, upcomingDates, type Vote, type VoteSlot, type VoteTally } from '@/lib/votes';

interface Props {
  vote: Vote;
  tally: VoteTally;
  studio: { id: string; name: string; address: string | null };
}

interface MyBand {
  id: string;
  name: string;
}

const NEW_BAND = '__new__';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.musicspotfest.com';

/**
 * 결정된 투표 → 내 밴드(bands) 합주 일정(band_schedules)으로 저장. 로그인 필요.
 * 밴드가 없으면 여기서 만든다(MyBandClient와 같은 방식: bands + 본인 leader 행).
 * 날짜·시간대는 표가 가장 많은 값으로 채워 두고 고칠 수 있게 한다.
 */
export default function VoteSaveToBand({ vote, tally, studio }: Props) {
  const { user, loading } = useAuth();
  const [bands, setBands] = useState<MyBand[] | null>(null);
  const [bandId, setBandId] = useState<string>(NEW_BAND);
  const [bandName, setBandName] = useState('');
  const [date, setDate] = useState(
    () => topKey(tally.dates, vote.date_options) ?? upcomingDates(new Date(), 1)[0],
  );
  const [slot, setSlot] = useState<VoteSlot>(
    () => (topKey(tally.slots, VOTE_SLOTS.map((s) => s.key)) as VoteSlot | null) ?? 'evening',
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedBandId, setSavedBandId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: memberRows, error: memberErr } = await supabase
        .from('band_members')
        .select('band_id')
        .eq('user_id', user.id);
      if (memberErr) console.error('[VoteSaveToBand] 내 밴드 조회 실패', memberErr.message);
      const ids = (memberRows ?? []).map((r) => r.band_id as string);
      if (ids.length === 0) {
        setBands([]);
        return;
      }
      const { data: bandRows, error: bandErr } = await supabase
        .from('bands')
        .select('id, name')
        .in('id', ids)
        .order('created_at', { ascending: false });
      if (bandErr) console.error('[VoteSaveToBand] 밴드 이름 조회 실패', bandErr.message);
      const list = (bandRows ?? []) as MyBand[];
      setBands(list);
      if (list.length > 0) setBandId(list[0].id);
    })();
  }, [user]);

  async function handleSave() {
    if (!user) return;
    if (bandId === NEW_BAND && !bandName.trim()) {
      setError('밴드 이름을 적어 주세요.');
      return;
    }
    setBusy(true);
    setError(null);

    let targetId = bandId;
    const isNewBand = bandId === NEW_BAND;
    if (isNewBand) {
      const { data: band, error: bandErr } = await supabase
        .from('bands')
        .insert({ name: bandName.trim(), created_by: user.id })
        .select('id')
        .single();
      if (bandErr || !band) {
        console.error('[VoteSaveToBand] bands insert 실패', bandErr);
        setError(`밴드를 만들지 못했어요. (${bandErr?.message ?? '응답 없음'})`);
        setBusy(false);
        return;
      }
      const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || '뮤지션';
      const { error: memberErr } = await supabase
        .from('band_members')
        .insert({ band_id: band.id, user_id: user.id, role: 'leader', display_name: displayName });
      if (memberErr) {
        console.error('[VoteSaveToBand] band_members insert 실패', memberErr);
        setError(`밴드 멤버 등록에 실패했어요. (${memberErr.message})`);
        setBusy(false);
        return;
      }
      targetId = band.id;
    }

    const { error: scheduleErr } = await supabase.from('band_schedules').insert({
      band_id: targetId,
      created_by: user.id,
      title: `합주 · ${studio.name}`,
      date,
      start_time: SLOT_START_TIME[slot],
      location: [studio.name, studio.address].filter(Boolean).join(' · '),
      notes: `투표: ${SITE_URL}/vote/${vote.id}`,
    });
    if (scheduleErr) {
      console.error('[VoteSaveToBand] band_schedules insert 실패', scheduleErr);
      setError(`일정을 저장하지 못했어요. (${scheduleErr.message})`);
      setBusy(false);
      return;
    }

    track('vote_band_save', { vote_id: vote.id, is_new_band: isNewBand });
    setSavedBandId(targetId);
    setBusy(false);
  }

  const box = 'bg-white rounded-[20px] border-[3px] border-[#0A0A0A] p-5';
  const shadow = { boxShadow: '6px 6px 0 #0A0A0A' };

  if (savedBandId) {
    return (
      <div className={box} style={shadow}>
        <p className="text-[15px] font-bold text-[#0A0A0A]">📌 우리 밴드 일정에 저장했어요</p>
        <Link
          href={`/my-band/${savedBandId}`}
          className="mt-3 inline-block px-4 py-2 bg-[#4FC3F7] rounded-[12px] border-[2px] border-[#0A0A0A] text-[14px] font-bold"
          style={{ boxShadow: '3px 3px 0 #0A0A0A' }}
        >
          내 밴드에서 보기 →
        </Link>
      </div>
    );
  }

  return (
    <div className={box} style={shadow}>
      <p className="text-[15px] font-bold text-[#0A0A0A]">📌 우리 밴드 합주 일정으로 저장</p>
      <p className="text-[12px] text-[#0A0A0A]/50 mt-0.5 mb-3">내 밴드 캘린더에 남겨 두면 다음 합주 때 바로 찾을 수 있어요.</p>

      {loading ? null : !user ? (
        <Link
          href={`/login?returnTo=${encodeURIComponent(`/vote/${vote.id}`)}`}
          className="flex items-center justify-center w-full py-3 bg-white rounded-[14px] border-[2px] border-[#0A0A0A] text-[14px] font-bold"
          style={{ boxShadow: '3px 3px 0 #0A0A0A' }}
        >
          로그인하고 저장하기 →
        </Link>
      ) : bands === null ? (
        <p className="text-[13px] text-[#0A0A0A]/50">내 밴드를 불러오는 중…</p>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {bands.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setBandId(b.id)}
                aria-pressed={bandId === b.id}
                className={`px-3 py-1.5 rounded-[10px] border-[2px] border-[#0A0A0A] text-[13px] font-bold ${
                  bandId === b.id ? 'bg-[#F5FF4F]' : 'bg-white'
                }`}
              >
                🎸 {b.name}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setBandId(NEW_BAND)}
              aria-pressed={bandId === NEW_BAND}
              className={`px-3 py-1.5 rounded-[10px] border-[2px] border-[#0A0A0A] text-[13px] font-bold ${
                bandId === NEW_BAND ? 'bg-[#F5FF4F]' : 'bg-white'
              }`}
            >
              + 새 밴드
            </button>
          </div>
          {bandId === NEW_BAND && (
            <input
              value={bandName}
              onChange={(e) => setBandName(e.target.value)}
              maxLength={30}
              placeholder="밴드 이름"
              aria-label="밴드 이름"
              className="w-full px-4 py-3 rounded-[12px] border-[2px] border-[#0A0A0A] bg-white text-[15px]"
            />
          )}
          <div className="flex gap-2">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              aria-label="합주 날짜"
              className="flex-1 min-w-0 px-3 py-2.5 rounded-[12px] border-[2px] border-[#0A0A0A] bg-white text-[14px]"
            />
            <select
              value={slot}
              onChange={(e) => setSlot(e.target.value as VoteSlot)}
              aria-label="시간대"
              className="px-3 py-2.5 rounded-[12px] border-[2px] border-[#0A0A0A] bg-white text-[14px] font-bold"
            >
              {VOTE_SLOTS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label} {SLOT_START_TIME[s.key]}
                </option>
              ))}
            </select>
          </div>
          {error && (
            <p role="alert" className="text-[13px] font-bold text-[#FF3D77]">
              {error}
            </p>
          )}
          <motion.button
            type="button"
            onClick={handleSave}
            disabled={busy || !date}
            whileTap={{ scale: 0.97, y: 1 }}
            className="w-full py-3 bg-[#4FC3F7] rounded-[14px] border-[3px] border-[#0A0A0A] text-[15px] font-bold disabled:opacity-60"
            style={{ boxShadow: '4px 4px 0 #0A0A0A' }}
          >
            {busy ? '저장 중…' : '밴드 일정에 저장'}
          </motion.button>
        </div>
      )}
    </div>
  );
}
