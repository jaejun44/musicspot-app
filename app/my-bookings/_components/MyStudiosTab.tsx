'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Studio } from '@/types/studio';

export default function MyStudiosTab() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [studios, setStudios] = useState<Studio[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); return; }

    supabase
      .from('studios')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setStudios((data as Studio[]) ?? []);
        setLoading(false);
      });
  }, [user, authLoading]);

  async function handleDelete(id: string) {
    if (!confirm('이 연습실 등록을 삭제할까요? 되돌릴 수 없어요.')) return;
    setDeletingId(id);
    const { error } = await supabase.from('studios').delete().eq('id', id);
    setDeletingId(null);
    if (error) {
      alert('삭제 중 오류가 발생했어요.');
      console.error(error);
      return;
    }
    setStudios((prev) => prev.filter((s) => s.id !== id));
  }

  if (loading || authLoading) {
    return (
      <div className="flex justify-center py-20">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 0.9, ease: 'linear' }}
          className="w-8 h-8 rounded-full border-[3px] border-[#FF3D77] border-t-transparent"
        />
      </div>
    );
  }

  if (!user) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        className="flex flex-col items-center justify-center py-16 px-4"
      >
        <div
          className="bg-white/80 backdrop-blur-sm rounded-[20px] border-[3px] border-[#0A0A0A] px-6 py-8 flex flex-col items-center w-full max-w-sm"
          style={{ boxShadow: '5px 5px 0 #0A0A0A' }}
        >
          <div
            className="w-20 h-20 rounded-full bg-[#FF3D77] border-[3px] border-[#0A0A0A] flex items-center justify-center mb-5"
            style={{ boxShadow: '4px 4px 0 #0A0A0A' }}
          >
            <span className="text-[32px]">🔐</span>
          </div>
          <p
            className="text-[18px] font-bold text-[#0A0A0A] mb-2 text-center"
            style={{ fontFamily: 'Bungee, sans-serif' }}
          >
            LOGIN REQUIRED
          </p>
          <p
            className="text-[13px] text-[#0A0A0A]/50 font-bold text-center mb-6"
            style={{ fontFamily: 'Pretendard, sans-serif' }}
          >
            내 연습실을 관리하려면 로그인이 필요해요
          </p>
          <motion.button
            onClick={() => router.push('/login')}
            whileTap={{ scale: 0.95, y: 2 }}
            className="px-6 py-3 bg-[#FF3D77] rounded-[14px] border-[3px] border-[#0A0A0A] text-white font-bold text-[14px]"
            style={{ boxShadow: '3px 3px 0 #0A0A0A', fontFamily: 'Bungee, sans-serif' }}
          >
            로그인하기
          </motion.button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      className="px-4 pb-8 space-y-4"
    >
      <motion.button
        onClick={() => router.push('/room/new')}
        whileTap={{ scale: 0.97, y: 2 }}
        className="w-full py-3.5 bg-[#FF3D77] rounded-[16px] border-[3px] border-[#0A0A0A] text-white font-bold text-[14px]"
        style={{ boxShadow: '4px 4px 0 #0A0A0A', fontFamily: 'Bungee, sans-serif' }}
      >
        🎸 + 내 연습실 등록하기
      </motion.button>

      {studios.length === 0 ? (
        <div
          className="bg-white/80 backdrop-blur-sm rounded-[20px] border-[3px] border-[#0A0A0A] px-6 py-10 flex flex-col items-center"
          style={{ boxShadow: '5px 5px 0 #0A0A0A' }}
        >
          <span className="text-[32px] mb-3">🏠</span>
          <p
            className="text-[13px] text-[#0A0A0A]/50 font-bold text-center"
            style={{ fontFamily: 'Pretendard, sans-serif' }}
          >
            아직 등록한 연습실이 없어요.<br />내가 쓰는 합주실을 등록해보세요.
          </p>
        </div>
      ) : (
        studios.map((s, i) => (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, type: 'spring', stiffness: 260, damping: 22 }}
            className="bg-white/80 backdrop-blur-sm rounded-[20px] border-[3px] border-[#0A0A0A] p-5"
            style={{ boxShadow: '5px 5px 0 #0A0A0A' }}
          >
            <div className="flex items-start justify-between mb-2">
              <div
                className="flex-1 min-w-0 cursor-pointer"
                onClick={() => router.push(`/room/${s.id}`)}
              >
                <p
                  className="text-[16px] font-bold text-[#0A0A0A] truncate"
                  style={{ fontFamily: 'Pretendard, sans-serif' }}
                >
                  {s.name}
                </p>
                {s.address && (
                  <p
                    className="text-[12px] text-[#0A0A0A]/40 font-bold mt-0.5 truncate"
                    style={{ fontFamily: 'Pretendard, sans-serif' }}
                  >
                    {s.address}
                  </p>
                )}
              </div>
              <span
                className="ml-3 flex-shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold border-[2px] border-[#0A0A0A]"
                style={{
                  background: s.is_published ? '#41C66B' : '#0A0A0A',
                  color: '#fff',
                  fontFamily: 'Pretendard, sans-serif',
                }}
              >
                {s.is_published ? '노출중' : '비공개'}
              </span>
            </div>

            <div className="flex justify-between items-center pt-3 mt-2 border-t-[2px] border-dashed border-[#0A0A0A]/20">
              <button
                onClick={() => router.push(`/room/${s.id}`)}
                className="text-[12px] font-bold text-[#0A0A0A]/50"
                style={{ fontFamily: 'Pretendard, sans-serif' }}
              >
                상세보기 →
              </button>
              <button
                onClick={() => handleDelete(s.id)}
                disabled={deletingId === s.id}
                className="px-3 py-1.5 rounded-[10px] border-[2px] border-[#0A0A0A] bg-white text-[12px] font-bold text-[#FF3D77] disabled:opacity-50"
                style={{ boxShadow: '2px 2px 0 #0A0A0A' }}
              >
                {deletingId === s.id ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </motion.div>
        ))
      )}
    </motion.div>
  );
}
