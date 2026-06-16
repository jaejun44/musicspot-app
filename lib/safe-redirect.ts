/**
 * 오픈 리다이렉트 방지: 로그인 후 복귀 경로(returnTo)는 반드시 "내부 경로"만 허용한다.
 * - 반드시 단일 슬래시(/)로 시작
 * - 프로토콜 상대 경로(//evil.com), 백슬래시 우회(/\evil.com) 차단
 * - http(s):// 등 외부 절대 URL 차단 (스킴이 있으면 '/'로 시작하지 않으므로 자동 차단)
 * - 제어문자 차단
 * 유효하지 않으면 fallback 반환.
 */
export function safeInternalPath(
  raw: string | null | undefined,
  fallback = '/my-bookings',
): string {
  if (!raw) return fallback;

  let path: string;
  try {
    path = decodeURIComponent(raw);
  } catch {
    return fallback;
  }

  // 단일 슬래시로 시작하지 않으면 외부/상대 경로로 간주
  if (!path.startsWith('/')) return fallback;
  // 프로토콜 상대(//) · 백슬래시 우회(/\) 차단
  if (path.startsWith('//') || path.startsWith('/\\')) return fallback;
  // 제어문자(0x00~0x1F) 차단
  for (let i = 0; i < path.length; i++) {
    if (path.charCodeAt(i) < 0x20) return fallback;
  }

  return path;
}
