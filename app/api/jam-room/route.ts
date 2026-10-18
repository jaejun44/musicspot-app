import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { deriveJamRoom, isMutualDmPair } from '@/lib/jam-room';

// 매칭(서로 DM을 주고받은) 두 사람에게만 SonoBus 방 정보를 내준다.
// GET /api/jam-room?peer=<상대 user id>  +  Authorization: Bearer <Supabase access token>

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NO_STORE = { 'Cache-Control': 'no-store' };

function fail(status: number, error: string) {
  return NextResponse.json({ error }, { status, headers: NO_STORE });
}

export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return fail(401, 'unauthorized');

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  const secret = process.env.SONOBUS_ROOM_SECRET;
  if (!url || !serviceKey || !secret) {
    console.error('[jam-room] missing env', { url: !!url, serviceKey: !!serviceKey, secret: !!secret });
    return fail(500, 'not_configured');
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: auth, error: authError } = await admin.auth.getUser(token);
  if (authError || !auth.user) return fail(401, 'unauthorized');
  const callerId = auth.user.id;

  const peerId = req.nextUrl.searchParams.get('peer') ?? '';
  if (!UUID_RE.test(peerId) || peerId === callerId) return fail(400, 'invalid_peer');

  // 방향별로 1건씩만 확인하면 충분하다.
  const [sent, received] = await Promise.all([
    admin.from('direct_messages').select('sender_id, receiver_id')
      .eq('sender_id', callerId).eq('receiver_id', peerId).limit(1),
    admin.from('direct_messages').select('sender_id, receiver_id')
      .eq('sender_id', peerId).eq('receiver_id', callerId).limit(1),
  ]);
  if (sent.error || received.error) {
    console.error('[jam-room] direct_messages query failed', sent.error ?? received.error);
    return fail(500, 'lookup_failed');
  }

  if (!isMutualDmPair(callerId, peerId, [...(sent.data ?? []), ...(received.data ?? [])])) {
    return fail(403, 'not_matched');
  }

  return NextResponse.json(deriveJamRoom(callerId, peerId, secret), { headers: NO_STORE });
}
