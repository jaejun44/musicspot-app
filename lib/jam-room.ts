import 'server-only';
import { createHmac } from 'crypto';

// SonoBus(원격 합주 앱) 그룹 방 정보. DB에 저장하지 않고 두 사람의 user id 쌍 + 서버 비밀값(SONOBUS_ROOM_SECRET)으로
// 매번 같은 값을 다시 만든다. 비밀값을 모르면 남의 방 이름·비밀번호를 추측할 수 없다.

/** SonoBus 공식 기본 연결 서버 (sonosaurus/sonobus Source/SonobusPluginProcessor.h DEFAULT_SERVER_HOST/PORT) */
export const SONOBUS_SERVER = 'aoo.sonobus.net:10998';

export interface JamRoom {
  groupName: string;
  password: string;
  /** sonobus:// 스킴. 앱이 설치돼 있으면 바로 그룹에 접속한다 (Android는 스킴 미등록) */
  launchUrl: string;
}

export interface DirectMessageEdge {
  sender_id: string;
  receiver_id: string;
}

/** 순서와 무관한 쌍 키. A가 열든 B가 열든 같은 방이 나와야 한다 */
export function pairKey(a: string, b: string): string {
  return [a, b].sort().join(':');
}

/**
 * 매칭 판정: 호출자와 상대가 서로 1통 이상 DM을 주고받았는가.
 * 넘겨받은 메시지 중 이 두 사람 사이의 것만 본다 → 제3자가 남의 상대를 peer로 넣어도 통과하지 못한다.
 */
export function isMutualDmPair(callerId: string, peerId: string, messages: DirectMessageEdge[]): boolean {
  if (!callerId || !peerId || callerId === peerId) return false;
  const sent = messages.some((m) => m.sender_id === callerId && m.receiver_id === peerId);
  const received = messages.some((m) => m.sender_id === peerId && m.receiver_id === callerId);
  return sent && received;
}

const BASE32 = 'abcdefghijklmnopqrstuvwxyz234567';

function hmac(secret: string, label: string, key: string): Buffer {
  return createHmac('sha256', secret).update(`${label}:${key}`).digest();
}

function toBase32(bytes: Buffer, length: number): string {
  let out = '';
  let bits = 0;
  let value = 0;
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5 && out.length < length) {
      out += BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
    if (out.length >= length) break;
  }
  return out;
}

/** 공개 잼 방은 호스트와 참가자만 방 정보를 받는다 */
export function canAccessJamSession(callerId: string, hostId: string, participantIds: string[]): boolean {
  if (!callerId) return false;
  return callerId === hostId || participantIds.includes(callerId);
}

/** 1:1 매칭 쌍의 방 (채팅창 버튼) */
export function deriveJamRoom(userA: string, userB: string, secret: string): JamRoom {
  return deriveRoom(pairKey(userA, userB), secret);
}

/** 공개 잼 방 (밴드찾기 > 온라인 잼). 쌍 키(uuid:uuid)와 겹치지 않게 접두어를 붙인다 */
export function deriveSessionJamRoom(sessionId: string, secret: string): JamRoom {
  return deriveRoom(`session:${sessionId}`, secret);
}

function deriveRoom(key: string, secret: string): JamRoom {
  if (!secret) throw new Error('SONOBUS_ROOM_SECRET is not set');
  const groupName = `musicspot-${hmac(secret, 'sonobus-group:v1', key).toString('hex').slice(0, 10)}`;
  // 60비트. 그룹 이름과 다른 라벨을 써서 이름에서 비밀번호를 유추할 수 없게 한다.
  const password = toBase32(hmac(secret, 'sonobus-password:v1', key), 12);
  const params = new URLSearchParams({ g: groupName, p: password });
  return { groupName, password, launchUrl: `sonobus://${SONOBUS_SERVER}/?${params.toString()}` };
}
