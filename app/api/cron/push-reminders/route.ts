import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { configureWebPush, runDailyReminders } from '@/lib/push-server';

// Vercel Cron(vercel.json, 하루 1번 11:00 UTC = 20:00 KST, Hobby는 ±59분) — 합주 전날·정산 미납·오늘의 음감 알림
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!configureWebPush()) {
    console.error('[cron/push-reminders] VAPID 환경변수 없음 — 발송 안 함');
    return NextResponse.json({ error: 'not_configured' }, { status: 503 });
  }
  try {
    const result = await runDailyReminders(createAdminClient());
    console.log('[cron/push-reminders]', JSON.stringify(result));
    return NextResponse.json(result);
  } catch (e) {
    console.error('[cron/push-reminders] 실패', e);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}
