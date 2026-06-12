import 'server-only';
import { cookies } from 'next/headers';
import { createHmac, timingSafeEqual } from 'crypto';

const COOKIE_NAME = 'ms_admin';
const SESSION_MAX_AGE = 60 * 60 * 8; // 8시간

function getSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error('ADMIN_SESSION_SECRET is not set');
  return secret;
}

function sessionToken(): string {
  // 고정 payload를 서버 시크릿으로 서명. 시크릿을 모르면 위조 불가.
  return `ok.${createHmac('sha256', getSecret()).update('ok').digest('hex')}`;
}

/** 타이밍 세이프 비밀번호 비교 */
export function verifyAdminPassword(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD ?? '';
  if (!expected) return false;
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** 로그인 성공 시 httpOnly 세션 쿠키 발급 */
export function issueAdminSession(): void {
  cookies().set(COOKIE_NAME, sessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  });
}

export function clearAdminSession(): void {
  cookies().delete(COOKIE_NAME);
}

/** 현재 요청이 인증된 어드민인지 (예외 없이 boolean) */
export function isAdmin(): boolean {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return false;
  const expected = sessionToken();
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** 모든 admin Server Action / API 첫 줄에서 호출. 미인증이면 throw. */
export function assertAdmin(): void {
  if (!isAdmin()) throw new Error('UNAUTHORIZED');
}
