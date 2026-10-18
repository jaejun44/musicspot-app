import 'server-only';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// 일반 유저용 API 라우트의 공통 준비: 서비스 키 클라이언트 + Bearer 토큰 → 호출자 user id.
// 클라이언트는 supabase.auth.getSession()의 access_token을 Authorization: Bearer 로 보낸다.

export function createServiceClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !serviceKey) {
    console.error('[api-auth] missing env', { url: !!url, serviceKey: !!serviceKey });
    return null;
  }
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

/** 토큰이 없거나 무효면 null */
export async function getCallerId(req: Request, admin: SupabaseClient): Promise<string | null> {
  const token = req.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return null;
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}
