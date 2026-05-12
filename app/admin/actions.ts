'use server';

import { createAdminClient } from '@/lib/supabase-admin';
import { Studio } from '@/types/studio';
import { StudioReport } from '@/types/report';

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
  const admin = createAdminClient();
  const { data } = await admin
    .from('feedbacks')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500);
  return (data ?? []) as Feedback[];
}

export async function adminFetchReports(): Promise<StudioReport[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('studio_reports')
    .select('*, studios(name)')
    .order('created_at', { ascending: false })
    .limit(500);
  return (data ?? []) as StudioReport[];
}

export async function adminFetchRequests(): Promise<StudioRequest[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('studio_requests')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500);
  return (data ?? []) as StudioRequest[];
}

export async function adminTogglePublish(id: string, current: boolean): Promise<{ error?: string }> {
  const admin = createAdminClient();
  const { error } = await admin
    .from('studios')
    .update({ is_published: !current, updated_at: new Date().toISOString() })
    .eq('id', id);
  return error ? { error: error.message } : {};
}

export async function adminToggleReportStatus(id: string, current: string): Promise<{ error?: string }> {
  const next = current === 'pending' ? 'resolved' : 'pending';
  const admin = createAdminClient();
  const { error } = await admin
    .from('studio_reports')
    .update({ status: next })
    .eq('id', id);
  return error ? { error: error.message } : {};
}

export async function adminApproveRequest(req: StudioRequest): Promise<{ error?: string }> {
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
  const admin = createAdminClient();
  const { data } = await admin.from('studios').select('*').eq('id', id).single();
  return (data as Studio) ?? null;
}

export async function adminSaveStudio(
  id: string,
  fields: Partial<Studio>
): Promise<{ error?: string }> {
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
  const admin = createAdminClient();
  const { error } = await admin
    .from('studio_requests')
    .update({ status: 'rejected' })
    .eq('id', id);
  return error ? { error: error.message } : {};
}

export async function adminFetchKpi(): Promise<KpiData> {
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
