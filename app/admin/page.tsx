'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Studio } from '@/types/studio';

interface Feedback {
  id: string;
  name: string | null;
  content: string;
  rating: number | null;
  page_path: string | null;
  created_at: string;
}

export default function AdminPage() {
  const [tab, setTab] = useState<'studios' | 'feedbacks'>('studios');
  const [studios, setStudios] = useState<Studio[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [publishedFilter, setPublishedFilter] = useState<'all' | 'true' | 'false'>('all');

  useEffect(() => {
    fetchStudios();
    fetchFeedbacks();
  }, []);

  async function fetchStudios() {
    setLoading(true);
    const { data, error } = await supabase
      .from('studios')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5000);

    if (!error && data) {
      setStudios(data as Studio[]);
    }
    setLoading(false);
  }

  async function fetchFeedbacks() {
    const { data } = await supabase
      .from('feedbacks')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);

    if (data) {
      setFeedbacks(data as Feedback[]);
    }
  }

  async function togglePublish(id: string, current: boolean) {
    const { error } = await supabase
      .from('studios')
      .update({ is_published: !current, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (!error) {
      setStudios((prev) =>
        prev.map((s) => (s.id === id ? { ...s, is_published: !current } : s))
      );
    }
  }

  const filtered = studios.filter((s) => {
    const matchesSearch =
      !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.region ?? '').toLowerCase().includes(search.toLowerCase());
    const matchesPublished =
      publishedFilter === 'all' ||
      (publishedFilter === 'true' && s.is_published) ||
      (publishedFilter === 'false' && !s.is_published);
    return matchesSearch && matchesPublished;
  });

  return (
    <div className="min-h-screen p-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">
          Music <span className="text-brand-red">Spot</span> 관리자
        </h1>
        <span className="text-sm text-brand-muted">
          총 {studios.length}개 / 공개 {studios.filter((s) => s.is_published).length}개
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-brand-card rounded-lg p-1">
        <button
          onClick={() => setTab('studios')}
          className={`flex-1 py-2 text-sm rounded-md transition-colors ${
            tab === 'studios' ? 'bg-brand-red text-white font-semibold' : 'text-brand-muted'
          }`}
        >
          연습실 ({studios.length})
        </button>
        <button
          onClick={() => setTab('feedbacks')}
          className={`flex-1 py-2 text-sm rounded-md transition-colors ${
            tab === 'feedbacks' ? 'bg-brand-red text-white font-semibold' : 'text-brand-muted'
          }`}
        >
          피드백 ({feedbacks.length})
        </button>
      </div>

      {tab === 'studios' && (
        <>
          {/* Filters */}
          <div className="flex gap-3 mb-4">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="이름 / 지역 검색"
              className="flex-1 px-3 py-2 bg-brand-card border border-brand-border rounded-lg text-sm placeholder:text-brand-muted focus:outline-none focus:border-brand-red"
            />
            <select
              value={publishedFilter}
              onChange={(e) => setPublishedFilter(e.target.value as any)}
              className="px-3 py-2 bg-brand-card border border-brand-border rounded-lg text-sm"
            >
              <option value="all">전체</option>
              <option value="true">공개</option>
              <option value="false">비공개</option>
            </select>
          </div>

          {/* Studios Table */}
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-2 border-brand-red border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-brand-border text-brand-muted text-left">
                    <th className="py-2 pr-4">이름</th>
                    <th className="py-2 pr-4">지역</th>
                    <th className="py-2 pr-4">룸타입</th>
                    <th className="py-2 pr-4">드럼</th>
                    <th className="py-2 pr-4">공개</th>
                    <th className="py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((studio) => (
                    <tr
                      key={studio.id}
                      className="border-b border-brand-border/50 hover:bg-brand-card/50"
                    >
                      <td className="py-3 pr-4 font-medium max-w-[200px] truncate">
                        {studio.name}
                      </td>
                      <td className="py-3 pr-4 text-brand-muted">{studio.region ?? '-'}</td>
                      <td className="py-3 pr-4 text-brand-muted">
                        {studio.room_type ?? '-'}
                      </td>
                      <td className="py-3 pr-4">{studio.has_drum ? '✅' : '-'}</td>
                      <td className="py-3 pr-4">
                        <button
                          onClick={() => togglePublish(studio.id, studio.is_published)}
                          className={`w-10 h-5 rounded-full relative transition-colors ${
                            studio.is_published ? 'bg-brand-red' : 'bg-brand-border'
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                              studio.is_published ? 'left-5' : 'left-0.5'
                            }`}
                          />
                        </button>
                      </td>
                      <td className="py-3">
                        <Link
                          href={`/admin/${studio.id}`}
                          className="px-3 py-1 bg-brand-card border border-brand-border rounded text-xs hover:border-brand-red/50"
                        >
                          수정
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filtered.length === 0 && (
                <p className="text-center py-10 text-brand-muted">결과가 없습니다</p>
              )}
            </div>
          )}
        </>
      )}

      {tab === 'feedbacks' && (
        <div className="overflow-x-auto">
          {feedbacks.length === 0 ? (
            <p className="text-center py-20 text-brand-muted">피드백이 없습니다</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-border text-brand-muted text-left">
                  <th className="py-2 pr-4">날짜</th>
                  <th className="py-2 pr-4">이름</th>
                  <th className="py-2 pr-4">별점</th>
                  <th className="py-2">내용</th>
                </tr>
              </thead>
              <tbody>
                {feedbacks.map((fb) => (
                  <tr
                    key={fb.id}
                    className="border-b border-brand-border/50 hover:bg-brand-card/50"
                  >
                    <td className="py-3 pr-4 text-brand-muted whitespace-nowrap">
                      {new Date(fb.created_at).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="py-3 pr-4 whitespace-nowrap">
                      {fb.name || '익명'}
                    </td>
                    <td className="py-3 pr-4">
                      {fb.rating ? '★'.repeat(fb.rating) + '☆'.repeat(5 - fb.rating) : '-'}
                    </td>
                    <td className="py-3 text-brand-muted max-w-[300px]">
                      {fb.content}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
