'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useParams } from 'next/navigation';
import Navigation from '@/components/Navigation';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

/* ─── Types ─── */
interface Band {
  id: string;
  name: string;
  description: string | null;
  genre: string[];
  created_by: string;
}

interface Member {
  id: string;
  user_id: string;
  role: string;
  instrument: string | null;
  display_name: string | null;
  avatar_url: string | null;
  joined_at: string;
}

interface Schedule {
  id: string;
  title: string;
  schedule_date: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  notes: string | null;
  created_by: string | null;
}

type Tab = 'calendar' | 'schedules' | 'members';

/* ─── Helpers ─── */
function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const MEMBER_COLORS = ['#FF3D77', '#4FC3F7', '#F5FF4F', '#41C66B'];

/* ─── AddScheduleModal ─── */
function AddScheduleModal({
  bandId,
  userId,
  prefillDate,
  onClose,
  onAdded,
}: {
  bandId: string;
  userId: string;
  prefillDate?: string;
  onClose: () => void;
  onAdded: (s: Schedule) => void;
}) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(prefillDate ?? new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    if (!title.trim()) { setError('일정 제목을 입력해 주세요.'); return; }
    if (!date) { setError('날짜를 선택해 주세요.'); return; }
    setSaving(true);
    const { data, error: err } = await supabase
      .from('band_schedules')
      .insert({
        band_id: bandId,
        title: title.trim(),
        schedule_date: date,
        start_time: startTime || null,
        end_time: endTime || null,
        location: location.trim() || null,
        notes: notes.trim() || null,
        created_by: userId,
      })
      .select()
      .single();
    setSaving(false);
    if (err || !data) { setError('저장에 실패했어요.'); return; }
    onAdded(data);
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
          <h2 className="text-[18px] font-bold" style={{ fontFamily: 'Bungee, sans-serif' }}>
            ADD SCHEDULE 📅
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-[#0A0A0A]/10 flex items-center justify-center">
            <span className="text-[16px] leading-none">✕</span>
          </button>
        </div>

        <div className="px-5 py-5 flex flex-col gap-4">
          <div>
            <p className="text-[13px] font-bold mb-1.5" style={{ fontFamily: 'Pretendard, sans-serif' }}>
              📝 제목 <span className="text-[#FF3D77]">*</span>
            </p>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예) 홍대 합주, 발표 공연 리허설"
              maxLength={50}
              className="w-full px-4 py-3 bg-white border-[2px] border-[#0A0A0A] rounded-[14px] text-[14px] font-bold focus:outline-none focus:border-[#FF3D77]"
              style={{ boxShadow: '2px 2px 0 #0A0A0A', fontFamily: 'Pretendard, sans-serif' }}
            />
          </div>

          <div>
            <p className="text-[13px] font-bold mb-1.5" style={{ fontFamily: 'Pretendard, sans-serif' }}>
              📅 날짜 <span className="text-[#FF3D77]">*</span>
            </p>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-3 bg-white border-[2px] border-[#0A0A0A] rounded-[14px] text-[14px] font-bold focus:outline-none focus:border-[#FF3D77] appearance-none"
              style={{ boxShadow: '2px 2px 0 #0A0A0A', fontFamily: 'Pretendard, sans-serif' }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[13px] font-bold mb-1.5" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                ⏰ 시작 시간
              </p>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-4 py-3 bg-white border-[2px] border-[#0A0A0A] rounded-[14px] text-[14px] font-bold focus:outline-none focus:border-[#FF3D77] appearance-none"
                style={{ boxShadow: '2px 2px 0 #0A0A0A', fontFamily: 'Pretendard, sans-serif' }}
              />
            </div>
            <div>
              <p className="text-[13px] font-bold mb-1.5" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                ⏱ 종료 시간
              </p>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-4 py-3 bg-white border-[2px] border-[#0A0A0A] rounded-[14px] text-[14px] font-bold focus:outline-none focus:border-[#FF3D77] appearance-none"
                style={{ boxShadow: '2px 2px 0 #0A0A0A', fontFamily: 'Pretendard, sans-serif' }}
              />
            </div>
          </div>

          <div>
            <p className="text-[13px] font-bold mb-1.5" style={{ fontFamily: 'Pretendard, sans-serif' }}>
              📍 장소
            </p>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="예) 홍대 무한연습실 2호점"
              maxLength={80}
              className="w-full px-4 py-3 bg-white border-[2px] border-[#0A0A0A] rounded-[14px] text-[14px] font-bold focus:outline-none focus:border-[#FF3D77]"
              style={{ boxShadow: '2px 2px 0 #0A0A0A', fontFamily: 'Pretendard, sans-serif' }}
            />
          </div>

          <div>
            <p className="text-[13px] font-bold mb-1.5" style={{ fontFamily: 'Pretendard, sans-serif' }}>
              💬 메모
            </p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="준비물, 세트리스트 등"
              maxLength={200}
              rows={2}
              className="w-full px-4 py-3 bg-white border-[2px] border-[#0A0A0A] rounded-[14px] text-[13px] font-bold resize-none focus:outline-none focus:border-[#FF3D77]"
              style={{ boxShadow: '2px 2px 0 #0A0A0A', fontFamily: 'Pretendard, sans-serif' }}
            />
          </div>

          {error && (
            <p className="text-[13px] font-bold text-[#FF3D77] text-center" style={{ fontFamily: 'Pretendard, sans-serif' }}>
              ⚠️ {error}
            </p>
          )}

          <motion.button
            onClick={handleSave}
            disabled={saving}
            whileTap={{ scale: 0.96, y: 2 }}
            className="w-full py-4 bg-[#FF3D77] text-white rounded-[16px] border-[3px] border-[#0A0A0A] font-bold text-[15px] flex items-center justify-center gap-2 disabled:opacity-60"
            style={{ boxShadow: '4px 4px 0 #0A0A0A', fontFamily: 'Bungee, sans-serif' }}
          >
            {saving ? (
              <><span className="w-4 h-4 rounded-full border-[2px] border-white border-t-transparent animate-spin" /> 저장 중...</>
            ) : '일정 저장 💥'}
          </motion.button>
          <div className="h-2" />
        </div>
      </motion.div>
    </div>
  );
}

/* ─── Main Page ─── */
export default function BandDetailPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const bandId = params.id as string;

  const [band, setBand] = useState<Band | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [myRole, setMyRole] = useState<string>('member');
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('calendar');

  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showAddSchedule, setShowAddSchedule] = useState(false);
  const [addPrefillDate, setAddPrefillDate] = useState<string | undefined>();

  const today = new Date().toISOString().slice(0, 10);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    const [bandRes, memberRes, scheduleRes] = await Promise.all([
      supabase.from('bands').select('*').eq('id', bandId).single(),
      supabase.from('band_members').select('*').eq('band_id', bandId).order('joined_at'),
      supabase.from('band_schedules').select('*').eq('band_id', bandId).order('schedule_date'),
    ]);
    if (bandRes.data) setBand(bandRes.data);
    if (memberRes.data) {
      setMembers(memberRes.data);
      const me = memberRes.data.find((m) => m.user_id === user.id);
      setMyRole(me?.role ?? 'member');
    }
    if (scheduleRes.data) setSchedules(scheduleRes.data);
    setLoading(false);
  }, [bandId, user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* Calendar helpers */
  const scheduleDateSet = new Set(schedules.map((s) => s.schedule_date));
  const daysInMonth = getDaysInMonth(calYear, calMonth);
  const firstDay = getFirstDayOfWeek(calYear, calMonth);
  const calPad = Array(firstDay).fill(null);

  const calDate = (day: number) =>
    `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const selectedDateSchedules = selectedDate
    ? schedules.filter((s) => s.schedule_date === selectedDate)
    : [];

  const upcomingSchedules = schedules
    .filter((s) => s.schedule_date >= today)
    .slice(0, 10);

  function prevMonth() {
    if (calMonth === 0) { setCalYear((y) => y - 1); setCalMonth(11); }
    else setCalMonth((m) => m - 1);
    setSelectedDate(null);
  }
  function nextMonth() {
    if (calMonth === 11) { setCalYear((y) => y + 1); setCalMonth(0); }
    else setCalMonth((m) => m + 1);
    setSelectedDate(null);
  }

  async function handleDeleteSchedule(id: string) {
    if (!confirm('이 일정을 삭제할까요?')) return;
    await supabase.from('band_schedules').delete().eq('id', id);
    setSchedules((prev) => prev.filter((s) => s.id !== id));
    if (selectedDateSchedules.length <= 1) setSelectedDate(null);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFF8F0]">
        <Navigation />
        <div className="flex justify-center py-20">
          <span className="w-8 h-8 rounded-full border-[3px] border-[#FF3D77] border-t-transparent animate-spin" />
        </div>
      </div>
    );
  }

  if (!band) {
    return (
      <div className="min-h-screen bg-[#FFF8F0]">
        <Navigation />
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <span className="text-[48px]">😢</span>
          <p className="text-[16px] font-bold text-[#0A0A0A]/40" style={{ fontFamily: 'Bungee, sans-serif' }}>
            밴드를 찾을 수 없어요
          </p>
          <button onClick={() => router.push('/my-band')} className="text-[#FF3D77] font-bold underline">
            돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF8F0]">
      <Navigation />

      {/* 헤더 */}
      <div className="px-4 pt-4 pb-2 max-w-2xl mx-auto">
        <button
          onClick={() => router.push('/my-band')}
          className="flex items-center gap-1 text-[13px] font-bold text-[#0A0A0A]/40 mb-3"
          style={{ fontFamily: 'Pretendard, sans-serif' }}
        >
          ‹ 내 밴드
        </button>
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-[14px] border-[3px] border-[#0A0A0A] flex items-center justify-center text-[24px] flex-shrink-0"
            style={{ background: '#FF3D77' }}
          >
            🎸
          </div>
          <div>
            <h1 className="text-[22px] font-bold text-[#0A0A0A]" style={{ fontFamily: 'Bungee, sans-serif' }}>
              {band.name}
            </h1>
            {band.description && (
              <p className="text-[12px] text-[#0A0A0A]/50 font-bold" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                {band.description}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 탭 */}
      <div className="px-4 pt-3 pb-1 max-w-2xl mx-auto">
        <div className="flex gap-2">
          {(['calendar', 'schedules', 'members'] as Tab[]).map((t) => {
            const labels: Record<Tab, string> = { calendar: '📅 캘린더', schedules: '📋 일정', members: '👥 멤버' };
            const active = tab === t;
            return (
              <motion.button
                key={t}
                onClick={() => setTab(t)}
                whileTap={{ scale: 0.96 }}
                className={[
                  'flex-1 py-2.5 rounded-[12px] border-[2px] border-[#0A0A0A] text-[13px] font-bold',
                  active ? 'bg-[#0A0A0A] text-white' : 'bg-white text-[#0A0A0A]',
                ].join(' ')}
                style={{ boxShadow: active ? '3px 3px 0 #0A0A0A' : '2px 2px 0 #0A0A0A', fontFamily: 'Pretendard, sans-serif' }}
              >
                {labels[t]}
              </motion.button>
            );
          })}
        </div>
      </div>

      <div className="px-4 pb-32 max-w-2xl mx-auto mt-3">
        {/* ── 캘린더 탭 ── */}
        {tab === 'calendar' && (
          <div>
            {/* 월 네비게이션 */}
            <div className="bg-white rounded-[20px] border-[3px] border-[#0A0A0A] p-4 mb-4" style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>
              <div className="flex items-center justify-between mb-4">
                <button onClick={prevMonth} className="w-9 h-9 rounded-[10px] border-[2px] border-[#0A0A0A] flex items-center justify-center font-bold text-[16px]">
                  ‹
                </button>
                <span className="text-[16px] font-bold" style={{ fontFamily: 'Bungee, sans-serif' }}>
                  {calYear}.{String(calMonth + 1).padStart(2, '0')}
                </span>
                <button onClick={nextMonth} className="w-9 h-9 rounded-[10px] border-[2px] border-[#0A0A0A] flex items-center justify-center font-bold text-[16px]">
                  ›
                </button>
              </div>

              {/* 요일 헤더 */}
              <div className="grid grid-cols-7 mb-1">
                {WEEKDAYS.map((d, i) => (
                  <div key={d} className={`text-center text-[11px] font-bold pb-1 ${i === 0 ? 'text-[#FF3D77]' : i === 6 ? 'text-[#4FC3F7]' : 'text-[#0A0A0A]/40'}`}
                    style={{ fontFamily: 'Pretendard, sans-serif' }}>
                    {d}
                  </div>
                ))}
              </div>

              {/* 날짜 그리드 */}
              <div className="grid grid-cols-7 gap-y-1">
                {calPad.map((_, i) => <div key={`pad-${i}`} />)}
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                  const dateStr = calDate(day);
                  const hasSchedule = scheduleDateSet.has(dateStr);
                  const isToday = dateStr === today;
                  const isSelected = dateStr === selectedDate;
                  const dayOfWeek = new Date(calYear, calMonth, day).getDay();
                  return (
                    <button
                      key={day}
                      onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                      className={[
                        'relative h-10 rounded-[10px] flex flex-col items-center justify-center text-[13px] font-bold transition-colors',
                        isSelected ? 'bg-[#0A0A0A] text-white' : isToday ? 'bg-[#F5FF4F] border-[2px] border-[#0A0A0A]' : 'hover:bg-[#FFF8F0]',
                        !isSelected && !isToday && dayOfWeek === 0 ? 'text-[#FF3D77]' : '',
                        !isSelected && !isToday && dayOfWeek === 6 ? 'text-[#4FC3F7]' : '',
                      ].join(' ')}
                      style={{ fontFamily: 'Pretendard, sans-serif' }}
                    >
                      {day}
                      {hasSchedule && (
                        <span className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-[#F5FF4F]' : 'bg-[#FF3D77]'}`} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 선택된 날짜 일정 */}
            {selectedDate && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[14px] font-bold" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                    {selectedDate}
                  </p>
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={() => { setAddPrefillDate(selectedDate); setShowAddSchedule(true); }}
                    className="px-3 py-1.5 bg-[#FF3D77] text-white rounded-[10px] border-[2px] border-[#0A0A0A] text-[12px] font-bold"
                    style={{ boxShadow: '2px 2px 0 #0A0A0A', fontFamily: 'Pretendard, sans-serif' }}
                  >
                    + 일정 추가
                  </motion.button>
                </div>
                {selectedDateSchedules.length === 0 ? (
                  <div className="bg-white rounded-[16px] border-[2px] border-[#0A0A0A] p-4 text-center text-[13px] text-[#0A0A0A]/40 font-bold"
                    style={{ fontFamily: 'Pretendard, sans-serif' }}>
                    이 날 일정이 없어요
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {selectedDateSchedules.map((s) => (
                      <ScheduleCard key={s.id} schedule={s} userId={user?.id ?? ''} onDelete={handleDeleteSchedule} />
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </div>
        )}

        {/* ── 일정 탭 ── */}
        {tab === 'schedules' && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[13px] font-bold text-[#0A0A0A]/50" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                다가오는 일정 {upcomingSchedules.length}개
              </p>
            </div>
            {upcomingSchedules.length === 0 ? (
              <div className="flex flex-col items-center py-16 gap-3">
                <span className="text-[48px]">📅</span>
                <p className="text-[14px] font-bold text-[#0A0A0A]/40" style={{ fontFamily: 'Bungee, sans-serif' }}>
                  NO SCHEDULES YET
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {upcomingSchedules.map((s) => (
                  <ScheduleCard key={s.id} schedule={s} userId={user?.id ?? ''} onDelete={handleDeleteSchedule} showDate />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── 멤버 탭 ── */}
        {tab === 'members' && (
          <div className="flex flex-col gap-3">
            {members.map((m, i) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white rounded-[16px] border-[2px] border-[#0A0A0A] p-4 flex items-center gap-3"
                style={{ boxShadow: '3px 3px 0 #0A0A0A' }}
              >
                {m.avatar_url ? (
                  <img src={m.avatar_url} alt={m.display_name ?? ''} className="w-11 h-11 rounded-full border-[2px] border-[#0A0A0A] object-cover flex-shrink-0" />
                ) : (
                  <div
                    className="w-11 h-11 rounded-full border-[2px] border-[#0A0A0A] flex items-center justify-center flex-shrink-0 text-white font-bold text-[16px]"
                    style={{ background: MEMBER_COLORS[i % MEMBER_COLORS.length] }}
                  >
                    {(m.display_name ?? '?')[0].toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[14px] truncate" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                      {m.display_name ?? '뮤지션'}
                    </span>
                    {m.role === 'leader' && (
                      <span className="px-2 py-0.5 bg-[#F5FF4F] border-[2px] border-[#0A0A0A] rounded-[6px] text-[10px] font-bold flex-shrink-0"
                        style={{ fontFamily: 'Pretendard, sans-serif' }}>
                        리더
                      </span>
                    )}
                  </div>
                  {m.instrument && (
                    <p className="text-[12px] text-[#0A0A0A]/50 font-bold" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                      {m.instrument}
                    </p>
                  )}
                </div>
                {m.user_id === user?.id && (
                  <span className="text-[11px] font-bold text-[#FF3D77]" style={{ fontFamily: 'Pretendard, sans-serif' }}>나</span>
                )}
              </motion.div>
            ))}

            {/* 초대 안내 (리더만) */}
            {myRole === 'leader' && (
              <div
                className="bg-[#F5FF4F] rounded-[16px] border-[2px] border-[#0A0A0A] p-4 mt-1"
                style={{ boxShadow: '3px 3px 0 #0A0A0A' }}
              >
                <p className="text-[13px] font-bold text-[#0A0A0A]" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                  💡 멤버 초대 방법
                </p>
                <p className="text-[12px] text-[#0A0A0A]/70 mt-1 font-bold" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                  이 페이지 주소를 밴드 멤버에게 공유하세요.<br />
                  멤버가 로그인 후 아래 버튼으로 합류할 수 있어요.
                </p>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={() => { navigator.clipboard.writeText(window.location.href); alert('링크가 복사됐어요!'); }}
                  className="mt-3 w-full py-2.5 bg-white rounded-[12px] border-[2px] border-[#0A0A0A] text-[13px] font-bold"
                  style={{ boxShadow: '2px 2px 0 #0A0A0A', fontFamily: 'Pretendard, sans-serif' }}
                >
                  🔗 초대 링크 복사
                </motion.button>
              </div>
            )}

            {/* 나 아닌 사람이 이 밴드에 없는 경우 - 합류 버튼 */}
            {user && !members.find((m) => m.user_id === user.id) && (
              <JoinBandButton bandId={bandId} user={user} onJoined={fetchAll} />
            )}
          </div>
        )}
      </div>

      {/* 하단 FAB */}
      {(tab === 'calendar' || tab === 'schedules') && user && members.find((m) => m.user_id === user.id) && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#FFF8F0] border-t-[3px] border-[#0A0A0A] px-4 py-3">
          <div className="max-w-2xl mx-auto">
            <motion.button
              whileTap={{ scale: 0.96, y: 2 }}
              onClick={() => { setAddPrefillDate(selectedDate ?? undefined); setShowAddSchedule(true); }}
              className="w-full py-4 bg-[#FF3D77] rounded-[16px] border-[3px] border-[#0A0A0A] text-white font-bold text-[15px]"
              style={{ boxShadow: '4px 4px 0 #0A0A0A', fontFamily: 'Bungee, sans-serif' }}
            >
              📅 일정 추가하기
            </motion.button>
          </div>
        </div>
      )}

      <AnimatePresence>
        {showAddSchedule && user && (
          <AddScheduleModal
            bandId={bandId}
            userId={user.id}
            prefillDate={addPrefillDate}
            onClose={() => { setShowAddSchedule(false); setAddPrefillDate(undefined); }}
            onAdded={(s) => {
              setSchedules((prev) => [...prev, s].sort((a, b) => a.schedule_date.localeCompare(b.schedule_date)));
              setShowAddSchedule(false);
              setAddPrefillDate(undefined);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── ScheduleCard ─── */
function ScheduleCard({
  schedule: s,
  userId,
  onDelete,
  showDate,
}: {
  schedule: Schedule;
  userId: string;
  onDelete: (id: string) => void;
  showDate?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-white rounded-[16px] border-[2px] border-[#0A0A0A] p-4"
      style={{ boxShadow: '3px 3px 0 #0A0A0A' }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {showDate && (
            <p className="text-[11px] font-bold text-[#FF3D77] mb-0.5" style={{ fontFamily: 'Pretendard, sans-serif' }}>
              {s.schedule_date}
            </p>
          )}
          <p className="text-[15px] font-bold text-[#0A0A0A] truncate" style={{ fontFamily: 'Pretendard, sans-serif' }}>
            {s.title}
          </p>
          {(s.start_time || s.end_time) && (
            <p className="text-[12px] font-bold text-[#0A0A0A]/50 mt-0.5" style={{ fontFamily: 'Pretendard, sans-serif' }}>
              ⏰ {s.start_time ?? ''}{s.start_time && s.end_time ? ' ~ ' : ''}{s.end_time ?? ''}
            </p>
          )}
          {s.location && (
            <p className="text-[12px] font-bold text-[#0A0A0A]/50 mt-0.5 truncate" style={{ fontFamily: 'Pretendard, sans-serif' }}>
              📍 {s.location}
            </p>
          )}
          {s.notes && (
            <p className="text-[12px] font-bold text-[#0A0A0A]/40 mt-0.5 truncate" style={{ fontFamily: 'Pretendard, sans-serif' }}>
              💬 {s.notes}
            </p>
          )}
        </div>
        {s.created_by === userId && (
          <button
            onClick={() => onDelete(s.id)}
            className="w-7 h-7 rounded-full bg-[#0A0A0A]/5 flex items-center justify-center flex-shrink-0 text-[14px]"
          >
            ✕
          </button>
        )}
      </div>
    </motion.div>
  );
}

/* ─── JoinBandButton ─── */
function JoinBandButton({ bandId, user, onJoined }: { bandId: string; user: { id: string; user_metadata?: Record<string, unknown>; email?: string }; onJoined: () => void }) {
  const [joining, setJoining] = useState(false);

  async function handleJoin() {
    setJoining(true);
    const displayName = (user.user_metadata?.full_name as string) || user.email?.split('@')[0] || '뮤지션';
    await supabase.from('band_members').insert({
      band_id: bandId,
      user_id: user.id,
      role: 'member',
      display_name: displayName,
      avatar_url: (user.user_metadata?.avatar_url as string) || (user.user_metadata?.picture as string) || null,
    });
    setJoining(false);
    onJoined();
  }

  return (
    <motion.button
      whileTap={{ scale: 0.96, y: 2 }}
      onClick={handleJoin}
      disabled={joining}
      className="w-full py-4 bg-[#41C66B] rounded-[16px] border-[3px] border-[#0A0A0A] text-white font-bold text-[15px] mt-2"
      style={{ boxShadow: '4px 4px 0 #0A0A0A', fontFamily: 'Bungee, sans-serif' }}
    >
      {joining ? '합류 중...' : '🎸 이 밴드 합류하기'}
    </motion.button>
  );
}
