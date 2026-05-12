import 'server-only';
// 서버 전용. 절대 클라이언트 컴포넌트에 import 금지.
import { createClient } from '@supabase/supabase-js';

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_KEY!;
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_KEY is not set');
  }
  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
