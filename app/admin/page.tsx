'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Studio } from '@/types/studio';
import { StudioReport } from '@/types/report';

interface Feedback {
  id: string;
  name: string | null;
  content: string;
  rating: number | null;
  page_path: string | null;
  created_at: string;
}

interface StudioRequest {
  id: string;
  name: string;
  address: string;
  region: string | null;
  phone: string | null;
  room_type: string | null;
  has_drum: boolean;
  price_per_hour: number | null;
  price_info: string | null;
  hours: string | null;
  naver_place_url: string | null;
  kakao_channel: string | null;
  options: string | null;
  notes: string | null;
  applicant_name: string | null;
  applicant_contact: string | null;
  status: string;
  created_at: string;
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [tab, setTab] = useState<'studios' | 'feedbacks' | 'reports' | 'requests'>('studios');
  const [studios, setStudios] = useState<Studio[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [reports, setReports] = useState<StudioReport[]>([]);
  const [requests, setRequests] = useState<StudioRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [publishedFilter, setPublishedFilter] = useState<'all' | 'true' | 'false'>('all');
  const [approvingId, setApprovingId] = useState<string | null>(null);

  useEffect(() => {
    if (localStorage.getItem('admin_auth') === 'true') {
      setAuthed(true);
    }
  }, []);

  useEffect(() => {
    if (authed) {
      fetchStudios();
      fetchFeedbacks();
      fetchReports();
      fetchRequests();
    }
  }, [authed]);

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (password === process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
      localStorage.setItem('admin_auth', 'true');
      setAuthed(true);
      setAuthError('');
    } else {
      setAuthError('비밀번호가 틀렸습니다');
    }
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-comic-cream flex items-center justify-center px-6">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-sm space-y-4 bg-white border-[3px] border-comic-black p-6"
          style={{ boxShadow: '6px 6px 0 #FF3D77' }}
        >
          <h1 className="text-xl font-bungee text-center">
            MUSIC <span className="text-comic-pink">SPOT</span>
          </h1>
          <p className="text-xs font-bold text-center text-comic-black/50">관리자</p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호 입력"
            autoFocus
            className="w-full px-3 py-2.5 bg-comic-cream border-[2px] border-comic-black text-sm placeholder:text-comic-black/40 focus:outline-none focus:border-comic-pink"
          />
          {authError && (
            <p className="text-comic-pink text-xs font-bold text-center">{authError}</p>
          )}
          <button
            type="submit"
            className="w-full py-3 bg-comic-pink border-[2px] border-comic-black text-white font-bold"
            style={{ boxShadow: '3px 3px 0 #0A0A0A' }}
          >
            확인
          </button>
        </form>
      </div>
    );
  }

  async function fetchStudios() {
    setLoading(true);
    const all: Studio[] = [];
    let offset = 0;
    while (true) {
      const { data, error } = await supabase
        .from('studios')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + 999);
      if (error || !data) break;
      all.push(...(data as Studio[]));
      if (data.length < 1000) break;
      offset += 1000;
    }
    setStudios(all);
    setLoading(false);
  }

  async function fetchFeedbacks() {
    const { data } = await supabase
      .from('feedbacks')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);
    if (data) setFeedbacks(data as Feedback[]);
  }

  async function fetchReports() {
    const { data } = await supabase
      .from('studio_reports')
      .select('*, studios(name)')
      .order('created_at', { ascending: false })
      .limit(500);
    if (data) setReports(data as StudioReport[]);
  }

  async function fetchRequests() {
    const { data } = await supabase
      .from('studio_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);
    if (data) setRequests(data as StudioRequest[]);
  }

  async function toggleReportStatus(id: string, current: string) {
    const next = current === 'pending' ? 'resolved' : 'pending';
    const { error } = await supabase
      .from('studio_reports')
      .update({ status: next })
      .eq('id', id);
    if (!error) {
      setReports((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: next as 'pending' | 'resolved' } : r))
      );
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

  async function approveRequest(req: StudioRequest) {
    setApprovingId(req.id);
    const { error } = await supabase.from('studios').insert({
      name: req.name,
      address: req.address,
      region: req.region,
      phone: req.phone,
      room_type: req.room_type,
      has_drum: req.has_drum,
      price_per_hour: req.price_per_hour,
      price_info: req.price_info,
      hours: req.hours,
      naver_place_url: req.naver_place_url,
      kakao_channel: req.kakao_channel,
      options: req.options,
      notes: req.notes,
      is_published: true,
      data_quality_score: 30,
    });

    if (error) {
      alert('승인 중 오류가 발생했습니다: ' + error.message);
      setApprovingId(null);
      return;
    }

    await supabase
      .from('studio_requests')
      .update({ status: 'approved' })
      .eq('id', req.id);

    setRequests((prev) =>
      prev.map((r) => (r.id === req.id ? { ...r, status: 'approved' } : r))
    );
    setApprovingId(null);
  }

  async function rejectRequest(id: string) {
    await supabase
      .from('studio_requests')
      .update({ status: 'rejected' })
      .eq('id', id);
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: 'rejected' } : r))
    );
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

  const pendingRequests = requests.filter((r) => r.status === 'pending');

  const TABS = [
    { key: 'studios' as const, label: `연습실 (${studios.length})` },
    { key: 'requests' as const, label: `등록신청 (${requests.length})`, badge: pendingRequests.length },
    { key: 'feedbacks' as const, label: `피드백 (${feedbacks.length})` },
    { key: 'reports' as const, label: `제보 (${reports.length})` },
  ];

  return (
    <div className="min-h-screen bg-comic-cream p-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-bungee text-xl">
          MUSIC <span className="text-comic-pink">SPOT</span> ADMIN
        </h1>
        <span className="text-xs font-bold text-comic-black/50">
          총 {studios.length}개 / 공개 {studios.filter((s) => s.is_published).length}개
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-[2px] border-comic-black bg-white p-1" style={{ boxShadow: '3px 3px 0 #0A0A0A' }}>
        {TABS.map(({ key, label, badge }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 py-2 text-xs font-bold relative transition-colors border-[2px] ${
              tab === key
                ? 'bg-comic-pink border-comic-black text-white'
                : 'border-transparent text-comic-black/60 hover:bg-comic-yellow/30'
            }`}
          >
            {label}
            {badge != null && badge > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-comic-yellow border-[2px] border-comic-black text-comic-black text-[9px] font-bold flex items-center justify-center">
                {badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'studios' && (
        <>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="이름 / 지역 검색"
              className="flex-1 px-3 py-2 bg-white border-[2px] border-comic-black text-sm placeholder:text-comic-black/40 focus:outline-none focus:border-comic-pink"
            />
            <select
              value={publishedFilter}
              onChange={(e) => setPublishedFilter(e.target.value as 'all' | 'true' | 'false')}
              className="px-3 py-2 bg-white border-[2px] border-comic-black text-sm focus:outline-none"
            >
              <option value="all">전체</option>
              <option value="true">공개</option>
              <option value="false">비공개</option>
            </select>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div
                className="bg-comic-yellow border-[2px] border-comic-black px-6 py-3 font-bold text-sm animate-pulse"
              >
                로딩 중...
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-[2px] border-comic-black text-comic-black/60 text-left bg-comic-cream">
                    <th className="py-2 pr-4 font-bold">이름</th>
                    <th className="py-2 pr-4 font-bold">지역</th>
                    <th className="py-2 pr-4 font-bold">룸타입</th>
                    <th className="py-2 pr-4 font-bold">드럼</th>
                    <th className="py-2 pr-4 font-bold">공개</th>
                    <th className="py-2 font-bold"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((studio) => (
                    <tr key={studio.id} className="border-b border-comic-black/10 hover:bg-white">
                      <td className="py-3 pr-4 font-bold max-w-[200px] truncate">{studio.name}</td>
                      <td className="py-3 pr-4 text-comic-black/50">{studio.region ?? '-'}</td>
                      <td className="py-3 pr-4 text-comic-black/50">{studio.room_type ?? '-'}</td>
                      <td className="py-3 pr-4">{studio.has_drum ? '✅' : '-'}</td>
                      <td className="py-3 pr-4">
                        <button
                          onClick={() => togglePublish(studio.id, studio.is_published)}
                          className={`w-10 h-5 border-[2px] border-comic-black relative transition-colors ${
                            studio.is_published ? 'bg-comic-green' : 'bg-comic-black/20'
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 w-3 h-3 bg-white border-[2px] border-comic-black transition-transform ${
                              studio.is_published ? 'left-[18px]' : 'left-0.5'
                            }`}
                          />
                        </button>
                      </td>
                      <td className="py-3">
                        <Link
                          href={`/admin/${studio.id}`}
                          className="px-3 py-1 bg-white border-[2px] border-comic-black text-xs font-bold hover:bg-comic-yellow transition-colors"
                        >
                          수정
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <p className="text-center py-10 font-bold text-comic-black/40">결과가 없습니다</p>
              )}
            </div>
          )}
        </>
      )}

      {tab === 'requests' && (
        <div className="space-y-3">
          {requests.length === 0 ? (
            <p className="text-center py-20 font-bold text-comic-black/40">등록 신청이 없습니다</p>
          ) : (
            requests.map((req) => (
              <div
                key={req.id}
                className={`p-4 bg-white border-[2px] space-y-3 ${
                  req.status === 'pending' ? 'border-comic-yellow' : 'border-comic-black/30'
                }`}
                style={req.status === 'pending' ? { boxShadow: '3px 3px 0 #F5FF4F' } : {}}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold">{req.name}</h3>
                    <p className="text-xs text-comic-black/50 mt-0.5">{req.address}</p>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 font-bold border-[2px] border-comic-black shrink-0 ${
                      req.status === 'pending'
                        ? 'bg-comic-yellow text-comic-black'
                        : req.status === 'approved'
                          ? 'bg-comic-green text-comic-black'
                          : 'bg-comic-pink text-white'
                    }`}
                  >
                    {req.status === 'pending' ? '대기' : req.status === 'approved' ? '승인' : '거절'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-comic-black/60">
                  {req.region && <span>지역: {req.region}</span>}
                  {req.phone && <span>전화: {req.phone}</span>}
                  {req.room_type && <span>룸타입: {req.room_type}</span>}
                  <span>드럼: {req.has_drum ? '가능' : '불가'}</span>
                  {req.price_per_hour && <span>가격: ₩{req.price_per_hour.toLocaleString()}/h</span>}
                  {req.hours && <span>영업: {req.hours}</span>}
                  {req.applicant_name && <span>신청자: {req.applicant_name}</span>}
                  {req.applicant_contact && <span>연락처: {req.applicant_contact}</span>}
                </div>

                {req.options && <p className="text-xs text-comic-black/60">옵션: {req.options}</p>}
                {req.notes && <p className="text-xs text-comic-black/60">메모: {req.notes}</p>}
                {(req.naver_place_url || req.kakao_channel) && (
                  <div className="flex gap-2 text-xs">
                    {req.naver_place_url && (
                      <a href={req.naver_place_url} target="_blank" rel="noopener noreferrer" className="text-comic-pink underline font-bold">
                        네이버플레이스
                      </a>
                    )}
                    {req.kakao_channel && (
                      <span className="text-comic-black/50">카카오: {req.kakao_channel}</span>
                    )}
                  </div>
                )}

                <p className="text-xs text-comic-black/40 font-medium">
                  {new Date(req.created_at).toLocaleDateString('ko-KR')} 신청
                </p>

                {req.status === 'pending' && (
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => approveRequest(req)}
                      disabled={approvingId === req.id}
                      className="flex-1 py-2 bg-comic-green border-[2px] border-comic-black text-comic-black text-sm font-bold disabled:opacity-50"
                    >
                      {approvingId === req.id ? '승인 중...' : '✅ 승인 (공개 등록)'}
                    </button>
                    <button
                      onClick={() => rejectRequest(req.id)}
                      className="flex-1 py-2 bg-white border-[2px] border-comic-black text-sm font-bold text-comic-black/60 hover:bg-comic-pink hover:text-white transition-colors"
                    >
                      거절
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'feedbacks' && (
        <div className="overflow-x-auto">
          {feedbacks.length === 0 ? (
            <p className="text-center py-20 font-bold text-comic-black/40">피드백이 없습니다</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-[2px] border-comic-black text-comic-black/60 text-left">
                  <th className="py-2 pr-4 font-bold">날짜</th>
                  <th className="py-2 pr-4 font-bold">이름</th>
                  <th className="py-2 pr-4 font-bold">별점</th>
                  <th className="py-2 font-bold">내용</th>
                </tr>
              </thead>
              <tbody>
                {feedbacks.map((fb) => (
                  <tr key={fb.id} className="border-b border-comic-black/10 hover:bg-white">
                    <td className="py-3 pr-4 text-comic-black/50 whitespace-nowrap">
                      {new Date(fb.created_at).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="py-3 pr-4 whitespace-nowrap font-medium">{fb.name || '익명'}</td>
                    <td className="py-3 pr-4">
                      {fb.rating ? '★'.repeat(fb.rating) + '☆'.repeat(5 - fb.rating) : '-'}
                    </td>
                    <td className="py-3 text-comic-black/60 max-w-[300px]">{fb.content}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'reports' && (
        <div className="overflow-x-auto">
          {reports.length === 0 ? (
            <p className="text-center py-20 font-bold text-comic-black/40">제보가 없습니다</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-[2px] border-comic-black text-comic-black/60 text-left">
                  <th className="py-2 pr-4 font-bold">날짜</th>
                  <th className="py-2 pr-4 font-bold">유형</th>
                  <th className="py-2 pr-4 font-bold">연습실</th>
                  <th className="py-2 pr-4 font-bold">내용</th>
                  <th className="py-2 font-bold">상태</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr key={r.id} className="border-b border-comic-black/10 hover:bg-white">
                    <td className="py-3 pr-4 text-comic-black/50 whitespace-nowrap">
                      {new Date(r.created_at).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="py-3 pr-4 whitespace-nowrap font-medium">
                      {r.report_type === 'correction' ? '수정' : r.report_type === 'new_studio' ? '신규' : '폐업'}
                    </td>
                    <td className="py-3 pr-4 whitespace-nowrap text-comic-black/60">{r.studios?.name || '-'}</td>
                    <td className="py-3 pr-4 text-comic-black/60 max-w-[250px] truncate">{r.content}</td>
                    <td className="py-3">
                      <button
                        onClick={() => toggleReportStatus(r.id, r.status)}
                        className={`px-2 py-1 text-xs font-bold border-[2px] border-comic-black ${
                          r.status === 'resolved'
                            ? 'bg-comic-green text-comic-black'
                            : 'bg-comic-yellow text-comic-black'
                        }`}
                      >
                        {r.status === 'resolved' ? '완료' : '대기'}
                      </button>
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
