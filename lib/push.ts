import { supabase } from '@/lib/supabase';

/**
 * 웹 푸시 구독 (재방문 ③ PR 1 — 구독만, 발송은 PR 2). 설계 docs/PLAN_notifications.md, DB supabase/14_push.sql.
 * 서비스 워커(public/sw.js)는 사용자가 "알림 받기"를 눌렀을 때만 등록한다 — 다른 방문자에게는 아무것도 깔지 않는다.
 * 구독은 기기 키(ms_vk)와 투표·정산 id에 묶인다. 어떤 대상을 켰는지는 이 브라우저 localStorage(ms_push_topics)에만 둔다(읽는 RPC 없음).
 */

export type PushKind = 'vote' | 'split' | 'ear';
export type PushSupport = 'unsupported' | 'denied' | 'default' | 'granted';
export type SubscribeResult = 'saved' | 'invalid' | 'not_found' | 'expired' | 'not_member' | 'limited';

const TOPICS_KEY = 'ms_push_topics';
const SW_URL = '/sw.js';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';

/** base64url → Uint8Array (pushManager.subscribe의 applicationServerKey) */
export function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (value.length % 4)) % 4);
  const raw = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

export function topicKey(kind: PushKind, targetId: string): string {
  return `${kind}:${targetId}`;
}

/** 저장된 목록에 대상을 넣거나 뺀 새 목록. 잘못된 값은 버리고 최대 50개(서버 구독당 상한과 같음) */
export function nextTopics(stored: unknown, key: string, on: boolean): string[] {
  const list = Array.isArray(stored) ? stored.filter((v): v is string => typeof v === 'string') : [];
  const without = list.filter((v) => v !== key);
  return (on ? [...without, key] : without).slice(-50);
}

function readTopics(): string[] {
  try {
    return nextTopics(JSON.parse(localStorage.getItem(TOPICS_KEY) || '[]'), '', false);
  } catch {
    return [];
  }
}

function writeTopic(key: string, on: boolean) {
  try {
    localStorage.setItem(TOPICS_KEY, JSON.stringify(nextTopics(readTopics(), key, on)));
  } catch (e) {
    console.warn('[push] 구독 대상 저장 실패 — 새로고침하면 "알림 받기"가 다시 보일 수 있음', e);
  }
}

export function isTopicOn(kind: PushKind, targetId: string): boolean {
  if (typeof window === 'undefined') return false;
  return readTopics().includes(topicKey(kind, targetId));
}

/**
 * 이 브라우저에서 웹 푸시를 쓸 수 있는지. iOS는 홈 화면 앱에서만 PushManager가 있다.
 * VAPID 공개키가 없는 배포(환경변수 등록 전)에서도 unsupported → 화면에 아무것도 안 보인다.
 */
export function getPushSupport(): PushSupport {
  if (typeof window === 'undefined' || !VAPID_PUBLIC_KEY) return 'unsupported';
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

async function currentSubscription(): Promise<PushSubscription | null> {
  const reg = await navigator.serviceWorker.getRegistration(SW_URL);
  return reg ? reg.pushManager.getSubscription() : null;
}

/**
 * 권한 요청 → 서비스 워커 등록 → 구독 → 서버 저장. 반드시 클릭 핸들러 안에서 호출(iOS는 사용자 탭에서만 권한 요청 가능).
 * 권한이 거절되면 'denied'를 반환한다.
 */
export async function subscribeTopic(input: {
  kind: PushKind;
  targetId: string;
  deviceKey: string;
  creatorToken?: string | null;
  country: string;
  language?: 'ko' | 'ja';
}): Promise<SubscribeResult | 'denied'> {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return 'denied';

  const reg = await navigator.serviceWorker.register(SW_URL, { scope: '/' });
  await navigator.serviceWorker.ready;
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlToBytes(VAPID_PUBLIC_KEY),
    }));
  const json = sub.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) throw new Error('구독 정보를 읽지 못했어요.');

  const { data, error } = await supabase.rpc('subscribe_push', {
    p_device_key: input.deviceKey,
    p_endpoint: json.endpoint,
    p_p256dh: json.keys.p256dh,
    p_auth: json.keys.auth,
    p_kind: input.kind,
    p_target_id: input.targetId,
    p_creator_token: input.creatorToken ?? null,
    p_country: input.country,
    p_language: input.language ?? 'ko',
  });
  if (error) throw new Error(`알림을 켜지 못했어요. (${error.message})`);
  const result = data as SubscribeResult;
  if (result === 'saved') writeTopic(topicKey(input.kind, input.targetId), true);
  return result;
}

/** 이 대상만 끈다. 서버에서 받을 대상이 0개가 되면 구독 자체도 지워진다(브라우저 권한은 그대로) */
export async function unsubscribeTopic(kind: PushKind, targetId: string): Promise<void> {
  writeTopic(topicKey(kind, targetId), false);
  const sub = await currentSubscription();
  if (!sub) return;
  const { data, error } = await supabase.rpc('unsubscribe_push', {
    p_endpoint: sub.endpoint,
    p_kind: kind,
    p_target_id: targetId,
  });
  if (error) throw new Error(`알림을 끄지 못했어요. (${error.message})`);
  if (data !== 'deleted' && data !== 'not_found') console.warn('[push] 구독 해제 응답', data);
}

/**
 * 투표 응답·결정 직후 발송 서버에 알린다(app/api/push/notify). 서버가 DB를 다시 읽어 판단하므로 결과는 기다리지 않는다.
 * keepalive: 결정 직후 상세 페이지로 이동해도 요청이 끊기지 않게
 */
export function requestPushNotify(event: 'vote_response' | 'vote_decided', voteId: string): void {
  fetch('/api/push/notify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event, vote_id: voteId }),
    keepalive: true,
  })
    .then((res) => {
      // 503 = VAPID 키 미등록(알림 기능 꺼짐) — 정상 상태라 경고만
      if (!res.ok && res.status !== 503) console.error('[push] 알림 요청 실패', res.status);
    })
    .catch((e) => console.error('[push] 알림 요청 실패', e));
}
