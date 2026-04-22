'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Studio } from '@/types/studio';

const inputClass =
  'w-full px-3 py-2.5 bg-white border-[2px] border-comic-black text-sm font-medium placeholder:text-comic-black/30 focus:outline-none focus:border-comic-pink';
const labelClass = 'text-xs font-bold text-comic-black/50 block mb-1';

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
      <div className="min-h-screen bg-comic-cream flex items-center justify-center">
        <div className="w-8 h-8 border-[3px] border-comic-pink border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!studio) {
    return (
      <div className="min-h-screen bg-comic-cream flex items-center justify-center">
        <p className="font-bold text-comic-black/50">연습실을 찾을 수 없습니다</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-comic-cream pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-comic-cream border-b-[3px] border-comic-black px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => router.push('/admin')}
          className="w-8 h-8 flex items-center justify-center border-[2px] border-comic-black bg-white"
          style={{ boxShadow: '2px 2px 0 #0A0A0A' }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-base font-bold truncate">{studio.name} 수정</h1>
      </div>

      <div className="px-4 mt-5 space-y-6 max-w-2xl mx-auto">

        {/* Basic Info */}
        <section>
          <div
            className="bg-comic-pink border-[2px] border-comic-black px-3 py-1.5 inline-block mb-3"
            style={{ boxShadow: '2px 2px 0 #0A0A0A' }}
          >
            <h2 className="text-xs font-bold text-white">기본 정보</h2>
          </div>
          <div className="space-y-3">
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
          </div>
        </section>

        {/* Music-specific */}
        <section>
          <div
            className="bg-comic-blue border-[2px] border-comic-black px-3 py-1.5 inline-block mb-3"
            style={{ boxShadow: '2px 2px 0 #0A0A0A' }}
          >
            <h2 className="text-xs font-bold text-comic-black">음악 특화 정보</h2>
          </div>
          <div className="space-y-3">
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

            <div className="flex items-center justify-between p-3 bg-white border-[2px] border-comic-black">
              <span className="text-sm font-bold">🥁 드럼 가능</span>
              <button
                type="button"
                onClick={() => updateField('has_drum', !studio.has_drum)}
                className={`w-11 h-6 border-[2px] border-comic-black relative transition-colors ${
                  studio.has_drum ? 'bg-comic-green' : 'bg-comic-black/20'
                }`}
              >
                <span
                  className={`absolute top-0.5 w-4 h-4 bg-white border-[2px] border-comic-black transition-transform ${
                    studio.has_drum ? 'left-[22px]' : 'left-0.5'
                  }`}
                />
              </button>
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
          </div>
        </section>

        {/* Contact */}
        <section>
          <div
            className="bg-comic-yellow border-[2px] border-comic-black px-3 py-1.5 inline-block mb-3"
            style={{ boxShadow: '2px 2px 0 #0A0A0A' }}
          >
            <h2 className="text-xs font-bold text-comic-black">문의 채널</h2>
          </div>
          <div className="space-y-3">
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
          </div>
        </section>

        {/* Photos */}
        <section>
          <div
            className="bg-comic-green border-[2px] border-comic-black px-3 py-1.5 inline-block mb-3"
            style={{ boxShadow: '2px 2px 0 #0A0A0A' }}
          >
            <h2 className="text-xs font-bold text-comic-black">사진</h2>
          </div>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {(studio.photos ?? []).map((url, idx) => (
              <div key={idx} className="relative border-[2px] border-comic-black">
                <img
                  src={url}
                  alt={`사진 ${idx + 1}`}
                  className="w-full h-24 object-cover"
                />
                <button
                  onClick={() => removePhoto(url)}
                  className="absolute top-0.5 right-0.5 w-5 h-5 bg-comic-pink border-[1px] border-comic-black text-white text-xs flex items-center justify-center font-bold"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <label className="block">
            <span
              className="px-4 py-2 bg-white border-[2px] border-comic-black text-sm font-bold cursor-pointer inline-block transition-transform active:translate-x-[1px] active:translate-y-[1px]"
              style={{ boxShadow: '2px 2px 0 #0A0A0A' }}
            >
              {uploading ? '업로드 중...' : '+ 사진 추가'}
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
        <section>
          <div
            className="bg-comic-black border-[2px] border-comic-black px-3 py-1.5 inline-block mb-3"
            style={{ boxShadow: '2px 2px 0 #FF3D77' }}
          >
            <h2 className="text-xs font-bold text-white">메모</h2>
          </div>
          <textarea
            value={studio.notes ?? ''}
            onChange={(e) => updateField('notes', e.target.value)}
            rows={3}
            className={`${inputClass} resize-none`}
          />
        </section>

        {/* Published toggle */}
        <div className="flex items-center justify-between p-4 bg-white border-[2px] border-comic-black" style={{ boxShadow: '3px 3px 0 #0A0A0A' }}>
          <div>
            <p className="text-sm font-bold">서비스에 공개</p>
            <p className="text-xs text-comic-black/50">체크하면 검색 결과에 노출됩니다</p>
          </div>
          <button
            type="button"
            onClick={() => updateField('is_published', !studio.is_published)}
            className={`w-11 h-6 border-[2px] border-comic-black relative transition-colors ${
              studio.is_published ? 'bg-comic-green' : 'bg-comic-black/20'
            }`}
          >
            <span
              className={`absolute top-0.5 w-4 h-4 bg-white border-[2px] border-comic-black transition-transform ${
                studio.is_published ? 'left-[22px]' : 'left-0.5'
              }`}
            />
          </button>
        </div>

      </div>

      {/* Save button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-comic-cream border-t-[3px] border-comic-black">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3.5 bg-comic-pink border-[3px] border-comic-black text-white font-bold text-sm disabled:opacity-50 transition-transform active:translate-x-[2px] active:translate-y-[2px]"
            style={{ boxShadow: '4px 4px 0 #0A0A0A' }}
          >
            {saving ? '저장 중...' : '💾 저장하기'}
          </button>
        </div>
      </div>
    </div>
  );
}
