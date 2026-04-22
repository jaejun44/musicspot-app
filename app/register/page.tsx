'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const inputClass =
  'w-full px-3 py-2.5 bg-white border-[2px] border-comic-black text-sm font-medium placeholder:text-comic-black/30 focus:outline-none focus:border-comic-pink';

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

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
    applicant_name: '',
    applicant_contact: '',
  });

  function set(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.address.trim()) return;

    setLoading(true);
    const { error } = await supabase.from('studio_requests').insert({
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
      applicant_name: form.applicant_name.trim() || null,
      applicant_contact: form.applicant_contact.trim() || null,
    });

    setLoading(false);
    if (error) {
      alert('등록 요청 중 오류가 발생했습니다. 다시 시도해주세요.');
      console.error(error);
    } else {
      setSubmitted(true);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-comic-cream flex flex-col items-center justify-center px-6 text-center gap-4">
        <div
          className="bg-comic-yellow border-[3px] border-comic-black px-10 py-8"
          style={{ boxShadow: '6px 6px 0 #FF3D77' }}
        >
          <p className="text-5xl mb-3">🎸</p>
          <p className="font-bungee text-2xl text-comic-black mb-1">DONE!</p>
          <p className="text-sm font-bold text-comic-black/70 leading-relaxed">
            신청해주셔서 감사합니다.<br />
            검토 후 빠르게 등록해드리겠습니다.
          </p>
        </div>
        <button
          onClick={() => router.push('/')}
          className="px-6 py-3 bg-comic-pink border-[2px] border-comic-black text-white text-sm font-bold transition-transform active:translate-x-[2px] active:translate-y-[2px]"
          style={{ boxShadow: '3px 3px 0 #0A0A0A' }}
        >
          홈으로 돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-comic-cream pb-10">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-comic-cream border-b-[3px] border-comic-black px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="w-8 h-8 flex items-center justify-center border-[2px] border-comic-black bg-white"
          style={{ boxShadow: '2px 2px 0 #0A0A0A' }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-base font-bold">🎵 연습실 등록 신청</h1>
      </div>

      <form onSubmit={handleSubmit} className="px-4 mt-5 space-y-6 max-w-lg mx-auto">

        {/* 필수 정보 */}
        <section>
          <div
            className="bg-comic-pink border-[2px] border-comic-black px-3 py-1.5 inline-block mb-3"
            style={{ boxShadow: '2px 2px 0 #0A0A0A' }}
          >
            <h2 className="text-xs font-bold text-white">필수 정보</h2>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-comic-black/50 mb-1 block">업체명 *</label>
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
              <label className="text-xs font-bold text-comic-black/50 mb-1 block">주소 *</label>
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
              <label className="text-xs font-bold text-comic-black/50 mb-1 block">지역 (간략)</label>
              <input
                type="text"
                value={form.region}
                onChange={(e) => set('region', e.target.value)}
                placeholder="예: 홍대, 강남, 신촌"
                className={inputClass}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-comic-black/50 mb-1 block">전화번호</label>
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
            className="bg-comic-blue border-[2px] border-comic-black px-3 py-1.5 inline-block mb-3"
            style={{ boxShadow: '2px 2px 0 #0A0A0A' }}
          >
            <h2 className="text-xs font-bold text-comic-black">연습실 정보</h2>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-comic-black/50 mb-1.5 block">룸 타입</label>
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
                    className={`flex-1 py-2 text-xs font-bold border-[2px] border-comic-black transition-colors ${
                      form.room_type === opt.value
                        ? 'bg-comic-pink text-white'
                        : 'bg-white text-comic-black hover:bg-comic-yellow'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-white border-[2px] border-comic-black">
              <span className="text-sm font-bold">🥁 드럼 가능</span>
              <button
                type="button"
                onClick={() => set('has_drum', !form.has_drum)}
                className={`w-11 h-6 border-[2px] border-comic-black relative transition-colors ${
                  form.has_drum ? 'bg-comic-green' : 'bg-comic-black/20'
                }`}
              >
                <span
                  className={`absolute top-0.5 w-4 h-4 bg-white border-[2px] border-comic-black transition-transform ${
                    form.has_drum ? 'left-[22px]' : 'left-0.5'
                  }`}
                />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-bold text-comic-black/50 mb-1 block">시간당 가격 (원)</label>
                <input
                  type="number"
                  value={form.price_per_hour}
                  onChange={(e) => set('price_per_hour', e.target.value)}
                  placeholder="예: 15000"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-comic-black/50 mb-1 block">가격 안내 (텍스트)</label>
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
              <label className="text-xs font-bold text-comic-black/50 mb-1 block">영업시간</label>
              <input
                type="text"
                value={form.hours}
                onChange={(e) => set('hours', e.target.value)}
                placeholder="예: 매일 10:00 - 24:00"
                className={inputClass}
              />
            </div>

            <div>
              <label className="text-xs font-bold text-comic-black/50 mb-1 block">옵션 / 편의시설</label>
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

        {/* 온라인 채널 */}
        <section>
          <div
            className="bg-comic-yellow border-[2px] border-comic-black px-3 py-1.5 inline-block mb-3"
            style={{ boxShadow: '2px 2px 0 #0A0A0A' }}
          >
            <h2 className="text-xs font-bold text-comic-black">온라인 채널 (선택)</h2>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-comic-black/50 mb-1 block">네이버 플레이스 URL</label>
              <input
                type="url"
                value={form.naver_place_url}
                onChange={(e) => set('naver_place_url', e.target.value)}
                placeholder="https://map.naver.com/..."
                className={inputClass}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-comic-black/50 mb-1 block">카카오 채널 ID</label>
              <input
                type="text"
                value={form.kakao_channel}
                onChange={(e) => set('kakao_channel', e.target.value)}
                placeholder="예: _xABCde (@ 뒤 아이디)"
                className={inputClass}
              />
            </div>
          </div>
        </section>

        {/* 신청자 정보 */}
        <section>
          <div
            className="bg-comic-green border-[2px] border-comic-black px-3 py-1.5 inline-block mb-3"
            style={{ boxShadow: '2px 2px 0 #0A0A0A' }}
          >
            <h2 className="text-xs font-bold text-comic-black">신청자 정보</h2>
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-bold text-comic-black/50 mb-1 block">담당자 이름</label>
                <input
                  type="text"
                  value={form.applicant_name}
                  onChange={(e) => set('applicant_name', e.target.value)}
                  placeholder="홍길동"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-comic-black/50 mb-1 block">연락처</label>
                <input
                  type="text"
                  value={form.applicant_contact}
                  onChange={(e) => set('applicant_contact', e.target.value)}
                  placeholder="이메일 또는 전화"
                  className={inputClass}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-comic-black/50 mb-1 block">추가 메모</label>
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

        <button
          type="submit"
          disabled={loading || !form.name.trim() || !form.address.trim()}
          className="w-full py-3.5 bg-comic-pink border-[3px] border-comic-black text-white font-bold text-sm disabled:opacity-50 transition-transform active:translate-x-[2px] active:translate-y-[2px]"
          style={{ boxShadow: '4px 4px 0 #0A0A0A' }}
        >
          {loading ? '신청 중...' : '🎵 등록 신청하기'}
        </button>

        <p className="text-xs font-medium text-comic-black/40 text-center pb-4">
          검토 후 Music Spot에 등록됩니다. 보통 1~3일 소요됩니다.
        </p>
      </form>
    </div>
  );
}
