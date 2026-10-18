'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check } from 'lucide-react';
import { track } from '@/lib/analytics';
import { supabase } from '@/lib/supabase';
import { useT, useIsJapanMode } from '@/lib/i18n';

// 매칭된 두 사람이 SonoBus 같은 그룹 방에서 먼저 맞춰보고, 오프라인 합주로 넘어가게 하는 시트.
// 오디오는 다루지 않는다. 방 정보는 /api/jam-room 이 당사자에게만 내준다.

interface JamRoom {
  groupName: string;
  password: string;
  launchUrl: string;
}

type State =
  | { kind: 'loading' }
  | { kind: 'ready'; room: JamRoom }
  | { kind: 'not_matched' }
  | { kind: 'error' };

interface Props {
  open: boolean;
  peerId: string;
  onClose: () => void;
}

const FONT = { fontFamily: 'Pretendard, sans-serif' };

export default function JamRoomSheet({ open, peerId, onClose }: Props) {
  const t = useT();
  const isJapan = useIsJapanMode();
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [copied, setCopied] = useState<'group' | 'password' | null>(null);
  const [canLaunch, setCanLaunch] = useState(false);

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
        if (!cancelled) setState({ kind: 'not_matched' });
        return;
      }
      const res = await fetch(`/api/jam-room?peer=${encodeURIComponent(peerId)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (cancelled) return;
      if (res.ok) {
        setState({ kind: 'ready', room: await res.json() });
        track('match_jam_open', { thread_user_id: peerId, status: 'ready' });
      } else if (res.status === 403 || res.status === 401) {
        setState({ kind: 'not_matched' });
        track('match_jam_open', { thread_user_id: peerId, status: 'not_matched' });
      } else {
        console.error('[jam-room] request failed', res.status);
        setState({ kind: 'error' });
        track('match_jam_open', { thread_user_id: peerId, status: 'error' });
      }
    })().catch((err) => {
      console.error('[jam-room] request failed', err);
      if (!cancelled) setState({ kind: 'error' });
    });

    return () => { cancelled = true; };
  }, [open, peerId]);

  async function copy(field: 'group' | 'password', value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(field);
      setTimeout(() => setCopied((c) => (c === field ? null : c)), 1500);
      track('match_jam_copy', { thread_user_id: peerId, field });
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

                {state.kind === 'not_matched' && (
                  <div className="bg-[#FFF8F0] rounded-[16px] border-[2px] border-[#0A0A0A]/20 p-4 text-center">
                    <p className="text-[24px] mb-2">🤝</p>
                    <p className="text-[13px] font-bold text-[#0A0A0A]" style={FONT}>
                      {t('서로 메시지를 한 번씩 주고받으면 열려요')}
                    </p>
                    <p className="text-[11px] text-[#0A0A0A]/40 font-bold mt-1" style={FONT}>
                      {t('매칭된 두 사람만 같은 방 정보를 볼 수 있어요')}
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
                        onClick={() => track('match_jam_launch', { thread_user_id: peerId })}
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
                  // /booking 은 ja 모드에서 차단 경로(lib/i18n/locale.ts) → 채팅으로 돌아가 오프라인 약속을 잡게 한다
                  <motion.button
                    whileTap={{ scale: 0.95, x: 2, y: 2 }}
                    onClick={() => {
                      track('match_jam_booking_click', { thread_user_id: peerId, target: 'chat' });
                      onClose();
                    }}
                    className="w-full py-3.5 bg-[#FF3D77] rounded-[14px] border-[2px] border-[#0A0A0A] font-bold text-[14px] text-white"
                    style={{ boxShadow: '3px 3px 0 #0A0A0A', ...FONT }}
                  >
                    {t('채팅으로 돌아가서 오프라인 합주 약속 잡기')}
                  </motion.button>
                ) : (
                  // /booking 은 별도 배포로 rewrite 되므로 next/link 대신 <a>
                  <motion.a
                    href="/booking"
                    onClick={() => track('match_jam_booking_click', { thread_user_id: peerId, target: 'booking' })}
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
