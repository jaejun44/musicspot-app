'use server';

import { createAdminClient } from '@/lib/supabase-admin';
import {
  assertAdmin,
  verifyAdminPassword,
  issueAdminSession,
  clearAdminSession,
  isAdmin,
} from '@/lib/admin-auth';
import { Studio } from '@/types/studio';
import { StudioReport } from '@/types/report';

/** 비밀번호 검증은 서버에서만. 성공 시 httpOnly 세션 발급. */
export async function adminLogin(password: string): Promise<{ ok: boolean }> {
  if (!verifyAdminPassword(password)) return { ok: false };
  issueAdminSession();
  return { ok: true };
}

export async function adminLogout(): Promise<void> {
  clearAdminSession();
}

/** 클라이언트 마운트 시 세션 유효성 확인용 */
export async function adminCheckSession(): Promise<boolean> {
  return isAdmin();
}

export interface Feedback {
  id: string;
  name: string | null;
  content: string;
  rating: number | null;
  page_path: string | null;
  created_at: string;
}

export interface StudioRequest {
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

export interface KpiData {
  totalUsers: number;
  totalProjects: number;
  totalTracks: number;
  totalBookings: number;
  totalPosts: number;
  newUsersThisWeek: number;
  responseRate: number;
  activeUsers: number;
  activationRate: number;
  avgChallengeScore: number;
  scoreDistribution: { zero: number; low: number; mid: number; high: number; elite: number };
  kFactor: number;
  d7Retention: number;
  d7CohortSize: number;
}

export async function adminFetchStudios(): Promise<Studio[]> {
  assertAdmin();
  const admin = createAdminClient();
  const all: Studio[] = [];
  let offset = 0;
  while (true) {
    const { data, error } = await admin
      .from('studios')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + 999);
    if (error || !data) break;
    all.push(...(data as Studio[]));
    if (data.length < 1000) break;
    offset += 1000;
  }
  return all;
}

export async function adminFetchFeedbacks(): Promise<Feedback[]> {
  assertAdmin();
  const admin = createAdminClient();
  const { data } = await admin
    .from('feedbacks')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500);
  return (data ?? []) as Feedback[];
}

export async function adminFetchReports(): Promise<StudioReport[]> {
  assertAdmin();
  const admin = createAdminClient();
  const { data } = await admin
    .from('studio_reports')
    .select('*, studios(name)')
    .order('created_at', { ascending: false })
    .limit(500);
  return (data ?? []) as StudioReport[];
}

export async function adminFetchRequests(): Promise<StudioRequest[]> {
  assertAdmin();
  const admin = createAdminClient();
  const { data } = await admin
    .from('studio_requests')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500);
  return (data ?? []) as StudioRequest[];
}

export async function adminTogglePublish(id: string, current: boolean): Promise<{ error?: string }> {
  assertAdmin();
  const admin = createAdminClient();
  const { error } = await admin
    .from('studios')
    .update({ is_published: !current, updated_at: new Date().toISOString() })
    .eq('id', id);
  return error ? { error: error.message } : {};
}

export async function adminToggleReportStatus(id: string, current: string): Promise<{ error?: string }> {
  assertAdmin();
  const next = current === 'pending' ? 'resolved' : 'pending';
  const admin = createAdminClient();
  const { error } = await admin
    .from('studio_reports')
    .update({ status: next })
    .eq('id', id);
  return error ? { error: error.message } : {};
}

export async function adminApproveRequest(req: StudioRequest): Promise<{ error?: string }> {
  assertAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from('studios').insert({
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
  if (error) return { error: error.message };
  await admin
    .from('studio_requests')
    .update({ status: 'approved' })
    .eq('id', req.id);
  return {};
}

export async function adminFetchStudio(id: string): Promise<Studio | null> {
  assertAdmin();
  const admin = createAdminClient();
  const { data } = await admin.from('studios').select('*').eq('id', id).single();
  return (data as Studio) ?? null;
}

export async function adminSaveStudio(
  id: string,
  fields: Partial<Studio>
): Promise<{ error?: string }> {
  assertAdmin();
  const admin = createAdminClient();
  const { error } = await admin
    .from('studios')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', id);
  return error ? { error: error.message } : {};
}

export async function adminUploadStudioPhoto(
  formData: FormData
): Promise<{ url?: string; error?: string }> {
  assertAdmin();
  const admin = createAdminClient();
  const file = formData.get('file') as File | null;
  const studioId = formData.get('studioId') as string | null;
  if (!file || !studioId) return { error: '파일 또는 studioId 없음' };

  const ext = file.name.split('.').pop();
  const path = `${studioId}/${Date.now()}.${ext}`;
  const arrayBuffer = await file.arrayBuffer();

  const { error: uploadError } = await admin.storage
    .from('studio-photos')
    .upload(path, arrayBuffer, { contentType: file.type });

  if (uploadError) return { error: uploadError.message };

  const { data } = admin.storage.from('studio-photos').getPublicUrl(path);
  return { url: data.publicUrl };
}

export async function adminRejectRequest(id: string): Promise<{ error?: string }> {
  assertAdmin();
  const admin = createAdminClient();
  const { error } = await admin
    .from('studio_requests')
    .update({ status: 'rejected' })
    .eq('id', id);
  return error ? { error: error.message } : {};
}

export async function adminFetchKpi(): Promise<KpiData> {
  assertAdmin();
  const admin = createAdminClient();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

  const [usersRes, projectsRes, tracksRes, bookingsRes, postsRes, newUsersRes, cohortRes] = await Promise.all([
    admin.from('user_profiles').select('user_id', { count: 'exact', head: true }),
    admin.from('stem_projects').select('id', { count: 'exact', head: true }),
    admin.from('stem_tracks').select('user_id, challenge_score'),
    admin.from('bookings').select('id', { count: 'exact', head: true }),
    admin.from('posts').select('id', { count: 'exact', head: true }),
    admin.from('user_profiles').select('user_id', { count: 'exact', head: true }).gte('created_at', weekAgo),
    admin.from('user_profiles').select('user_id').gte('created_at', twoWeeksAgo).lt('created_at', weekAgo),
  ]);

  const totalUsers = usersRes.count ?? 0;
  const totalProjects = projectsRes.count ?? 0;
  const totalTracks = tracksRes.data?.length ?? 0;
  const totalBookings = bookingsRes.count ?? 0;
  const totalPosts = postsRes.count ?? 0;
  const newUsersThisWeek = newUsersRes.count ?? 0;

  const cohortUserIds = cohortRes.data?.map((u: { user_id: string }) => u.user_id) ?? [];
  const d7CohortSize = cohortUserIds.length;
  const kFactor = Math.round((newUsersThisWeek / Math.max(totalUsers - newUsersThisWeek, 1)) * 100) / 100;

  let d7Retention = 0;
  if (d7CohortSize > 0) {
    const [activeTracksRes, activePostsRes] = await Promise.all([
      admin.from('stem_tracks').select('user_id').in('user_id', cohortUserIds).gte('created_at', weekAgo),
      admin.from('posts').select('author_id').in('author_id', cohortUserIds).gte('created_at', weekAgo),
    ]);
    const activeIds = new Set<string>([
      ...(activeTracksRes.data?.map((t: { user_id: string }) => t.user_id) ?? []),
      ...(activePostsRes.data?.map((p: { author_id: string }) => p.author_id) ?? []),
    ]);
    d7Retention = Math.round((activeIds.size / d7CohortSize) * 100);
  }

  const tracks = tracksRes.data ?? [];
  const responseRate = totalProjects > 0 ? Math.round(((totalTracks - totalProjects) / totalProjects) * 100) : 0;
  const activeUserIds = new Set(tracks.map((t: { user_id: string }) => t.user_id));
  const activeUsers = activeUserIds.size;
  const activationRate = totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0;
  const scores = tracks.map((t: { challenge_score: number }) => t.challenge_score ?? 0);
  const avgChallengeScore = scores.length > 0 ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : 0;
  const scoreDistribution = {
    zero: scores.filter((s: number) => s === 0).length,
    low: scores.filter((s: number) => s >= 1 && s <= 5).length,
    mid: scores.filter((s: number) => s >= 6 && s <= 20).length,
    high: scores.filter((s: number) => s >= 21 && s <= 100).length,
    elite: scores.filter((s: number) => s > 100).length,
  };

  return { totalUsers, totalProjects, totalTracks, totalBookings, totalPosts, newUsersThisWeek, responseRate, activeUsers, activationRate, avgChallengeScore, scoreDistribution, kFactor, d7Retention, d7CohortSize };
}

export interface OwnerInviteResult {
  inviteUrl?: string;
  expiresAt?: string;
  error?: string;
}

/**
 * 사장님 초대 링크(실시간 예약 · 예약관리)를 만든다. 링크는 7일 뒤 만료되고 한 번만 쓸 수 있다.
 * 예약 서버의 관리자 API는 비밀 헤더로만 열린다. 그 값(BOOKING_ADMIN_API_TOKEN)은 서버 env에만 두고
 * 브라우저로 보내지 않는다. 그래서 브라우저가 아니라 이 server action이 부른다.
 */
export async function adminCreateOwnerInvite(studioId: string): Promise<OwnerInviteResult> {
  assertAdmin();

  const apiUrl = (process.env.NEXT_PUBLIC_BOOKING_API_URL ?? '').replace(/\/+$/, '');
  const adminToken = process.env.BOOKING_ADMIN_API_TOKEN ?? '';
  if (!apiUrl || !adminToken) {
    return { error: '예약 서비스 설정(NEXT_PUBLIC_BOOKING_API_URL, BOOKING_ADMIN_API_TOKEN)이 없습니다.' };
  }

  let res: Response;
  try {
    res = await fetch(`${apiUrl}/api/admin/studios/by-site/${encodeURIComponent(studioId)}/invites`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Token': adminToken },
      body: JSON.stringify({ role: 'OWNER' }),
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
  } catch (err) {
    console.error('[admin] 사장님 초대 링크 생성 실패', err);
    return { error: '예약 서비스에 연결하지 못했습니다.' };
  }

  if (res.status === 404) {
    return { error: '실시간 예약 서비스에 이어진 연습실이 아닙니다. 예약 서비스에 업체·방을 먼저 등록해야 합니다.' };
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    console.error('[admin] 사장님 초대 링크 생성 실패', res.status, detail);
    return { error: `초대 링크를 만들지 못했습니다 (${res.status}).` };
  }

  const body = (await res.json()) as { inviteUrl: string; expiresAt: string };
  return { inviteUrl: body.inviteUrl, expiresAt: body.expiresAt };
}
