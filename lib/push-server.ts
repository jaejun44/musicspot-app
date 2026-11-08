import 'server-only';
// 서버 전용. 웹 푸시 발송 (docs/PLAN_notifications.md, DB supabase/14_push.sql·15_push_log.sql).
// 클라이언트가 "무슨 일이 있었다"고 알려도 믿지 않는다 — service key로 DB를 다시 읽어 실제로 바뀐 것만 보낸다.
import webpush from 'web-push';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  decidedEvent,
  responseEvent,
  voteDecidedPayload,
  voteResponsePayload,
  type PushPayload,
} from '@/lib/push-messages';

/** 응답·결정이 이보다 오래됐으면 알림 요청을 무시(옛 이벤트 재전송 방지) */
const FRESH_MS = 2 * 60 * 1000;
const DECIDED_FRESH_MS = 10 * 60 * 1000;
/** 알림이 늦게 닿아도 이 시간 안이면 보여 준다(그 뒤엔 푸시 서비스가 버림) */
const TTL_SECONDS = 12 * 60 * 60;

export type NotifyResult =
  | { status: 'sent'; sent: number; skipped: number; gone: number; failed: number }
  | { status: 'ignored'; reason: string };

let configured = false;

/** VAPID 키가 없으면 false — 라우트가 503으로 알린다 */
export function configureWebPush(): boolean {
  if (configured) return true;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

interface Target {
  subscription_id: string;
  device_key: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  country: string;
  language: string;
}

interface TopicRow {
  subscription_id: string;
  push_subscriptions: { device_key: string; endpoint: string; p256dh: string; auth: string; country: string; language: string } | null;
}

/** 대상(투표·정산)의 한 역할 구독 전부. 1,000행 배치(docs/DATA_ACCESS.md) */
async function fetchTargets(admin: SupabaseClient, kind: 'vote' | 'split', targetId: string, role: 'creator' | 'member'): Promise<Target[]> {
  const all: Target[] = [];
  let offset = 0;
  while (true) {
    const { data, error } = await admin
      .from('push_topics')
      .select('subscription_id, push_subscriptions(device_key, endpoint, p256dh, auth, country, language)')
      .eq('kind', kind)
      .eq('target_id', targetId)
      .eq('role', role)
      .order('subscription_id')
      .range(offset, offset + 999);
    if (error) throw new Error(`[push] 구독 조회 실패 (${kind} ${targetId}): ${error.message}`);
    if (!data || data.length === 0) break;
    for (const row of data as unknown as TopicRow[]) {
      if (row.push_subscriptions) all.push({ subscription_id: row.subscription_id, ...row.push_subscriptions });
    }
    if (data.length < 1000) break;
    offset += 1000;
  }
  return all;
}

/**
 * push_log에 자리를 먼저 잡고(이미 있으면 건너뜀 = 중복 방지) 보낸다.
 * 404·410 = 구독 만료 → 구독 삭제(로그도 CASCADE). 그 밖의 실패는 failed로 남기고 재시도하지 않는다.
 */
async function deliver(
  admin: SupabaseClient,
  targets: Target[],
  kind: 'vote' | 'split',
  targetId: string,
  event: string,
  payload: PushPayload,
): Promise<NotifyResult> {
  if (targets.length === 0) return { status: 'sent', sent: 0, skipped: 0, gone: 0, failed: 0 };

  const { data: claimed, error } = await admin
    .from('push_log')
    .upsert(
      targets.map((t) => ({ subscription_id: t.subscription_id, kind, target_id: targetId, event, country: t.country, language: t.language })),
      { onConflict: 'subscription_id,kind,target_id,event', ignoreDuplicates: true },
    )
    .select('subscription_id');
  if (error) throw new Error(`[push] 발송 기록 실패 (${kind} ${targetId} ${event}): ${error.message}`);
  const claimedIds = new Set((claimed ?? []).map((r: { subscription_id: string }) => r.subscription_id));
  const todo = targets.filter((t) => claimedIds.has(t.subscription_id));

  const body = JSON.stringify(payload);
  const results = await Promise.allSettled(
    todo.map((t) =>
      webpush.sendNotification({ endpoint: t.endpoint, keys: { p256dh: t.p256dh, auth: t.auth } }, body, {
        TTL: TTL_SECONDS,
        urgency: 'normal',
      }),
    ),
  );

  const sentIds: string[] = [];
  const goneIds: string[] = [];
  const failedIds: string[] = [];
  results.forEach((r, i) => {
    const id = todo[i].subscription_id;
    if (r.status === 'fulfilled') return sentIds.push(id);
    const code = (r.reason as { statusCode?: number })?.statusCode;
    if (code === 404 || code === 410) return goneIds.push(id);
    failedIds.push(id);
    // endpoint는 "아는 사람은 누구나 보낼 수 있는 URL"이라 로그에 남기지 않는다
    console.error(`[push] 발송 실패 ${kind} ${targetId} ${event} sub=${id.slice(0, 8)} status=${code ?? 'none'}`);
  });

  const mark = async (ids: string[], status: 'sent' | 'failed') => {
    if (ids.length === 0) return;
    const { error: e } = await admin
      .from('push_log')
      .update({ status })
      .in('subscription_id', ids)
      .eq('kind', kind)
      .eq('target_id', targetId)
      .eq('event', event);
    if (e) console.error(`[push] 발송 상태 저장 실패 (${status}): ${e.message}`);
  };
  await mark(sentIds, 'sent');
  await mark(failedIds, 'failed');
  if (goneIds.length > 0) {
    const { error: e } = await admin.from('push_subscriptions').delete().in('id', goneIds);
    if (e) console.error(`[push] 만료 구독 삭제 실패: ${e.message}`);
  }

  return { status: 'sent', sent: sentIds.length, skipped: targets.length - todo.length, gone: goneIds.length, failed: failedIds.length };
}

/** ① 멤버가 투표함 → 만든 사람(본인이 투표한 경우는 제외), 10분에 1번 */
export async function notifyVoteResponse(admin: SupabaseClient, voteId: string, now = new Date()): Promise<NotifyResult> {
  const { data: vote, error } = await admin
    .from('votes')
    .select('id, expires_at, decided_studio_id')
    .eq('id', voteId)
    .maybeSingle();
  if (error) throw new Error(`[push] 투표 조회 실패 (${voteId}): ${error.message}`);
  if (!vote) return { status: 'ignored', reason: 'not_found' };
  if (vote.decided_studio_id || new Date(vote.expires_at) < now) return { status: 'ignored', reason: 'closed' };

  // 가장 최근 응답 1개 — 방금 생긴 응답이 있어야 보낸다
  const { data: latest, error: e2, count } = await admin
    .from('vote_responses')
    .select('voter_anon, updated_at', { count: 'exact' })
    .eq('vote_id', voteId)
    .order('updated_at', { ascending: false })
    .order('voter_anon')
    .range(0, 0);
  if (e2) throw new Error(`[push] 응답 조회 실패 (${voteId}): ${e2.message}`);
  const last = latest?.[0];
  if (!last || now.getTime() - new Date(last.updated_at).getTime() > FRESH_MS) return { status: 'ignored', reason: 'stale' };

  const targets = (await fetchTargets(admin, 'vote', voteId, 'creator')).filter((t) => t.device_key !== last.voter_anon);
  return deliver(admin, targets, 'vote', voteId, responseEvent(now), voteResponsePayload(voteId, count ?? 1));
}

/** ② 투표가 결정됨 → 멤버. 결정된 연습실마다 1번 */
export async function notifyVoteDecided(admin: SupabaseClient, voteId: string, now = new Date()): Promise<NotifyResult> {
  const { data: vote, error } = await admin
    .from('votes')
    .select('id, decided_studio_id, decided_at')
    .eq('id', voteId)
    .maybeSingle();
  if (error) throw new Error(`[push] 투표 조회 실패 (${voteId}): ${error.message}`);
  if (!vote) return { status: 'ignored', reason: 'not_found' };
  if (!vote.decided_studio_id || !vote.decided_at) return { status: 'ignored', reason: 'not_decided' };
  if (now.getTime() - new Date(vote.decided_at).getTime() > DECIDED_FRESH_MS) return { status: 'ignored', reason: 'stale' };

  const { data: studio, error: e2 } = await admin.from('studios').select('name').eq('id', vote.decided_studio_id).maybeSingle();
  if (e2) console.error(`[push] 연습실 이름 조회 실패 — 이름 없이 보냄: ${e2.message}`);

  const targets = await fetchTargets(admin, 'vote', voteId, 'member');
  return deliver(admin, targets, 'vote', voteId, decidedEvent(vote.decided_studio_id), voteDecidedPayload(voteId, studio?.name ?? null));
}

