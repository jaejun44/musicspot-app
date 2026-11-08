import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { configureWebPush, notifyVoteDecided, notifyVoteResponse } from '@/lib/push-server';

// 투표 응답·결정 직후 클라이언트가 부른다. 내용은 믿지 않고 서버가 DB를 다시 읽어 판단(lib/push-server.ts)
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  let body: { event?: unknown; vote_id?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const { event, vote_id: voteId } = body;
  if ((event !== 'vote_response' && event !== 'vote_decided') || typeof voteId !== 'string' || !UUID.test(voteId)) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }
  if (!configureWebPush()) {
    console.error('[push/notify] VAPID 환경변수 없음 — 발송 안 함');
    return NextResponse.json({ error: 'not_configured' }, { status: 503 });
  }
  try {
    const admin = createAdminClient();
    const result = event === 'vote_response' ? await notifyVoteResponse(admin, voteId) : await notifyVoteDecided(admin, voteId);
    return NextResponse.json(result);
  } catch (e) {
    console.error('[push/notify] 발송 처리 실패', e);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}
