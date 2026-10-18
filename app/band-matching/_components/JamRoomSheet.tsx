'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check } from 'lucide-react';
import { track } from '@/lib/analytics';
import type { JamSource } from '@/lib/analytics/events';
import { supabase } from '@/lib/supabase';
import { useT, useIsJapanMode } from '@/lib/i18n';

// SonoBus 같은 그룹 방에서 먼저 맞춰보고, 오프라인 합주로 넘어가게 하는 시트. 오디오는 다루지 않는다.
// source = dm: 채팅창 1:1 (서로 DM을 주고받은 두 사람만, /api/jam-room)
// source = session: 밴드찾기 > 온라인 잼 공개 방 (호스트·참가자만, /api/jam-sessions/[id]/room)

interface JamRoom {
  groupName: string;
  password: string;
  launchUrl: string;
}

type State =
  | { kind: 'loading' }
  | { kind: 'ready'; room: JamRoom }
  | { kind: 'denied' }
  | { kind: 'error' };

interface Props {
  open: boolean;
  source: JamSource;
  /** dm = 상대 user id, session = 세션 id */
  targetId: string;
  onClose: () => void;
}

function roomEndpoint(source: JamSource, targetId: string): string {
  const id = encodeURIComponent(targetId);
  return source === 'dm' ? `/api/jam-room?peer=${id}` : `/api/jam-sessions/${id}/room`;
}

const FONT = { fontFamily: 'Pretendard, sans-serif' };

export default function JamRoomSheet({ open, source, targetId, onClose }: Props) {
  const t = useT();
  const isJapan = useIsJapanMode();
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [copied, setCopied] = useState<'group' | 'password' | null>(null);
  const [canLaunch, setCanLaunch] = useState(false);
  const ids = { source, target_id: targetId };

  useEffect(() => {
    // sonobus:// 스킴은 Android 앱에 등록돼 있지 않다 (sonobus AndroidManifest 확인) → 열기 버튼 숨김
    setCanLaunch(!/android/i.test(navigator.userAgent));
  }, []);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setState({ kind: 'loading' });

    (async () => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        if (!cancelled) setState({ kind: 'denied' });
        return;
      }
      const res = await fetch(roomEndpoint(source, targetId), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (cancelled) return;
      if (res.ok) {
        setState({ kind: 'ready', room: await res.json() });
        track('match_jam_open', { ...ids, status: 'ready' });
      } else if (res.status === 403 || res.status === 401) {
        setState({ kind: 'denied' });
        track('match_jam_open', { ...ids, status: 'denied' });
      } else {
        console.error('[jam-room] request failed', res.status);
        setState({ kind: 'error' });
        track('match_jam_open', { ...ids, status: 'error' });
      }
    })().catch((err) => {
      console.error('[jam-room] request failed', err);
      if (!cancelled) setState({ kind: 'error' });
    });

    return () => { cancelled = true; };
  }, [open, source, targetId]);

  async function copy(field: 'group' | 'password', value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(field);
      setTimeout(() => setCopied((c) => (c === field ? null : c)), 1500);
      track('match_jam_copy', { ...ids, field });
    } catch (err) {
      console.error('[jam-room] clipboard failed', err);
      alert(t('복사하지 못했어요. 길게 눌러 직접 복사해 주세요.'));
    }
  }

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
              {/* 헤더 */}
              <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b-[2px] border-[#0A0A0A]/10 flex-shrink-0">
                <p className="text-[15px] font-bold text-[#0A0A0A]" style={FONT}>
                  {t('🎧 온라인으로 먼저 맞춰보기')}
                </p>
                <motion.button onClick={onClose} whileTap={{ scale: 0.9 }} aria-label={t('닫기')} className="w-8 h-8 rounded-full bg-[#0A0A0A]/10 flex items-center justify-center">
                  <X className="w-4 h-4 text-[#0A0A0A]" />
                </motion.button>
              </div>

              {/* 본문 (스크롤) */}
              <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
                {state.kind === 'loading' && (
                  <p className="py-8 text-center text-[13px] font-bold text-[#0A0A0A]/40" style={FONT}>
                    {t('방 정보를 불러오는 중...')}
                  </p>
                )}

                {state.kind === 'denied' && (
                  <div className="bg-[#FFF8F0] rounded-[16px] border-[2px] border-[#0A0A0A]/20 p-4 text-center">
                    <p className="text-[24px] mb-2">🤝</p>
                    <p className="text-[13px] font-bold text-[#0A0A0A]" style={FONT}>
                      {source === 'dm' ? t('서로 메시지를 한 번씩 주고받으면 열려요') : t('참가하면 방 정보가 열려요')}
                    </p>
                    <p className="text-[11px] text-[#0A0A0A]/40 font-bold mt-1" style={FONT}>
                      {source === 'dm' ? t('매칭된 두 사람만 같은 방 정보를 볼 수 있어요') : t('호스트와 참가자만 방 정보를 볼 수 있어요')}
                    </p>
                  </div>
                )}

                {state.kind === 'error' && (
                  <div className="bg-[#FFF8F0] rounded-[16px] border-[2px] border-[#0A0A0A]/20 p-4 text-center">
                    <p className="text-[24px] mb-2">⚠️</p>
                    <p className="text-[13px] font-bold text-[#0A0A0A]" style={FONT}>
                      {t('방 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.')}
                    </p>
                  </div>
                )}

                {state.kind === 'ready' && (
                  <>
                    <div className="flex flex-col gap-2">
                      <CopyRow
                        label={t('그룹 이름')}
                        value={state.room.groupName}
                        copied={copied === 'group'}
                        onCopy={() => copy('group', state.room.groupName)}
                      />
                      <CopyRow
                        label={t('비밀번호')}
                        value={state.room.password}
                        copied={copied === 'password'}
                        onCopy={() => copy('password', state.room.password)}
                      />
                    </div>

                    {canLaunch && (
                      <motion.a
                        href={state.room.launchUrl}
                        onClick={() => track('match_jam_launch', ids)}
                        whileTap={{ scale: 0.95, x: 2, y: 2 }}
                        className="w-full py-3 bg-[#4FC3F7] rounded-[14px] border-[2px] border-[#0A0A0A] font-bold text-[14px] text-[#0A0A0A] text-center"
                        style={{ boxShadow: '3px 3px 0 #0A0A0A', ...FONT }}
                      >
                        {t('SonoBus로 열기')}
                      </motion.a>
                    )}

                    <ol className="flex flex-col gap-2">
                      {[
                        t('SonoBus 앱 설치하기 (sonobus.net, 무료)'),
                        t('앱에서 그룹 참가(Connect) 누르기'),
                        t('위의 그룹 이름과 비밀번호 입력하기'),
                      ].map((step, i) => (
                        <li key={i} className="flex items-start gap-2 text-[12px] font-bold text-[#0A0A0A]" style={FONT}>
                          <span className="w-5 h-5 rounded-full bg-[#F5FF4F] border-[2px] border-[#0A0A0A] flex items-center justify-center text-[10px] flex-shrink-0">
                            {i + 1}
                          </span>
                          {i === 0 ? (
                            <a href="https://sonobus.net" target="_blank" rel="noopener noreferrer" className="underline">
                              {step}
                            </a>
                          ) : (
                            <span>{step}</span>
                          )}
                        </li>
                      ))}
                    </ol>

                    <div className="bg-[#FFF8F0] rounded-[12px] border-[2px] border-[#0A0A0A]/10 p-3">
                      <p className="text-[11px] font-bold text-[#0A0A0A]/70 leading-relaxed" style={FONT}>
                        {t('💡 유선 랜, 오디오 인터페이스, 이어폰을 권장해요. 와이파이와 폰 스피커는 지연과 하울링이 생겨요.')}
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* 하단 고정 CTA — 온라인에서 끝나지 않고 오프라인 합주로 이어지게 */}
              <div className="px-5 pb-5 pt-3 border-t-[2px] border-[#0A0A0A]/10 flex-shrink-0">
                {isJapan ? (
                  // /search(연습실)는 ja 모드에서 차단 경로(lib/i18n/locale.ts) → 채팅(dm) 또는 방 카드의 멤버 메시지(session)로 돌아가 오프라인 약속
                  <motion.button
                    whileTap={{ scale: 0.95, x: 2, y: 2 }}
                    onClick={() => {
                      track('match_jam_booking_click', { ...ids, target: 'chat' });
                      onClose();
                    }}
                    className="w-full py-3.5 bg-[#FF3D77] rounded-[14px] border-[2px] border-[#0A0A0A] font-bold text-[14px] text-white"
                    style={{ boxShadow: '3px 3px 0 #0A0A0A', ...FONT }}
                  >
                    {source === 'dm' ? t('채팅으로 돌아가서 오프라인 합주 약속 잡기') : t('멤버에게 메시지 보내서 오프라인 합주 약속 잡기')}
                  </motion.button>
                ) : (
                  // 연습실 찾기 → 상세에서 실시간 예약(가능한 곳) 또는 연락. /booking 첫 화면은 '내 예약' 목록이라 예약 입구가 아니다.
                  // 이벤트 target 값 'booking'은 배포된 이름이라 유지
                  <motion.a
                    href="/search"
                    onClick={() => track('match_jam_booking_click', { ...ids, target: 'booking' })}
                    whileTap={{ scale: 0.95, x: 2, y: 2 }}
                    className="block w-full py-3.5 bg-[#FF3D77] rounded-[14px] border-[2px] border-[#0A0A0A] font-bold text-[14px] text-white text-center"
                    style={{ boxShadow: '3px 3px 0 #0A0A0A', ...FONT }}
                  >
                    {t('오프라인 합주실 예약하기')}
                  </motion.a>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function CopyRow({ label, value, copied, onCopy }: { label: string; value: string; copied: boolean; onCopy: () => void }) {
  const t = useT();
  return (
    <div className="flex items-center gap-2 bg-[#FFF8F0] rounded-[12px] border-[2px] border-[#0A0A0A] px-3 py-2">
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold text-[#0A0A0A]/50" style={FONT}>{label}</p>
        <p className="text-[14px] font-bold text-[#0A0A0A] font-mono break-all select-all">{value}</p>
      </div>
      <motion.button
        onClick={onCopy}
        whileTap={{ scale: 0.95, x: 2, y: 2 }}
        aria-label={t('{label} 복사', { label })}
        className={`flex items-center gap-1 px-3 py-2 rounded-[10px] border-[2px] border-[#0A0A0A] text-[12px] font-bold flex-shrink-0 ${copied ? 'bg-[#41C66B] text-white' : 'bg-white text-[#0A0A0A]'}`}
        style={{ boxShadow: '2px 2px 0 #0A0A0A', ...FONT }}
      >
        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        {copied ? t('복사됨') : t('복사')}
      </motion.button>
    </div>
  );
}
