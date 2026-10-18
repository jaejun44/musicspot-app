'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { User } from '@supabase/supabase-js';
import { Headphones, MessageCircle, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { track } from '@/lib/analytics';
import { getClientCountry } from '@/lib/geo';
import { useLocale, useT } from '@/lib/i18n';
import JamRoomSheet from './JamRoomSheet';
import CreateJamSheet from './CreateJamSheet';

// 밴드찾기 > 온라인 잼: 누구나 잼 방을 열고, 다른 사람이 참가한다.
// 참가하면 SonoBus 방 정보(JamRoomSheet)가 열리고, 마지막은 오프라인 합주로 이어진다.

export interface JamProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  bio: string | null;
  instruments: string[];
  genres: string[];
  region: string | null;
  purposes: string[];
  looking_for: string | null;
  avatar_url: string | null;
}

interface JamSession {
  id: string;
  host_id: string;
  title: string;
  description: string | null;
  instruments_wanted: string[];
  starts_at: string;
  capacity: number;
}

interface Props {
  user: User | null;
  /** 멤버에게 1:1 메시지 (ChatModal) */
  onMessage: (userId: string, profile?: JamProfile) => void;
}

type JoinResult = 'joined' | 'already' | 'full' | 'closed' | 'host' | 'not_found';

const FONT = { fontFamily: 'Pretendard, sans-serif' };
/** 시작 후 이 시간이 지나면 목록에서 내린다 */
const LIST_WINDOW_MS = 3 * 60 * 60 * 1000;
const POSITION_EMOJIS: Record<string, string> = {
  '보컬': '🎤', '기타': '🎸', '베이스': '🎵', '드럼': '🥁', '건반': '🎹',
};
const PROFILE_COLUMNS = 'id, user_id, display_name, bio, instruments, genres, region, purposes, looking_for, avatar_url';

export default function JamSessionsTab({ user, onMessage }: Props) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const [sessions, setSessions] = useState<JamSession[]>([]);
  const [members, setMembers] = useState<Record<string, string[]>>({});
  const [profiles, setProfiles] = useState<Record<string, JamProfile>>({});
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [createOpen, setCreateOpen] = useState(false);
  const [roomFor, setRoomFor] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const viewTracked = useRef(false);

  const load = useCallback(async () => {
    const since = new Date(Date.now() - LIST_WINDOW_MS).toISOString();
    const { data: rows, error } = await supabase
      .from('jam_sessions')
      .select('id, host_id, title, description, instruments_wanted, starts_at, capacity')
      .eq('status', 'open')
      .gte('starts_at', since)
      .order('starts_at', { ascending: true });
    if (error) {
      console.error('[jam-sessions] list failed', error);
      setStatus('error');
      return;
    }
    const list = (rows ?? []) as JamSession[];

    const memberMap: Record<string, string[]> = {};
    if (list.length > 0) {
      const { data: parts, error: partsError } = await supabase
        .from('jam_participants')
        .select('session_id, user_id')
        .in('session_id', list.map((s) => s.id))
        .order('created_at', { ascending: true });
      if (partsError) {
        console.error('[jam-sessions] participants failed', partsError);
        setStatus('error');
        return;
      }
      for (const p of parts ?? []) (memberMap[p.session_id] ??= []).push(p.user_id);
    }

    const userIds = Array.from(new Set(list.flatMap((s) => [s.host_id, ...(memberMap[s.id] ?? [])])));
    const profileMap: Record<string, JamProfile> = {};
    if (userIds.length > 0) {
      const { data: profs } = await supabase.from('user_profiles').select(PROFILE_COLUMNS).in('user_id', userIds);
      for (const p of (profs ?? []) as JamProfile[]) profileMap[p.user_id] = p;
    }

    setSessions(list);
    setMembers(memberMap);
    setProfiles(profileMap);
    setStatus('ready');
    if (!viewTracked.current) {
      viewTracked.current = true;
      track('match_jam_tab_view', { session_count: list.length });
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function requireLogin(): boolean {
    if (user) return true;
    router.push('/login');
    return false;
  }

  async function join(session: JamSession) {
    if (!requireLogin()) return;
    setBusyId(session.id);
    const { data, error } = await supabase.rpc('join_jam_session', {
      p_session_id: session.id,
      p_country: getClientCountry() ?? 'KR',
      p_language: locale,
    });
    setBusyId(null);
    if (error) {
      console.error('[jam-sessions] join failed', error);
      track('match_jam_session_join', { session_id: session.id, result: 'error' });
      alert(t('참가하지 못했어요. 잠시 후 다시 시도해 주세요.'));
      return;
    }
    const result = data as JoinResult;
    track('match_jam_session_join', { session_id: session.id, result });
    if (result === 'joined' || result === 'already' || result === 'host') {
      await load();
      setRoomFor(session.id);
    } else if (result === 'full') {
      alert(t('정원이 찼어요.'));
      await load();
    } else {
      alert(t('마감된 방이에요.'));
      await load();
    }
  }

  async function leave(session: JamSession) {
    if (!user || !confirm(t('이 잼 방에서 나갈까요?'))) return;
    setBusyId(session.id);
    const { error } = await supabase.from('jam_participants').delete()
      .eq('session_id', session.id).eq('user_id', user.id);
    setBusyId(null);
    if (error) {
      console.error('[jam-sessions] leave failed', error);
      alert(t('나가지 못했어요. 잠시 후 다시 시도해 주세요.'));
      return;
    }
    await load();
  }

  async function close(session: JamSession) {
    if (!user || !confirm(t('잼 방을 마감할까요? 목록에서 사라져요.'))) return;
    setBusyId(session.id);
    const { error } = await supabase.from('jam_sessions').update({ status: 'closed' })
      .eq('id', session.id).eq('host_id', user.id);
    setBusyId(null);
    if (error) {
      console.error('[jam-sessions] close failed', error);
      alert(t('마감하지 못했어요. 잠시 후 다시 시도해 주세요.'));
      return;
    }
    await load();
  }

  const timeFormat = new Intl.DateTimeFormat(locale === 'ja' ? 'ja-JP' : 'ko-KR', {
    month: 'numeric', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit',
  });

  function nameOf(userId: string): string {
    return profiles[userId]?.display_name ?? t('뮤지션');
  }

  function emojiOf(userId: string): string {
    return POSITION_EMOJIS[profiles[userId]?.instruments?.[0] ?? ''] ?? '🎶';
  }

  return (
    <>
      {/* 안내 */}
      <div className="px-4 pb-4 max-w-2xl mx-auto">
        <div
          className="bg-[#242447] rounded-[16px] border-[3px] border-[#0A0A0A] px-4 py-3"
          style={{ boxShadow: '4px 4px 0 #0A0A0A' }}
        >
          <p className="text-[14px] font-bold text-white" style={FONT}>
            {t('🎧 각자 집에서 온라인으로 먼저 잼해요')}
          </p>
          <p className="text-[12px] font-bold text-white/70 mt-1 leading-relaxed" style={FONT}>
            {t('무료 앱 SonoBus로 같이 연주하고, 합이 맞으면 합주실에서 만나요.')}
          </p>
        </div>
      </div>

      <div className="px-4 pb-32 max-w-2xl mx-auto">
        {status === 'loading' && (
          <p className="py-16 text-center text-[13px] font-bold text-[#0A0A0A]/50" style={FONT}>
            {t('잼 방을 불러오는 중...')}
          </p>
        )}

        {status === 'error' && (
          <div className="py-16 flex flex-col items-center gap-3">
            <p className="text-[13px] font-bold text-[#0A0A0A]/60" style={FONT}>
              {t('잼 방을 불러오지 못했어요.')}
            </p>
            <motion.button
              whileTap={{ scale: 0.95, x: 2, y: 2 }}
              onClick={() => { setStatus('loading'); load(); }}
              className="px-4 py-2 bg-white rounded-[12px] border-[2px] border-[#0A0A0A] text-[13px] font-bold"
              style={{ boxShadow: '2px 2px 0 #0A0A0A', ...FONT }}
            >
              {t('다시 시도')}
            </motion.button>
          </div>
        )}

        {status === 'ready' && sessions.length === 0 && (
          <div className="py-16 flex flex-col items-center gap-3 text-center">
            <span className="text-[48px]">🎧</span>
            <p className="text-[15px] font-bold text-[#0A0A0A]/60" style={FONT}>
              {t('아직 열린 잼 방이 없어요.')}<br />{t('첫 번째 잼 방을 열어보세요!')}
            </p>
          </div>
        )}

        {status === 'ready' && sessions.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {sessions.map((s) => {
              const participantIds = members[s.id] ?? [];
              const count = participantIds.length + 1; // + 호스트
              const isHost = user?.id === s.host_id;
              const isMember = isHost || (!!user && participantIds.includes(user.id));
              const isFull = count >= s.capacity;
              const started = new Date(s.starts_at).getTime() <= Date.now();
              const busy = busyId === s.id;
              return (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-[16px] border-[3px] border-[#0A0A0A] p-4 flex flex-col gap-3"
                  style={{ boxShadow: '4px 4px 0 #0A0A0A' }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[12px] font-bold text-[#FF3D77]" style={FONT}>
                        {started ? t('🔴 진행 중') : timeFormat.format(new Date(s.starts_at))}
                      </p>
                      <p className="text-[16px] font-bold text-[#0A0A0A] break-words" style={FONT}>{s.title}</p>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-[8px] border-[2px] border-[#0A0A0A] text-[11px] font-bold flex-shrink-0 ${isFull ? 'bg-[#0A0A0A]/10 text-[#0A0A0A]/50' : 'bg-[#F5FF4F] text-[#0A0A0A]'}`}
                      style={FONT}
                    >
                      {t('{count}/{capacity}명', { count, capacity: s.capacity })}
                    </span>
                  </div>

                  <p className="text-[12px] font-bold text-[#0A0A0A]/70" style={FONT}>
                    {emojiOf(s.host_id)} {nameOf(s.host_id)} · {t('호스트')}
                  </p>

                  {s.instruments_wanted.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {s.instruments_wanted.map((inst) => (
                        <span key={inst} className="px-2 py-0.5 bg-[#4FC3F7]/20 rounded-[8px] border-[1px] border-[#0A0A0A]/20 text-[11px] font-bold text-[#0A0A0A]" style={FONT}>
                          {POSITION_EMOJIS[inst] ?? '🎶'} {t(inst)} {t('구해요')}
                        </span>
                      ))}
                    </div>
                  )}

                  {s.description && (
                    <p className="text-[12px] font-bold text-[#0A0A0A]/60 break-words" style={FONT}>{s.description}</p>
                  )}

                  {/* 멤버: 같은 방 사람끼리 1:1 메시지로 오프라인 약속까지 */}
                  {isMember && (
                    <div className="flex flex-col gap-1.5 bg-[#FFF8F0] rounded-[12px] border-[2px] border-[#0A0A0A]/10 p-2">
                      {[s.host_id, ...participantIds].map((id) => (
                        <div key={id} className="flex items-center justify-between gap-2">
                          <span className="text-[12px] font-bold text-[#0A0A0A] truncate" style={FONT}>
                            {emojiOf(id)} {nameOf(id)}{id === user?.id ? ` (${t('나')})` : ''}
                          </span>
                          {id !== user?.id && (
                            <motion.button
                              whileTap={{ scale: 0.9 }}
                              onClick={() => onMessage(id, profiles[id])}
                              aria-label={t('{name}에게 메시지', { name: nameOf(id) })}
                              className="w-7 h-7 rounded-full bg-white border-[2px] border-[#0A0A0A] flex items-center justify-center flex-shrink-0"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </motion.button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {isMember ? (
                    <div className="flex gap-2">
                      <motion.button
                        whileTap={{ scale: 0.95, x: 2, y: 2 }}
                        onClick={() => setRoomFor(s.id)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-[#4FC3F7] rounded-[12px] border-[2px] border-[#0A0A0A] text-[13px] font-bold text-[#0A0A0A]"
                        style={{ boxShadow: '2px 2px 0 #0A0A0A', ...FONT }}
                      >
                        <Headphones className="w-4 h-4" />
                        {t('방 정보 보기')}
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.95, x: 2, y: 2 }}
                        disabled={busy}
                        onClick={() => (isHost ? close(s) : leave(s))}
                        className="px-3 py-2.5 bg-white rounded-[12px] border-[2px] border-[#0A0A0A] text-[12px] font-bold text-[#0A0A0A]/60 disabled:opacity-40"
                        style={{ boxShadow: '2px 2px 0 #0A0A0A', ...FONT }}
                      >
                        {isHost ? t('마감하기') : t('나가기')}
                      </motion.button>
                    </div>
                  ) : (
                    <motion.button
                      whileTap={{ scale: 0.95, x: 2, y: 2 }}
                      disabled={isFull || busy}
                      onClick={() => join(s)}
                      className="w-full py-2.5 bg-[#FF3D77] rounded-[12px] border-[2px] border-[#0A0A0A] text-[14px] font-bold text-white disabled:bg-[#0A0A0A]/20 disabled:text-[#0A0A0A]/50"
                      style={{ boxShadow: '2px 2px 0 #0A0A0A', ...FONT }}
                    >
                      {isFull ? t('정원이 찼어요') : busy ? t('참가하는 중...') : t('참가하기')}
                    </motion.button>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* 하단 고정: 잼 방 열기 */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#FFF8F0] border-t-[3px] border-[#0A0A0A] px-4 pt-3" style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }}>
        <div className="max-w-2xl mx-auto">
          <motion.button
            whileTap={{ scale: 0.96, y: 2 }}
            onClick={() => { if (requireLogin()) setCreateOpen(true); }}
            className="w-full flex items-center justify-center gap-1.5 py-4 bg-[#FF3D77] rounded-[16px] border-[3px] border-[#0A0A0A] text-white font-bold text-[15px]"
            style={{ boxShadow: '4px 4px 0 #0A0A0A', fontFamily: 'Bungee, sans-serif' }}
          >
            <Plus className="w-5 h-5" />
            {t('잼 방 열기')}
          </motion.button>
        </div>
      </div>

      {user && (
        <CreateJamSheet
          open={createOpen}
          user={user}
          onClose={() => setCreateOpen(false)}
          onCreated={async () => { setCreateOpen(false); await load(); }}
        />
      )}
      <JamRoomSheet
        open={roomFor !== null}
        source="session"
        targetId={roomFor ?? ''}
        onClose={() => setRoomFor(null)}
      />
    </>
  );
}
