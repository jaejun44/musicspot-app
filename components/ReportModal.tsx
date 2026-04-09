'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { trackEvent } from '@/lib/analytics';

interface Props {
  studioId?: string;
  defaultType?: 'correction' | 'new_studio' | 'closed';
  onClose: () => void;
}

const TYPES = [
  { value: 'correction' as const, label: '정보가 틀려요' },
  { value: 'new_studio' as const, label: '새 연습실 알려주기' },
  { value: 'closed' as const, label: '폐업/운영중단' },
];

export default function ReportModal({ studioId, defaultType, onClose }: Props) {
  const [reportType, setReportType] = useState(defaultType ?? 'correction');
  const [content, setContent] = useState('');
  const [contact, setContact] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;

    setSubmitting(true);
    const { error } = await supabase.from('studio_reports').insert({
      studio_id: studioId || null,
      report_type: reportType,
      content: content.trim(),
      reporter_contact: contact.trim() || null,
    });

    setSubmitting(false);
    if (!error) {
      trackEvent('studio_report_submit', {
        studio_id: studioId || 'none',
        report_type: reportType,
      });
      setSubmitted(true);
      setTimeout(onClose, 1500);
    } else {
      alert('제출에 실패했습니다. 다시 시도해주세요.');
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative w-full max-w-lg bg-brand-bg border border-brand-border rounded-t-2xl sm:rounded-2xl p-5 max-h-[90vh] overflow-y-auto">
        {submitted ? (
          <div className="text-center py-8">
            <p className="text-2xl mb-2">🎸</p>
            <p className="font-semibold">감사합니다!</p>
            <p className="text-sm text-brand-muted mt-1">확인 후 반영하겠습니다</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold">정보 제보</h2>
              <button onClick={onClose} className="text-brand-muted text-xl leading-none">&times;</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Type */}
              <div className="flex gap-2">
                {TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setReportType(t.value)}
                    className={`flex-1 py-2 text-xs rounded-lg border transition-colors ${
                      reportType === t.value
                        ? 'bg-brand-red border-brand-red text-white'
                        : 'border-brand-border text-brand-muted'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Content */}
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={
                  reportType === 'new_studio'
                    ? '연습실 이름, 위치, 특징 등을 알려주세요'
                    : '어떤 정보가 틀린지 알려주세요'
                }
                rows={4}
                required
                className="w-full px-3 py-2.5 bg-brand-card border border-brand-border rounded-lg text-sm placeholder:text-brand-muted focus:outline-none focus:border-brand-red resize-none"
              />

              {/* Contact */}
              <input
                type="text"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="답변 받으실 연락처 (선택)"
                className="w-full px-3 py-2.5 bg-brand-card border border-brand-border rounded-lg text-sm placeholder:text-brand-muted focus:outline-none focus:border-brand-red"
              />

              <button
                type="submit"
                disabled={submitting || !content.trim()}
                className="w-full py-3 bg-brand-red text-white font-semibold rounded-xl disabled:opacity-50"
              >
                {submitting ? '제출 중...' : '제출하기'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
