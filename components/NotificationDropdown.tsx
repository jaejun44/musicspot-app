'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell } from 'lucide-react';
import { useNotifications, Notification } from '@/hooks/useNotifications';

const TYPE_EMOJI: Record<Notification['type'], string> = {
  follow: '👤',
  comment: '💬',
  like: '❤️',
  match: '🎸',
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return '방금';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function NotificationDropdown({ open, onClose }: Props) {
  const { notifications, unreadCount, markAllRead, markRead } = useNotifications();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: -8, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 400, damping: 28 }}
          className="absolute right-0 top-[calc(100%+8px)] w-[340px] bg-white rounded-[20px] border-[3px] border-[#0A0A0A] z-50 overflow-hidden"
          style={{ boxShadow: '6px 6px 0 #0A0A0A' }}
        >
          {/* 헤더 */}
          <div className="flex items-center justify-between px-5 py-4 border-b-[2px] border-[#0A0A0A]">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#0A0A0A]" />
              <span className="text-[14px] font-bold text-[#0A0A0A]" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                알림
              </span>
              {unreadCount > 0 && (
                <span
                  className="px-1.5 py-0.5 bg-[#FF3D77] text-white text-[11px] font-bold rounded-full"
                  style={{ fontFamily: 'Bungee, sans-serif' }}
                >
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-[11px] font-bold text-[#0A0A0A]/50 hover:text-[#FF3D77] transition-colors"
                  style={{ fontFamily: 'Pretendard, sans-serif' }}
                >
                  모두 읽음
                </button>
              )}
              <button onClick={onClose} className="text-[#0A0A0A]/40 hover:text-[#0A0A0A] transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 목록 */}
          <div className="max-h-[360px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2">
                <Bell className="w-8 h-8 text-[#0A0A0A]/20" />
                <p className="text-[13px] text-[#0A0A0A]/40 font-bold" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                  알림이 없습니다
                </p>
              </div>
            ) : (
              notifications.map((n) => (
                <motion.button
                  key={n.id}
                  onClick={() => markRead(n.id)}
                  whileHover={{ backgroundColor: '#FFF8F0' }}
                  className={[
                    'w-full text-left px-5 py-4 border-b border-[#0A0A0A]/10 flex items-start gap-3 transition-colors',
                    !n.read ? 'bg-[#FFF8F0]' : 'bg-white',
                  ].join(' ')}
                >
                  <span className="text-[20px] flex-shrink-0 mt-0.5">{TYPE_EMOJI[n.type]}</span>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-[13px] leading-tight ${!n.read ? 'font-bold text-[#0A0A0A]' : 'font-semibold text-[#0A0A0A]/70'}`}
                      style={{ fontFamily: 'Pretendard, sans-serif' }}
                    >
                      {n.title ?? n.type}
                    </p>
                    {n.body && (
                      <p
                        className="text-[12px] text-[#0A0A0A]/50 mt-0.5 truncate"
                        style={{ fontFamily: 'Pretendard, sans-serif' }}
                      >
                        {n.body}
                      </p>
                    )}
                    <p className="text-[11px] text-[#0A0A0A]/30 mt-1" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                      {timeAgo(n.created_at)}
                    </p>
                  </div>
                  {!n.read && (
                    <span className="w-2 h-2 rounded-full bg-[#FF3D77] flex-shrink-0 mt-1.5" />
                  )}
                </motion.button>
              ))
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
