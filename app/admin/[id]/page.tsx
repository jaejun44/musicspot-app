'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Studio } from '@/types/studio';

export default function AdminEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [studio, setStudio] = useState<Studio | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('admin_auth') !== 'true') {
      router.replace('/admin');
      return;
    }
    async function load() {
      const { data } = await supabase.from('studios').select('*').eq('id', id).single();
      if (data) setStudio(data as Studio);
      setLoading(false);
    }
    load();
  }, [id]);

  async function handleSave() {
    if (!studio) return;
    setSaving(true);

    const { error } = await supabase
      .from('studios')
      .update({
        name: studio.name,
        address: studio.address,
        phone: studio.phone,
        hours: studio.hours,
        room_type: studio.room_type,
        has_drum: studio.has_drum,
        instruments: studio.instruments,
        amp_info: studio.amp_info,
        soundproof_grade: studio.soundproof_grade,
        price_per_hour: studio.price_per_hour,
        kakao_channel: studio.kakao_channel,
        naver_place_url: studio.naver_place_url,
        notes: studio.notes,
        photos: studio.photos,
        is_published: studio.is_published,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    setSaving(false);

    if (error) {
      alert('저장 실패: ' + error.message);
    } else {
      alert('저장 완료');
    }
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !studio) return;

    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${studio.id}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('studio-photos')
      .upload(path, file);

    if (uploadError) {
      alert('업로드 실패: ' + uploadError.message);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from('studio-photos')
      .getPublicUrl(path);

    setStudio({
      ...studio,
      photos: [...(studio.photos ?? []), urlData.publicUrl],
    });
    setUploading(false);
  }

  async function removePhoto(url: string) {
    if (!studio) return;
    setStudio({
      ...studio,
      photos: (studio.photos ?? []).filter((p) => p !== url),
    });
  }

  function updateField<K extends keyof Studio>(key: K, value: Studio[K]) {
    if (!studio) return;
    setStudio({ ...studio, [key]: value });
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-red border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!studio) {
    return (
      <div className="min-h-screen flex items-center justify-center text-brand-muted">
        연습실을 찾을 수 없습니다
      </div>
    );
  }

  const inputClass =
    'w-full px-3 py-2 bg-brand-bg border border-brand-border rounded-lg text-sm focus:outline-none focus:border-brand-red';
  const labelClass = 'text-xs text-brand-muted block mb-1';

  return (
    <div className="min-h-screen p-4 max-w-2xl mx-auto pb-20">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push('/admin')} className="text-brand-muted">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-lg font-bold truncate">{studio.name} 수정</h1>
      </div>

      <div className="space-y-6">
        {/* Basic Info */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold border-b border-brand-border pb-2">
            기본 정보
          </h2>
          <div>
            <label className={labelClass}>연습실명</label>
            <input
              type="text"
              value={studio.name}
              onChange={(e) => updateField('name', e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>주소</label>
            <input
              type="text"
              value={studio.address ?? ''}
              onChange={(e) => updateField('address', e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>전화번호</label>
            <input
              type="text"
              value={studio.phone ?? ''}
              onChange={(e) => updateField('phone', e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>운영시간</label>
            <input
              type="text"
              value={studio.hours ?? ''}
              onChange={(e) => updateField('hours', e.target.value)}
              className={inputClass}
            />
          </div>
        </section>

        {/* Music-specific */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold border-b border-brand-border pb-2">
            음악 특화 정보
          </h2>
          <div>
            <label className={labelClass}>룸 타입</label>
            <select
              value={studio.room_type ?? ''}
              onChange={(e) =>
                updateField('room_type', (e.target.value || null) as Studio['room_type'])
              }
              className={inputClass}
            >
              <option value="">선택 안함</option>
              <option value="T">T룸</option>
              <option value="M">M룸</option>
              <option value="both">T/M 겸용</option>
            </select>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={studio.has_drum}
                onChange={(e) => updateField('has_drum', e.target.checked)}
                className="accent-brand-red"
              />
              드럼 가능
            </label>
          </div>

          <div>
            <label className={labelClass}>보유 악기 (쉼표로 구분)</label>
            <input
              type="text"
              value={(studio.instruments ?? []).join(', ')}
              onChange={(e) =>
                updateField(
                  'instruments',
                  e.target.value
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean)
                )
              }
              placeholder="기타, 베이스, 드럼"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>앰프 정보</label>
            <input
              type="text"
              value={studio.amp_info ?? ''}
              onChange={(e) => updateField('amp_info', e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>방음 등급</label>
            <select
              value={studio.soundproof_grade ?? ''}
              onChange={(e) =>
                updateField(
                  'soundproof_grade',
                  (e.target.value || null) as Studio['soundproof_grade']
                )
              }
              className={inputClass}
            >
              <option value="">선택 안함</option>
              <option value="A">A등급</option>
              <option value="B">B등급</option>
              <option value="C">C등급</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>시간당 가격 (원)</label>
            <input
              type="number"
              value={studio.price_per_hour ?? ''}
              onChange={(e) =>
                updateField(
                  'price_per_hour',
                  e.target.value ? Number(e.target.value) : null
                )
              }
              className={inputClass}
            />
          </div>
        </section>

        {/* Contact */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold border-b border-brand-border pb-2">
            문의 채널
          </h2>
          <div>
            <label className={labelClass}>카카오톡 채널 ID</label>
            <input
              type="text"
              value={studio.kakao_channel ?? ''}
              onChange={(e) => updateField('kakao_channel', e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>네이버 플레이스 URL</label>
            <input
              type="text"
              value={studio.naver_place_url ?? ''}
              onChange={(e) => updateField('naver_place_url', e.target.value)}
              className={inputClass}
            />
          </div>
        </section>

        {/* Photos */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold border-b border-brand-border pb-2">
            사진
          </h2>
          <div className="grid grid-cols-3 gap-2">
            {(studio.photos ?? []).map((url, idx) => (
              <div key={idx} className="relative group">
                <img
                  src={url}
                  alt={`사진 ${idx + 1}`}
                  className="w-full h-24 object-cover rounded-lg"
                />
                <button
                  onClick={() => removePhoto(url)}
                  className="absolute top-1 right-1 w-5 h-5 bg-red-600 text-white text-xs rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <label className="block">
            <span className="px-4 py-2 bg-brand-card border border-brand-border rounded-lg text-sm cursor-pointer inline-block">
              {uploading ? '업로드 중...' : '사진 추가'}
            </span>
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              disabled={uploading}
              className="hidden"
            />
          </label>
        </section>

        {/* Notes */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold border-b border-brand-border pb-2">
            메모
          </h2>
          <textarea
            value={studio.notes ?? ''}
            onChange={(e) => updateField('notes', e.target.value)}
            rows={3}
            className={inputClass}
          />
        </section>

        {/* Published toggle */}
        <label className="flex items-center gap-3 p-4 bg-brand-card border border-brand-border rounded-xl">
          <input
            type="checkbox"
            checked={studio.is_published}
            onChange={(e) => updateField('is_published', e.target.checked)}
            className="accent-brand-red w-5 h-5"
          />
          <div>
            <p className="text-sm font-medium">서비스에 공개</p>
            <p className="text-xs text-brand-muted">
              체크하면 검색 결과에 노출됩니다
            </p>
          </div>
        </label>
      </div>

      {/* Save button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-brand-bg/95 backdrop-blur border-t border-brand-border max-w-2xl mx-auto">
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 bg-brand-red text-white font-semibold rounded-xl disabled:opacity-50"
        >
          {saving ? '저장 중...' : '저장'}
        </button>
      </div>
    </div>
  );
}
