'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send } from 'lucide-react';
import { Musician } from '../_data/musicians';
import { trackBandContact } from '@/lib/analytics';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  pending?: boolean;
}

interface Props {
  musician: Musician | null;
  user: User | null;
  onClose: () => void;
}

function isUUID(str: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

export default function ChatModal({ musician, user, onClose }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const isReal = musician ? isUUID(musician.id) : false;
  const canChat = isReal && !!user;

  useEffect(() => {
    if (!canChat || !musician) return;

    const myId = user!.id;
    const otherId = musician.id;

    supabase
      .from('direct_messages')
      .select('id, sender_id, content, created_at')
      .or(
        `and(sender_id.eq.${myId},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${myId})`
      )
      .order('created_at', { ascending: true })
      .limit(100)
      .then(({ data }) => {
        if (data) setMessages(data as Message[]);
      });

    const [a, b] = [myId, otherId].sort();
    const channel = supabase
      .channel(`dm-${a}-${b}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
          filter: `receiver_id=eq.${myId}`,
        },
        (payload) => {
          const msg = payload.new as Message;
          if (msg.sender_id === otherId) {
            setMessages((prev) => [...prev, msg]);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [canChat, musician?.id, user?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage() {
    if (!input.trim() || !canChat || !musician || sending) return;
    const content = input.trim();
    setInput('');
    setSending(true);

    const tempId = `temp-${Date.now()}`;
    const optimistic: Message = {
      id: tempId,
      sender_id: user!.id,
      content,
      created_at: new Date().toISOString(),
      pending: true,
    };
    setMessages((prev) => [...prev, optimistic]);

    const { data, error } = await supabase.from('direct_messages').insert({
      sender_id: user!.id,
      receiver_id: musician.id,
      sender_name: user!.user_metadata?.full_name || user!.email?.split('@')[0] || '뮤지션',
      content,
    }).select('id, sender_id, content, created_at').single();

    setSending(false);
    if (!error && data) {
      setMessages((prev) => prev.map((m) => m.id === tempId ? { ...data } : m));
    } else {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    }
  }

  return (
    <AnimatePresence>
      {musician && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#0A0A0A]/50 z-50"
          />
          <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 280, damping: 24 }}
            className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-6"
          >
            <div
              className="bg-white rounded-[24px] border-[3px] border-[#0A0A0A] max-w-sm mx-auto flex flex-col"
              style={{ boxShadow: '6px 6px 0 #0A0A0A', maxHeight: '70vh' }}
            >
              {/* 헤더 */}
              <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b-[2px] border-[#0A0A0A]/10 flex-shrink-0">
                <div className="flex items-center gap-3">
                  {musician.avatar_url ? (
                    <img
                      src={musician.avatar_url}
                      alt={musician.name}
                      className="w-10 h-10 rounded-full border-[2px] border-[#0A0A0A] object-cover flex-shrink-0"
                    />
                  ) : (
                    <div
                      className="w-10 h-10 rounded-full border-[2px] border-[#0A0A0A] flex items-center justify-center text-[18px] flex-shrink-0"
                      style={{ backgroundColor: musician.color }}
                    >
                      {musician.emoji}
                    </div>
                  )}
                  <div>
                    <p className="text-[14px] font-bold text-[#0A0A0A]" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                      {musician.name}
                    </p>
                    <p className="text-[11px] text-[#0A0A0A]/50 font-bold" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                      {musician.position} · {musician.location}
                    </p>
                  </div>
                </div>
                <motion.button onClick={onClose} whileTap={{ scale: 0.9 }} className="w-8 h-8 rounded-full bg-[#0A0A0A]/10 flex items-center justify-center">
                  <X className="w-4 h-4 text-[#0A0A0A]" />
                </motion.button>
              </div>

              {/* 본문 */}
              {!isReal ? (
                /* 더미 뮤지션 */
                <div className="px-5 py-6 flex flex-col gap-3">
                  <p className="text-[13px] text-[#0A0A0A]/60 font-bold bg-[#FFF8F0] rounded-[12px] p-3" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                    💬 {musician.lookingFor}
                  </p>
                  <KakaoButton musician={musician} />
                  <CloseButton onClose={onClose} />
                </div>
              ) : !user ? (
                /* 로그인 필요 */
                <div className="px-5 py-6 flex flex-col gap-3">
                  <div className="bg-[#FFF8F0] rounded-[16px] border-[2px] border-[#0A0A0A]/20 p-4 text-center">
                    <p className="text-[24px] mb-2">🔐</p>
                    <p className="text-[13px] font-bold text-[#0A0A0A]" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                      로그인하면 채팅을 보낼 수 있어요
                    </p>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.96, y: 2 }}
                    onClick={() => { onClose(); window.location.href = '/login'; }}
                    className="w-full py-3.5 bg-[#FF3D77] rounded-[14px] border-[2px] border-[#0A0A0A] font-bold text-[14px] text-white"
                    style={{ boxShadow: '3px 3px 0 #0A0A0A', fontFamily: 'Bungee, sans-serif' }}
                  >
                    로그인하기 💥
                  </motion.button>
                  <KakaoButton musician={musician} />
                  <CloseButton onClose={onClose} />
                </div>
              ) : (
                /* 실제 채팅 */
                <>
                  <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2 min-h-[180px]">
                    {messages.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center py-8 text-center">
                        <p className="text-[28px] mb-2">💬</p>
                        <p className="text-[12px] text-[#0A0A0A]/40 font-bold" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                          첫 메시지를 보내보세요!
                        </p>
                      </div>
                    ) : (
                      messages.map((msg) => {
                        const isMine = msg.sender_id === user.id;
                        return (
                          <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                            <div
                              className={[
                                'max-w-[75%] px-3 py-2 rounded-[14px] text-[13px] font-bold',
                                isMine
                                  ? 'bg-[#FF3D77] text-white rounded-br-[4px]'
                                  : 'bg-[#FFF8F0] border-[2px] border-[#0A0A0A]/10 text-[#0A0A0A] rounded-bl-[4px]',
                                msg.pending ? 'opacity-60' : '',
                              ].join(' ')}
                              style={{ fontFamily: 'Pretendard, sans-serif' }}
                            >
                              {msg.content}
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={bottomRef} />
                  </div>

                  {/* 입력창 */}
                  <div className="px-4 pb-4 pt-2 border-t-[2px] border-[#0A0A0A]/10 flex-shrink-0">
                    <div className="flex gap-2 items-center">
                      <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                        placeholder="메시지 입력..."
                        className="flex-1 px-3 py-2.5 rounded-[12px] border-[2px] border-[#0A0A0A]/20 bg-[#FFF8F0] text-[13px] font-bold text-[#0A0A0A] outline-none focus:border-[#FF3D77]"
                        style={{ fontFamily: 'Pretendard, sans-serif' }}
                      />
                      <motion.button
                        onClick={sendMessage}
                        disabled={!input.trim() || sending}
                        whileTap={{ scale: 0.9 }}
                        className="w-10 h-10 bg-[#FF3D77] rounded-[12px] border-[2px] border-[#0A0A0A] flex items-center justify-center disabled:opacity-40 flex-shrink-0"
                        style={{ boxShadow: '2px 2px 0 #0A0A0A' }}
                      >
                        <Send className="w-4 h-4 text-white" />
                      </motion.button>
                    </div>

                    {/* 카카오 보조 버튼 */}
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={() => { trackBandContact('kakao', musician.name, musician.position); alert('카카오 채널 연동 준비 중이에요! 🎸'); }}
                      className="w-full mt-2 py-2 bg-[#FFD600]/30 rounded-[10px] border-[1px] border-[#0A0A0A]/10 text-[12px] font-bold text-[#0A0A0A]/60"
                      style={{ fontFamily: 'Pretendard, sans-serif' }}
                    >
                      💛 카카오로 연락하기
                    </motion.button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function KakaoButton({ musician }: { musician: Musician }) {
  return (
    <motion.button
      whileTap={{ scale: 0.96, y: 2 }}
      onClick={() => { trackBandContact('kakao', musician.name, musician.position); alert('카카오 채널 연동 준비 중이에요! 🎸'); }}
      className="w-full py-3.5 bg-[#FFD600] rounded-[14px] border-[2px] border-[#0A0A0A] font-bold text-[14px] text-[#0A0A0A]"
      style={{ boxShadow: '3px 3px 0 #0A0A0A', fontFamily: 'Pretendard, sans-serif' }}
    >
      💛 카카오로 연락하기
    </motion.button>
  );
}

function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <motion.button
      whileTap={{ scale: 0.96, y: 2 }}
      onClick={onClose}
      className="w-full py-3.5 bg-white rounded-[14px] border-[2px] border-[#0A0A0A] font-bold text-[14px] text-[#0A0A0A]/50"
      style={{ boxShadow: '2px 2px 0 #0A0A0A', fontFamily: 'Pretendard, sans-serif' }}
    >
      닫기
    </motion.button>
  );
}
