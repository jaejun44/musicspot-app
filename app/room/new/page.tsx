'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

const inputClass =
  'w-full px-3 py-2.5 bg-white border-[2px] border-[#0A0A0A] text-sm font-medium placeholder:text-[#0A0A0A]/30 focus:outline-none focus:border-[#FF3D77]';

export default function RegisterMyStudioPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    address: '',
    region: '',
    phone: '',
    room_type: '',
    has_drum: false,
    price_per_hour: '',
    price_info: '',
    hours: '',
    naver_place_url: '',
    kakao_channel: '',
    options: '',
    notes: '',
  });

  function set(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !form.name.trim() || !form.address.trim()) return;

    setLoading(true);
    setErrorMsg(null);

    const { data, error } = await supabase
      .from('studios')
      .insert({
        name: form.name.trim(),
        address: form.address.trim(),
        region: form.region.trim() || null,
        phone: form.phone.trim() || null,
        room_type: form.room_type || null,
        has_drum: form.has_drum,
        price_per_hour: form.price_per_hour ? Number(form.price_per_hour) : null,
        price_info: form.price_info.trim() || null,
        hours: form.hours.trim() || null,
        naver_place_url: form.naver_place_url.trim() || null,
        kakao_channel: form.kakao_channel.trim() || null,
        options: form.options.trim() || null,
        notes: form.notes.trim() || null,
        owner_id: user.id,
        is_published: true,
        source: 'user_submitted',
      })
      .select('id')
      .single();

    setLoading(false);
    if (error || !data) {
      setErrorMsg('등록 중 오류가 발생했어요. 다시 시도해주세요.');
      console.error(error);
      return;
    }
    router.push(`/room/${data.id}`);
  }

  // 로그인 로딩 중
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#FFF8F0] flex items-center justify-center">
        <div
          className="w-8 h-8 rounded-full border-[3px] border-[#FF3D77] border-t-transparent animate-spin"
        />
      </div>
    );
  }

  // 비로그인
  if (!user) {
    return (
      <div className="min-h-screen bg-[#FFF8F0] flex flex-col items-center justify-center px-6 text-center gap-5">
        <div
          className="bg-white rounded-[20px] border-[3px] border-[#0A0A0A] px-8 py-8 flex flex-col items-center max-w-sm"
          style={{ boxShadow: '6px 6px 0 #0A0A0A' }}
        >
          <div
            className="w-16 h-16 rounded-full bg-[#FF3D77] border-[3px] border-[#0A0A0A] flex items-center justify-center mb-4"
            style={{ boxShadow: '3px 3px 0 #0A0A0A' }}
          >
            <span className="text-[28px]">🔐</span>
          </div>
          <p className="font-bold text-[16px] text-[#0A0A0A] mb-2">로그인이 필요해요</p>
          <p className="text-[13px] text-[#0A0A0A]/50 font-bold mb-5">
            내 연습실을 등록하려면 먼저 로그인해주세요
          </p>
          <button
            onClick={() => router.push('/login')}
            className="px-6 py-3 bg-[#FF3D77] rounded-[14px] border-[3px] border-[#0A0A0A] text-white font-bold text-[14px]"
            style={{ boxShadow: '3px 3px 0 #0A0A0A' }}
          >
            로그인하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF8F0] pb-10">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#FFF8F0] border-b-[3px] border-[#0A0A0A] px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="w-8 h-8 flex items-center justify-center border-[2px] border-[#0A0A0A] bg-white"
          style={{ boxShadow: '2px 2px 0 #0A0A0A' }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-base font-bold">🎸 내 연습실 등록</h1>
      </div>

      <p className="text-[12px] text-[#0A0A0A]/50 font-bold px-4 mt-4 max-w-lg mx-auto leading-relaxed">
        내가 쓰는(또는 운영하는) 합주실·연습실을 등록하면 등록 즉시 검색에 노출돼요.
        허위 정보 등록 시 삭제될 수 있어요.
      </p>

      <form onSubmit={handleSubmit} className="px-4 mt-4 space-y-6 max-w-lg mx-auto">
        {/* 필수 정보 */}
        <section>
          <div
            className="bg-[#FF3D77] border-[2px] border-[#0A0A0A] px-3 py-1.5 inline-block mb-3"
            style={{ boxShadow: '2px 2px 0 #0A0A0A' }}
          >
            <h2 className="text-xs font-bold text-white">필수 정보</h2>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-[#0A0A0A]/50 mb-1 block">연습실 이름 *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="예: 홍대 락스타 합주실"
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-[#0A0A0A]/50 mb-1 block">주소 *</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => set('address', e.target.value)}
                placeholder="예: 서울 마포구 서교동 123-4"
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-[#0A0A0A]/50 mb-1 block">지역 (간략)</label>
              <input
                type="text"
                value={form.region}
                onChange={(e) => set('region', e.target.value)}
                placeholder="예: 홍대, 강남, 신촌"
                className={inputClass}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-[#0A0A0A]/50 mb-1 block">전화번호</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
                placeholder="예: 02-123-4567"
                className={inputClass}
              />
            </div>
          </div>
        </section>

        {/* 연습실 정보 */}
        <section>
          <div
            className="bg-[#4FC3F7] border-[2px] border-[#0A0A0A] px-3 py-1.5 inline-block mb-3"
            style={{ boxShadow: '2px 2px 0 #0A0A0A' }}
          >
            <h2 className="text-xs font-bold text-[#0A0A0A]">연습실 정보</h2>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-[#0A0A0A]/50 mb-1.5 block">룸 타입</label>
              <div className="flex gap-2">
                {[
                  { value: 'T', label: 'T룸 (합주)' },
                  { value: 'M', label: 'M룸 (개인)' },
                  { value: 'both', label: '둘 다' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => set('room_type', form.room_type === opt.value ? '' : opt.value)}
                    className={`flex-1 py-2 text-xs font-bold border-[2px] border-[#0A0A0A] transition-colors ${
                      form.room_type === opt.value
                        ? 'bg-[#FF3D77] text-white'
                        : 'bg-white text-[#0A0A0A] hover:bg-[#F5FF4E]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-white border-[2px] border-[#0A0A0A]">
              <span className="text-sm font-bold">🥁 드럼 가능</span>
              <button
                type="button"
                onClick={() => set('has_drum', !form.has_drum)}
                className={`w-11 h-6 border-[2px] border-[#0A0A0A] relative transition-colors ${
                  form.has_drum ? 'bg-[#41C66B]' : 'bg-[#0A0A0A]/20'
                }`}
              >
                <span
                  className={`absolute top-0.5 w-4 h-4 bg-white border-[2px] border-[#0A0A0A] transition-transform ${
                    form.has_drum ? 'left-[22px]' : 'left-0.5'
                  }`}
                />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-bold text-[#0A0A0A]/50 mb-1 block">시간당 가격 (원)</label>
                <input
                  type="number"
                  value={form.price_per_hour}
                  onChange={(e) => set('price_per_hour', e.target.value)}
                  placeholder="예: 15000"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[#0A0A0A]/50 mb-1 block">가격 안내 (텍스트)</label>
                <input
                  type="text"
                  value={form.price_info}
                  onChange={(e) => set('price_info', e.target.value)}
                  placeholder="예: 1인 5,000원"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-[#0A0A0A]/50 mb-1 block">영업시간</label>
              <input
                type="text"
                value={form.hours}
                onChange={(e) => set('hours', e.target.value)}
                placeholder="예: 매일 10:00 - 24:00"
                className={inputClass}
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#0A0A0A]/50 mb-1 block">옵션 / 편의시설</label>
              <input
                type="text"
                value={form.options}
                onChange={(e) => set('options', e.target.value)}
                placeholder="예: 주차가능, 냉난방, 샤워실"
                className={inputClass}
              />
            </div>
          </div>
        </section>

        {/* 예약/문의 채널 */}
        <section>
          <div
            className="bg-[#F5FF4E] border-[2px] border-[#0A0A0A] px-3 py-1.5 inline-block mb-3"
            style={{ boxShadow: '2px 2px 0 #0A0A0A' }}
          >
            <h2 className="text-xs font-bold text-[#0A0A0A]">예약/문의 채널 (선택)</h2>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-[#0A0A0A]/50 mb-1 block">
                예약 링크 (네이버 플레이스, 스페이스클라우드, 홈페이지 등)
              </label>
              <input
                type="url"
                value={form.naver_place_url}
                onChange={(e) => set('naver_place_url', e.target.value)}
                placeholder="https://..."
                className={inputClass}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-[#0A0A0A]/50 mb-1 block">카카오 채널 URL</label>
              <input
                type="text"
                value={form.kakao_channel}
                onChange={(e) => set('kakao_channel', e.target.value)}
                placeholder="예: https://pf.kakao.com/_xABCde"
                className={inputClass}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-[#0A0A0A]/50 mb-1 block">추가 메모</label>
              <textarea
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
                placeholder="특이사항이나 전달사항을 자유롭게 적어주세요"
                rows={3}
                className={`${inputClass} resize-none`}
              />
            </div>
          </div>
        </section>

        {errorMsg && (
          <p className="text-[12px] font-bold text-[#FF3D77] text-center">{errorMsg}</p>
        )}

        <button
          type="submit"
          disabled={loading || !form.name.trim() || !form.address.trim()}
          className="w-full py-3.5 bg-[#FF3D77] border-[3px] border-[#0A0A0A] text-white font-bold text-sm disabled:opacity-50 transition-transform active:translate-x-[2px] active:translate-y-[2px]"
          style={{ boxShadow: '4px 4px 0 #0A0A0A' }}
        >
          {loading ? '등록 중...' : '🎸 지금 바로 등록하기'}
        </button>

        <p className="text-xs font-medium text-[#0A0A0A]/40 text-center pb-4">
          등록 즉시 검색 결과에 노출돼요. 내가 등록한 연습실은 마이페이지에서 삭제할 수 있어요.
        </p>
      </form>
    </div>
  );
}
