'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

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
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center space-y-4">
        <div className="text-4xl">🎸</div>
        <h1 className="text-xl font-bold">등록 신청 완료!</h1>
        <p className="text-brand-muted text-sm leading-relaxed">
          신청해주셔서 감사합니다.<br />
          검토 후 빠르게 등록해드리겠습니다.
        </p>
        <button
          onClick={() => router.push('/')}
          className="mt-4 px-6 py-3 bg-brand-red text-white font-semibold rounded-xl text-sm"
        >
          홈으로 돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-10">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-brand-bg/95 backdrop-blur border-b border-brand-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-brand-muted">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-base font-bold">연습실 등록 신청</h1>
      </div>

      <form onSubmit={handleSubmit} className="px-4 mt-5 space-y-5 max-w-lg mx-auto">

        {/* 필수 정보 */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-brand-muted uppercase tracking-wide">필수 정보</h2>

          <div>
            <label className="text-xs text-brand-muted mb-1 block">업체명 *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="예: 홍대 락스타 합주실"
              required
              className="w-full px-3 py-2.5 bg-brand-card border border-brand-border rounded-xl text-sm placeholder:text-brand-muted focus:outline-none focus:border-brand-red"
            />
          </div>

          <div>
            <label className="text-xs text-brand-muted mb-1 block">주소 *</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => set('address', e.target.value)}
              placeholder="예: 서울 마포구 서교동 123-4"
              required
              className="w-full px-3 py-2.5 bg-brand-card border border-brand-border rounded-xl text-sm placeholder:text-brand-muted focus:outline-none focus:border-brand-red"
            />
          </div>

          <div>
            <label className="text-xs text-brand-muted mb-1 block">지역 (간략)</label>
            <input
              type="text"
              value={form.region}
              onChange={(e) => set('region', e.target.value)}
              placeholder="예: 홍대, 강남, 신촌"
              className="w-full px-3 py-2.5 bg-brand-card border border-brand-border rounded-xl text-sm placeholder:text-brand-muted focus:outline-none focus:border-brand-red"
            />
          </div>

          <div>
            <label className="text-xs text-brand-muted mb-1 block">전화번호</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
              placeholder="예: 02-123-4567"
              className="w-full px-3 py-2.5 bg-brand-card border border-brand-border rounded-xl text-sm placeholder:text-brand-muted focus:outline-none focus:border-brand-red"
            />
          </div>
        </section>

        {/* 연습실 정보 */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-brand-muted uppercase tracking-wide">연습실 정보</h2>

          <div>
            <label className="text-xs text-brand-muted mb-1.5 block">룸 타입</label>
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
                  className={`flex-1 py-2 text-xs rounded-lg border transition-colors ${
                    form.room_type === opt.value
                      ? 'border-brand-red bg-brand-red/10 text-brand-red font-semibold'
                      : 'border-brand-border text-brand-muted'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-brand-card border border-brand-border rounded-xl">
            <span className="text-sm">드럼 가능</span>
            <button
              type="button"
              onClick={() => set('has_drum', !form.has_drum)}
              className={`w-10 h-5 rounded-full relative transition-colors ${
                form.has_drum ? 'bg-brand-red' : 'bg-brand-border'
              }`}
            >
              <span
                className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                  form.has_drum ? 'left-5' : 'left-0.5'
                }`}
              />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-brand-muted mb-1 block">시간당 가격 (원)</label>
              <input
                type="number"
                value={form.price_per_hour}
                onChange={(e) => set('price_per_hour', e.target.value)}
                placeholder="예: 15000"
                className="w-full px-3 py-2.5 bg-brand-card border border-brand-border rounded-xl text-sm placeholder:text-brand-muted focus:outline-none focus:border-brand-red"
              />
            </div>
            <div>
              <label className="text-xs text-brand-muted mb-1 block">가격 안내 (텍스트)</label>
              <input
                type="text"
                value={form.price_info}
                onChange={(e) => set('price_info', e.target.value)}
                placeholder="예: 1인 5,000원"
                className="w-full px-3 py-2.5 bg-brand-card border border-brand-border rounded-xl text-sm placeholder:text-brand-muted focus:outline-none focus:border-brand-red"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-brand-muted mb-1 block">영업시간</label>
            <input
              type="text"
              value={form.hours}
              onChange={(e) => set('hours', e.target.value)}
              placeholder="예: 매일 10:00 - 24:00"
              className="w-full px-3 py-2.5 bg-brand-card border border-brand-border rounded-xl text-sm placeholder:text-brand-muted focus:outline-none focus:border-brand-red"
            />
          </div>

          <div>
            <label className="text-xs text-brand-muted mb-1 block">옵션 / 편의시설</label>
            <input
              type="text"
              value={form.options}
              onChange={(e) => set('options', e.target.value)}
              placeholder="예: 주차가능, 냉난방, 샤워실"
              className="w-full px-3 py-2.5 bg-brand-card border border-brand-border rounded-xl text-sm placeholder:text-brand-muted focus:outline-none focus:border-brand-red"
            />
          </div>
        </section>

        {/* 온라인 채널 */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-brand-muted uppercase tracking-wide">온라인 채널 (선택)</h2>

          <div>
            <label className="text-xs text-brand-muted mb-1 block">네이버 플레이스 URL</label>
            <input
              type="url"
              value={form.naver_place_url}
              onChange={(e) => set('naver_place_url', e.target.value)}
              placeholder="https://map.naver.com/..."
              className="w-full px-3 py-2.5 bg-brand-card border border-brand-border rounded-xl text-sm placeholder:text-brand-muted focus:outline-none focus:border-brand-red"
            />
          </div>

          <div>
            <label className="text-xs text-brand-muted mb-1 block">카카오 채널 ID</label>
            <input
              type="text"
              value={form.kakao_channel}
              onChange={(e) => set('kakao_channel', e.target.value)}
              placeholder="예: _xABCde (@ 뒤 아이디)"
              className="w-full px-3 py-2.5 bg-brand-card border border-brand-border rounded-xl text-sm placeholder:text-brand-muted focus:outline-none focus:border-brand-red"
            />
          </div>
        </section>

        {/* 신청자 정보 */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-brand-muted uppercase tracking-wide">신청자 정보</h2>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-brand-muted mb-1 block">담당자 이름</label>
              <input
                type="text"
                value={form.applicant_name}
                onChange={(e) => set('applicant_name', e.target.value)}
                placeholder="홍길동"
                className="w-full px-3 py-2.5 bg-brand-card border border-brand-border rounded-xl text-sm placeholder:text-brand-muted focus:outline-none focus:border-brand-red"
              />
            </div>
            <div>
              <label className="text-xs text-brand-muted mb-1 block">연락처</label>
              <input
                type="text"
                value={form.applicant_contact}
                onChange={(e) => set('applicant_contact', e.target.value)}
                placeholder="이메일 또는 전화"
                className="w-full px-3 py-2.5 bg-brand-card border border-brand-border rounded-xl text-sm placeholder:text-brand-muted focus:outline-none focus:border-brand-red"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-brand-muted mb-1 block">추가 메모</label>
            <textarea
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="특이사항이나 전달사항을 자유롭게 적어주세요"
              rows={3}
              className="w-full px-3 py-2.5 bg-brand-card border border-brand-border rounded-xl text-sm placeholder:text-brand-muted focus:outline-none focus:border-brand-red resize-none"
            />
          </div>
        </section>

        <button
          type="submit"
          disabled={loading || !form.name.trim() || !form.address.trim()}
          className="w-full py-3.5 bg-brand-red text-white font-semibold rounded-xl text-sm disabled:opacity-50"
        >
          {loading ? '신청 중...' : '등록 신청하기'}
        </button>

        <p className="text-xs text-brand-muted text-center pb-4">
          검토 후 Music Spot에 등록됩니다. 보통 1~3일 소요됩니다.
        </p>
      </form>
    </div>
  );
}
