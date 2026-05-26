'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Studio } from '@/types/studio';
import { StudioReport } from '@/types/report';
import {
  Feedback,
  StudioRequest,
  KpiData,
  adminFetchStudios,
  adminFetchFeedbacks,
  adminFetchReports,
  adminFetchRequests,
  adminTogglePublish,
  adminToggleReportStatus,
  adminApproveRequest,
  adminRejectRequest,
  adminFetchKpi,
} from './actions';


export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [tab, setTab] = useState<'studios' | 'feedbacks' | 'reports' | 'requests' | 'kpi'>('studios');
  const [studios, setStudios] = useState<Studio[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [reports, setReports] = useState<StudioReport[]>([]);
  const [requests, setRequests] = useState<StudioRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [publishedFilter, setPublishedFilter] = useState<'all' | 'true' | 'false'>('all');
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const [kpiData, setKpiData] = useState<KpiData | null>(null);
  const [kpiLoading, setKpiLoading] = useState(false);

  const [awardYear, setAwardYear] = useState<number>(new Date().getFullYear());
  const [awardQuarter, setAwardQuarter] = useState<number>(Math.ceil((new Date().getMonth() + 1) / 3));
  const [awardTopN, setAwardTopN] = useState<number>(10);
  const [awardCountry, setAwardCountry] = useState<string>('KR');
  const [awardLoading, setAwardLoading] = useState(false);
  const [awardResult, setAwardResult] = useState<{ ok?: boolean; awarded?: number; error?: string } | null>(null);

  useEffect(() => {
    if (localStorage.getItem('admin_auth') === 'true') {
      setAuthed(true);
    }
  }, []);

  useEffect(() => {
    if (authed) {
      loadStudios();
      loadFeedbacks();
      loadReports();
      loadRequests();
      loadKpi();
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

  async function loadStudios() {
    setLoading(true);
    const data = await adminFetchStudios();
    setStudios(data);
    setLoading(false);
  }

  async function loadFeedbacks() {
    const data = await adminFetchFeedbacks();
    setFeedbacks(data);
  }

  async function loadReports() {
    const data = await adminFetchReports();
    setReports(data);
  }

  async function loadRequests() {
    const data = await adminFetchRequests();
    setRequests(data);
  }

  async function toggleReportStatus(id: string, current: string) {
    const next = current === 'pending' ? 'resolved' : 'pending';
    const result = await adminToggleReportStatus(id, current);
    if (!result.error) {
      setReports((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: next as 'pending' | 'resolved' } : r))
      );
    }
  }

  async function togglePublish(id: string, current: boolean) {
    const result = await adminTogglePublish(id, current);
    if (!result.error) {
      setStudios((prev) =>
        prev.map((s) => (s.id === id ? { ...s, is_published: !current } : s))
      );
    }
  }

  async function approveRequest(req: StudioRequest) {
    setApprovingId(req.id);
    const result = await adminApproveRequest(req);
    if (result.error) {
      alert('승인 중 오류가 발생했습니다: ' + result.error);
      setApprovingId(null);
      return;
    }
    setRequests((prev) =>
      prev.map((r) => (r.id === req.id ? { ...r, status: 'approved' } : r))
    );
    setApprovingId(null);
  }

  async function rejectRequest(id: string) {
    await adminRejectRequest(id);
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: 'rejected' } : r))
    );
  }

  async function loadKpi() {
    setKpiLoading(true);
    const data = await adminFetchKpi();
    setKpiData(data);
    setKpiLoading(false);
  }

  async function runAwardTitles() {
    setAwardLoading(true);
    setAwardResult(null);
    try {
      const res = await fetch('/api/admin/award-titles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_ADMIN_PASSWORD}`,
        },
        body: JSON.stringify({ year: awardYear, quarter: awardQuarter, country: awardCountry, top_n: awardTopN }),
      });
      const json = await res.json();
      setAwardResult(json);
    } catch {
      setAwardResult({ error: '네트워크 오류가 발생했습니다.' });
    } finally {
      setAwardLoading(false);
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

  const pendingRequests = requests.filter((r) => r.status === 'pending');

  const TABS = [
    { key: 'studios' as const, label: `연습실 (${studios.length})` },
    { key: 'requests' as const, label: `등록신청 (${requests.length})`, badge: pendingRequests.length },
    { key: 'feedbacks' as const, label: `피드백 (${feedbacks.length})` },
    { key: 'reports' as const, label: `제보 (${reports.length})` },
    { key: 'kpi' as const, label: 'KPI 📊' },
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

      {tab === 'kpi' && (
        <div>
          {kpiLoading || !kpiData ? (
            <div className="flex justify-center py-20">
              <div className="bg-comic-yellow border-[2px] border-comic-black px-6 py-3 font-bold text-sm animate-pulse">
                집계 중...
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* 기본 카운트 */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { label: '총 유저', value: kpiData.totalUsers, color: '#4FC3F7' },
                  { label: '이번 주 신규', value: kpiData.newUsersThisWeek, color: '#F5FF4F' },
                  { label: '8마디 프로젝트', value: kpiData.totalProjects, color: '#FF3D77' },
                  { label: '8마디 트랙', value: kpiData.totalTracks, color: '#FF3D77' },
                  { label: '예약 횟수', value: kpiData.totalBookings, color: '#41C66B' },
                  { label: '커뮤니티 게시물', value: kpiData.totalPosts, color: '#4FC3F7' },
                ].map(({ label, value, color }) => (
                  <div
                    key={label}
                    className="bg-white border-[2px] border-comic-black p-4 rounded-[12px]"
                    style={{ boxShadow: `3px 3px 0 ${color}` }}
                  >
                    <p className="text-[10px] font-bold text-comic-black/50 mb-1">{label}</p>
                    <p className="text-[28px] font-bungee text-comic-black">{value.toLocaleString()}</p>
                  </div>
                ))}
              </div>

              {/* 핵심 KPI */}
              <div className="bg-white border-[2px] border-comic-black p-4 rounded-[12px]" style={{ boxShadow: '4px 4px 0 #FF3D77' }}>
                <p className="text-[12px] font-bold text-comic-black mb-3">🎯 핵심 KPI</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div>
                    <p className="text-[10px] font-bold text-comic-black/50">응답률</p>
                    <p className={`text-[24px] font-bungee ${kpiData.responseRate >= 30 ? 'text-[#41C66B]' : 'text-comic-pink'}`}>
                      {kpiData.responseRate}%
                    </p>
                    <p className="text-[9px] text-comic-black/40">목표: 30%+</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-comic-black/50">활성화율</p>
                    <p className={`text-[24px] font-bungee ${kpiData.activationRate >= 30 ? 'text-[#41C66B]' : 'text-comic-pink'}`}>
                      {kpiData.activationRate}%
                    </p>
                    <p className="text-[9px] text-comic-black/40">활성 유저 {kpiData.activeUsers}명</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-comic-black/50">평균 챌린지 점수</p>
                    <p className="text-[24px] font-bungee text-comic-black">{kpiData.avgChallengeScore}</p>
                    <p className="text-[9px] text-comic-black/40">트랙 전체 평균</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-comic-black/50">K-factor (근사치)</p>
                    <p className={`text-[24px] font-bungee ${kpiData.kFactor >= 1.0 ? 'text-[#41C66B]' : 'text-comic-pink'}`}>
                      {kpiData.kFactor}
                    </p>
                    <p className="text-[9px] text-comic-black/40">목표: 1.0+</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-comic-black/50">D7 잔존율</p>
                    <p className={`text-[24px] font-bungee ${kpiData.d7CohortSize === 0 ? 'text-comic-black/30' : kpiData.d7Retention >= 20 ? 'text-[#41C66B]' : 'text-comic-pink'}`}>
                      {kpiData.d7CohortSize === 0 ? '—' : `${kpiData.d7Retention}%`}
                    </p>
                    <p className="text-[9px] text-comic-black/40">코호트 {kpiData.d7CohortSize}명 · 목표: 20%+</p>
                  </div>
                </div>
              </div>

              {/* challenge_score 분포 */}
              <div className="bg-white border-[2px] border-comic-black p-4 rounded-[12px]" style={{ boxShadow: '4px 4px 0 #F5FF4F' }}>
                <p className="text-[12px] font-bold text-comic-black mb-3">📊 챌린지 점수 분포</p>
                {(() => {
                  const dist = kpiData.scoreDistribution;
                  const total = dist.zero + dist.low + dist.mid + dist.high + dist.elite || 1;
                  const buckets = [
                    { label: '0점', value: dist.zero, color: '#0A0A0A20' },
                    { label: '1-5점', value: dist.low, color: '#4FC3F7' },
                    { label: '6-20점', value: dist.mid, color: '#F5FF4F' },
                    { label: '21-100점', value: dist.high, color: '#FF3D77' },
                    { label: '100점+', value: dist.elite, color: '#41C66B' },
                  ];
                  return (
                    <div className="space-y-2">
                      {buckets.map(({ label, value, color }) => (
                        <div key={label} className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-comic-black/60 w-14 shrink-0">{label}</span>
                          <div className="flex-1 h-4 bg-comic-cream border border-comic-black/10 rounded-[4px] overflow-hidden">
                            <div
                              className="h-full rounded-[4px]"
                              style={{ width: `${Math.round((value / total) * 100)}%`, backgroundColor: color }}
                            />
                          </div>
                          <span className="text-[10px] font-bold text-comic-black/60 w-8 text-right">{value}</span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* 시즌 시상 */}
              <div className="bg-white border-[2px] border-comic-black p-4 rounded-[12px]" style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>
                <p className="text-[12px] font-bold text-comic-black mb-3">🏆 시즌 시상</p>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div>
                    <label className="text-[10px] font-bold text-comic-black/60 block mb-1">연도</label>
                    <input
                      type="number"
                      value={awardYear}
                      onChange={(e) => setAwardYear(Number(e.target.value))}
                      min={2024}
                      max={2099}
                      className="w-full px-2 py-1.5 bg-comic-cream border-[2px] border-comic-black text-[12px] font-bold focus:outline-none focus:border-comic-pink rounded-[6px]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-comic-black/60 block mb-1">분기 (1~4)</label>
                    <select
                      value={awardQuarter}
                      onChange={(e) => setAwardQuarter(Number(e.target.value))}
                      className="w-full px-2 py-1.5 bg-comic-cream border-[2px] border-comic-black text-[12px] font-bold focus:outline-none focus:border-comic-pink rounded-[6px]"
                    >
                      <option value={1}>Q1 (1~3월)</option>
                      <option value={2}>Q2 (4~6월)</option>
                      <option value={3}>Q3 (7~9월)</option>
                      <option value={4}>Q4 (10~12월)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-comic-black/60 block mb-1">국가</label>
                    <select
                      value={awardCountry}
                      onChange={(e) => setAwardCountry(e.target.value)}
                      className="w-full px-2 py-1.5 bg-comic-cream border-[2px] border-comic-black text-[12px] font-bold focus:outline-none focus:border-comic-pink rounded-[6px]"
                    >
                      <option value="KR">🇰🇷 KR</option>
                      <option value="GLOBAL">🌏 GLOBAL</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-comic-black/60 block mb-1">수상 인원 (top N)</label>
                    <input
                      type="number"
                      value={awardTopN}
                      onChange={(e) => setAwardTopN(Math.max(1, Number(e.target.value)))}
                      min={1}
                      max={100}
                      className="w-full px-2 py-1.5 bg-comic-cream border-[2px] border-comic-black text-[12px] font-bold focus:outline-none focus:border-comic-pink rounded-[6px]"
                    />
                  </div>
                </div>
                <button
                  onClick={runAwardTitles}
                  disabled={awardLoading}
                  className="w-full py-2 bg-[#F5FF4F] border-[2px] border-comic-black text-comic-black text-[12px] font-bold rounded-[8px] disabled:opacity-50 transition-opacity"
                  style={{ boxShadow: '2px 2px 0 #0A0A0A' }}
                >
                  {awardLoading ? '처리 중...' : `🏆 ${awardYear}년 Q${awardQuarter} 시즌 시상 실행`}
                </button>
                {awardResult && (
                  <div className={`mt-2 px-3 py-2 border-[2px] rounded-[8px] border-comic-black text-[11px] font-bold ${awardResult.error ? 'bg-comic-pink/10 text-comic-pink' : 'bg-[#41C66B]/10 text-[#1a7a3a]'}`}>
                    {awardResult.error
                      ? `❌ 오류: ${awardResult.error}`
                      : `✅ 완료 — ${awardResult.awarded ?? 0}명에게 타이틀 부여됨`}
                  </div>
                )}
              </div>

              {/* 조기 경보 */}
              <div className="bg-white border-[2px] border-comic-black p-4 rounded-[12px]" style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>
                <p className="text-[12px] font-bold text-comic-black mb-3">🚨 조기 경보</p>
                <div className="space-y-2">
                  <div className={`flex items-center gap-2 px-3 py-2 border-[2px] border-comic-black rounded-[8px] ${kpiData.responseRate >= 30 ? 'bg-[#41C66B]/10' : 'bg-comic-pink/10'}`}>
                    <span>{kpiData.responseRate >= 30 ? '✅' : '🚨'}</span>
                    <span className="text-[11px] font-bold">응답률 {kpiData.responseRate}% {kpiData.responseRate >= 30 ? '— 정상' : '— 주의 (30% 미만)'}</span>
                  </div>
                  <div className={`flex items-center gap-2 px-3 py-2 border-[2px] border-comic-black rounded-[8px] ${kpiData.activationRate >= 20 ? 'bg-[#41C66B]/10' : 'bg-comic-pink/10'}`}>
                    <span>{kpiData.activationRate >= 20 ? '✅' : '⚠️'}</span>
                    <span className="text-[11px] font-bold">활성화율 {kpiData.activationRate}% {kpiData.activationRate >= 20 ? '— 정상' : '— 확인 필요'}</span>
                  </div>
                  <div className={`flex items-center gap-2 px-3 py-2 border-[2px] border-comic-black rounded-[8px] ${kpiData.newUsersThisWeek >= 10 ? 'bg-[#41C66B]/10' : 'bg-[#F5FF4F]/30'}`}>
                    <span>{kpiData.newUsersThisWeek >= 10 ? '✅' : 'ℹ️'}</span>
                    <span className="text-[11px] font-bold">이번 주 신규 {kpiData.newUsersThisWeek}명 {kpiData.newUsersThisWeek >= 10 ? '— 양호' : '— 유입 강화 고려'}</span>
                  </div>
                  <div className={`flex items-center gap-2 px-3 py-2 border-[2px] border-comic-black rounded-[8px] ${kpiData.kFactor >= 1.0 ? 'bg-[#41C66B]/10' : 'bg-comic-pink/10'}`}>
                    <span>{kpiData.kFactor >= 1.0 ? '✅' : '🚨'}</span>
                    <span className="text-[11px] font-bold">K-factor {kpiData.kFactor} {kpiData.kFactor >= 1.0 ? '— 정상' : '— 주의 (1.0 미만 → 바이럴 기능 재검토)'}</span>
                  </div>
                  <div className={`flex items-center gap-2 px-3 py-2 border-[2px] border-comic-black rounded-[8px] ${kpiData.d7CohortSize === 0 ? 'bg-[#F5FF4F]/30' : kpiData.d7Retention >= 20 ? 'bg-[#41C66B]/10' : 'bg-comic-pink/10'}`}>
                    <span>{kpiData.d7CohortSize === 0 ? 'ℹ️' : kpiData.d7Retention >= 20 ? '✅' : '🚨'}</span>
                    <span className="text-[11px] font-bold">D7 잔존 {kpiData.d7CohortSize === 0 ? '— 코호트 없음' : `${kpiData.d7Retention}% ${kpiData.d7Retention >= 20 ? '— 정상' : '— 주의 (20% 미만 → 온보딩 강화)'}`}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
