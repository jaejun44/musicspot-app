'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

const GENRES = ['록', '인디', '재즈', '팝', '메탈', 'R&B', '블루스', '힙합', '기타'];

interface Band {
  id: string;
  name: string;
  description: string | null;
  genre: string[];
  profile_image_url: string | null;
  created_by: string;
  created_at: string;
  member_count?: number;
  my_role?: string;
}

function toggle(arr: string[], item: string) {
  return arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];
}

function CreateBandModal({ onClose, onCreated }: { onClose: () => void; onCreated: (band: Band) => void }) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [genre, setGenre] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleCreate() {
    if (!user) return;
    if (!name.trim()) { setError('밴드 이름을 입력해 주세요.'); return; }
    setSaving(true);
    setError('');

    const { data: bandData, error: bandErr } = await supabase
      .from('bands')
      .insert({ name: name.trim(), description: description.trim() || null, genre, created_by: user.id })
      .select()
      .single();

    if (bandErr || !bandData) {
      console.error('[CreateBand] bands insert error:', bandErr);
      setError(`밴드 생성에 실패했어요: ${bandErr?.message ?? '알 수 없는 오류'}`);
      setSaving(false);
      return;
    }

    const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || '뮤지션';
    const { error: memberErr } = await supabase.from('band_members').insert({
      band_id: bandData.id,
      user_id: user.id,
      role: 'leader',
      display_name: displayName,
    });
    if (memberErr) {
      console.error('[CreateBand] band_members insert error:', memberErr);
      setError(`멤버 등록에 실패했어요: ${memberErr.message}`);
      setSaving(false);
      return;
    }

    setSaving(false);
    onCreated({ ...bandData, member_count: 1, my_role: 'leader' });
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#0A0A0A]/60 flex items-end sm:items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 80 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 80 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="w-full sm:max-w-lg bg-[#FFF8F0] rounded-t-[24px] sm:rounded-[24px] border-[3px] border-[#0A0A0A] max-h-[90vh] overflow-y-auto"
        style={{ boxShadow: '0 -6px 0 #0A0A0A' }}
      >
        <div className="sticky top-0 bg-[#FFF8F0] px-5 pt-5 pb-3 border-b-[2px] border-[#0A0A0A]/10 z-10 flex items-center justify-between">
          <div>
            <h2 className="text-[20px] font-bold text-[#0A0A0A]" style={{ fontFamily: 'Bungee, sans-serif' }}>
              CREATE BAND 🎸
            </h2>
            <p className="text-[12px] text-[#0A0A0A]/50 font-bold mt-0.5" style={{ fontFamily: 'Pretendard, sans-serif' }}>
              새 밴드를 만들어요
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#0A0A0A]/10 flex items-center justify-center"
          >
            <span className="text-[16px] leading-none">✕</span>
          </button>
        </div>

        <div className="px-5 py-5 flex flex-col gap-5">
          <section>
            <p className="text-[13px] font-bold text-[#0A0A0A] mb-2" style={{ fontFamily: 'Pretendard, sans-serif' }}>
              🎵 밴드 이름 <span className="text-[#FF3D77]">*</span>
            </p>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예) 스파크라이트"
              maxLength={30}
              className="w-full px-4 py-3 bg-white border-[2px] border-[#0A0A0A] rounded-[14px] text-[14px] font-bold text-[#0A0A0A] focus:outline-none focus:border-[#FF3D77]"
              style={{ boxShadow: '2px 2px 0 #0A0A0A', fontFamily: 'Pretendard, sans-serif' }}
            />
          </section>

          <section>
            <p className="text-[13px] font-bold text-[#0A0A0A] mb-2" style={{ fontFamily: 'Pretendard, sans-serif' }}>
              💬 밴드 소개 <span className="text-[#0A0A0A]/40">(선택)</span>
            </p>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="어떤 밴드인지 소개해 주세요"
              maxLength={200}
              rows={3}
              className="w-full px-4 py-3 bg-white border-[2px] border-[#0A0A0A] rounded-[14px] text-[13px] font-bold text-[#0A0A0A] resize-none focus:outline-none focus:border-[#FF3D77]"
              style={{ boxShadow: '2px 2px 0 #0A0A0A', fontFamily: 'Pretendard, sans-serif' }}
            />
          </section>

          <section>
            <p className="text-[13px] font-bold text-[#0A0A0A] mb-2" style={{ fontFamily: 'Pretendard, sans-serif' }}>
              🎸 장르 <span className="text-[#0A0A0A]/40">(복수 선택)</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {GENRES.map((g) => {
                const active = genre.includes(g);
                return (
                  <motion.button
                    key={g}
                    onClick={() => setGenre(toggle(genre, g))}
                    whileTap={{ scale: 0.94 }}
                    className={[
                      'px-3 py-2 rounded-[12px] border-[2px] border-[#0A0A0A] text-[13px] font-bold',
                      active ? 'bg-[#FF3D77] text-white' : 'bg-white text-[#0A0A0A]',
                    ].join(' ')}
                    style={{ boxShadow: '2px 2px 0 #0A0A0A', fontFamily: 'Pretendard, sans-serif' }}
                  >
                    {g}
                  </motion.button>
                );
              })}
            </div>
          </section>

          {error && (
            <p className="text-[13px] font-bold text-[#FF3D77] text-center" style={{ fontFamily: 'Pretendard, sans-serif' }}>
              ⚠️ {error}
            </p>
          )}

          <motion.button
            onClick={handleCreate}
            disabled={saving}
            whileTap={{ scale: 0.96, y: 2 }}
            className="w-full py-4 bg-[#FF3D77] text-white rounded-[16px] border-[3px] border-[#0A0A0A] font-bold text-[15px] flex items-center justify-center gap-2 disabled:opacity-60"
            style={{ boxShadow: '4px 4px 0 #0A0A0A', fontFamily: 'Bungee, sans-serif' }}
          >
            {saving ? (
              <>
                <span className="w-4 h-4 rounded-full border-[2px] border-white border-t-transparent animate-spin" />
                만드는 중...
              </>
            ) : '밴드 만들기 💥'}
          </motion.button>
          <div className="h-2" />
        </div>
      </motion.div>
    </div>
  );
}

export default function MyBandPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [bands, setBands] = useState<Band[]>([]);
  const [fetching, setFetching] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { setFetching(false); return; }
    fetchBands();
  }, [user, loading]);

  async function fetchBands() {
    setFetching(true);
    const { data: memberRows } = await supabase
      .from('band_members')
      .select('band_id, role')
      .eq('user_id', user!.id);

    if (!memberRows || memberRows.length === 0) { setBands([]); setFetching(false); return; }

    const bandIds = memberRows.map((r) => r.band_id);
    const { data: bandRows } = await supabase
      .from('bands')
      .select('*')
      .in('id', bandIds)
      .order('created_at', { ascending: false });

    const { data: countRows } = await supabase
      .from('band_members')
      .select('band_id')
      .in('band_id', bandIds);

    const countMap: Record<string, number> = {};
    countRows?.forEach((r) => { countMap[r.band_id] = (countMap[r.band_id] ?? 0) + 1; });

    const roleMap: Record<string, string> = {};
    memberRows.forEach((r) => { roleMap[r.band_id] = r.role; });

    setBands((bandRows ?? []).map((b) => ({ ...b, member_count: countMap[b.id] ?? 0, my_role: roleMap[b.id] })));
    setFetching(false);
  }

  const BAND_COLORS = ['#FF3D77', '#4FC3F7', '#F5FF4F', '#41C66B'];

  return (
    <div className="min-h-screen bg-[#FFF8F0]">
      <Navigation />

      <div className="px-4 pt-6 pb-3 max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        >
          <h1 className="text-[28px] font-bold text-[#0A0A0A]" style={{ fontFamily: 'Bungee, sans-serif' }}>
            MY BAND 🎸
          </h1>
          <p className="text-[13px] text-[#0A0A0A]/50 mt-1 font-bold" style={{ fontFamily: 'Pretendard, sans-serif' }}>
            내 밴드 일정과 멤버를 관리해요
          </p>
        </motion.div>
      </div>

      <div className="px-4 pb-32 max-w-2xl mx-auto">
        {!user && !loading ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 gap-4"
          >
            <span className="text-[56px]">🎸</span>
            <p className="text-[16px] font-bold text-[#0A0A0A]/60 text-center" style={{ fontFamily: 'Bungee, sans-serif' }}>
              LOGIN TO MANAGE YOUR BAND
            </p>
            <motion.button
              whileTap={{ scale: 0.96, y: 2 }}
              onClick={() => router.push('/login')}
              className="px-8 py-3 bg-[#FF3D77] text-white rounded-[14px] border-[3px] border-[#0A0A0A] font-bold text-[14px]"
              style={{ boxShadow: '4px 4px 0 #0A0A0A', fontFamily: 'Bungee, sans-serif' }}
            >
              로그인하기
            </motion.button>
          </motion.div>
        ) : fetching ? (
          <div className="flex justify-center py-20">
            <span className="w-8 h-8 rounded-full border-[3px] border-[#FF3D77] border-t-transparent animate-spin" />
          </div>
        ) : bands.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 gap-4"
          >
            <span className="text-[56px]">🥁</span>
            <p className="text-[16px] font-bold text-[#0A0A0A]/40 text-center" style={{ fontFamily: 'Bungee, sans-serif' }}>
              아직 밴드가 없어요
            </p>
            <p className="text-[13px] text-[#0A0A0A]/40 text-center" style={{ fontFamily: 'Pretendard, sans-serif' }}>
              아래 버튼을 눌러 첫 밴드를 만들어 보세요!
            </p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 gap-4 pt-2">
            {bands.map((band, i) => (
              <motion.div
                key={band.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => router.push(`/my-band/${band.id}`)}
                className="bg-white rounded-[20px] border-[3px] border-[#0A0A0A] p-5 cursor-pointer"
                style={{ boxShadow: '5px 5px 0 #0A0A0A' }}
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-14 h-14 rounded-[16px] border-[3px] border-[#0A0A0A] flex items-center justify-center flex-shrink-0 text-[28px]"
                    style={{ background: BAND_COLORS[i % BAND_COLORS.length] }}
                  >
                    🎸
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-[17px] font-bold text-[#0A0A0A] truncate" style={{ fontFamily: 'Bungee, sans-serif' }}>
                        {band.name}
                      </h2>
                      {band.my_role === 'leader' && (
                        <span
                          className="px-2 py-0.5 bg-[#F5FF4F] border-[2px] border-[#0A0A0A] rounded-[8px] text-[10px] font-bold flex-shrink-0"
                          style={{ fontFamily: 'Pretendard, sans-serif' }}
                        >
                          리더
                        </span>
                      )}
                    </div>
                    {band.description && (
                      <p className="text-[12px] text-[#0A0A0A]/50 mt-0.5 truncate" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                        {band.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-[12px] font-bold text-[#0A0A0A]/40" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                        👥 {band.member_count}명
                      </span>
                      {band.genre?.length > 0 && (
                        <span className="text-[12px] font-bold text-[#0A0A0A]/40 truncate" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                          🎵 {band.genre.slice(0, 2).join(' · ')}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-[#0A0A0A]/30 text-[20px]">›</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {user && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#FFF8F0] border-t-[3px] border-[#0A0A0A] px-4 py-3">
          <div className="max-w-2xl mx-auto">
            <motion.button
              whileTap={{ scale: 0.96, y: 2 }}
              onClick={() => setShowCreate(true)}
              className="w-full py-4 bg-[#FF3D77] rounded-[16px] border-[3px] border-[#0A0A0A] text-white font-bold text-[15px]"
              style={{ boxShadow: '4px 4px 0 #0A0A0A', fontFamily: 'Bungee, sans-serif' }}
            >
              🎸 새 밴드 만들기
            </motion.button>
          </div>
        </div>
      )}

      <AnimatePresence>
        {showCreate && (
          <CreateBandModal
            onClose={() => setShowCreate(false)}
            onCreated={(band) => {
              setBands((prev) => [band, ...prev]);
              setShowCreate(false);
              router.push(`/my-band/${band.id}`);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
