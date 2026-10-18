import { NextRequest, NextResponse } from 'next/server';
import { canAccessJamSession, deriveSessionJamRoom } from '@/lib/jam-room';
import { createServiceClient, getCallerId } from '@/lib/api-auth';

// 공개 잼 방의 SonoBus 방 정보. 호스트와 참가자에게만 준다.
// GET /api/jam-sessions/<세션 id>/room  +  Authorization: Bearer <Supabase access token>

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NO_STORE = { 'Cache-Control': 'no-store' };

function fail(status: number, error: string) {
  return NextResponse.json({ error }, { status, headers: NO_STORE });
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!req.headers.get('authorization')) return fail(401, 'unauthorized');
  if (!UUID_RE.test(params.id)) return fail(400, 'invalid_session');

  const admin = createServiceClient();
  const secret = process.env.SONOBUS_ROOM_SECRET;
  if (!admin || !secret) {
    if (!secret) console.error('[jam-session-room] SONOBUS_ROOM_SECRET is not set');
    return fail(500, 'not_configured');
  }

  const callerId = await getCallerId(req, admin);
  if (!callerId) return fail(401, 'unauthorized');

  const [session, participants] = await Promise.all([
    admin.from('jam_sessions').select('host_id').eq('id', params.id).maybeSingle(),
    admin.from('jam_participants').select('user_id').eq('session_id', params.id),
  ]);
  if (session.error || participants.error) {
    console.error('[jam-session-room] lookup failed', session.error ?? participants.error);
    return fail(500, 'lookup_failed');
  }
  if (!session.data) return fail(404, 'not_found');

  const participantIds = (participants.data ?? []).map((p) => p.user_id as string);
  if (!canAccessJamSession(callerId, session.data.host_id as string, participantIds)) {
    return fail(403, 'not_participant');
  }

  return NextResponse.json(deriveSessionJamRoom(params.id, secret), { headers: NO_STORE });
}
