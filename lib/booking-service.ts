// 합주실 실시간 예약 서비스(musicspot-booking)와 이어지는 곳.
// 화면은 이 사이트의 /booking 아래(next.config rewrites)에서 열리고, API는 별도 서버다.

/** 예약 화면 경로. Next 라우트가 아니라 rewrite라서 next/link가 아닌 <a>로 이동한다. */
export const bookingPath = {
  studio: (siteStudioId: string) => `/booking/s/${encodeURIComponent(siteStudioId)}`,
  myReservations: '/booking/me',
  owner: '/booking/owner',
};

// 예약 API 주소. 비어 있으면 예약 서비스 없이 사이트만 띄운 것이다(로컬·프리뷰).
// 그때는 실시간 예약 입구를 숨기고 사이트의 나머지는 그대로 동작한다.
const API_URL = (process.env.NEXT_PUBLIC_BOOKING_API_URL ?? '').replace(/\/+$/, '');

// 입구를 띄울지 판단하는 요청이다. 늦으면 입구 없이 페이지를 쓰게 둔다.
const TIMEOUT_MS = 4000;

/**
 * 이 연습실이 실시간 예약을 받는지. 예약 서비스가 404면 받지 않는 것이고,
 * 그 밖의 실패(서버 다운 등)도 입구를 숨긴다. 연습실 상세를 막을 이유는 아니라서
 * 던지지 않되, 조용히 삼키지 않고 콘솔에 남긴다.
 *
 * 공개 전(시범 운영) 업체는 그 업체 사장님 계정에게만 200이다. 그래서 로그인했으면
 * 사이트 세션 토큰을 함께 보낸다. 없으면 손님으로 묻는다.
 */
export async function isRealtimeBookable(
  siteStudioId: string,
  accessToken?: string,
): Promise<boolean> {
  if (!API_URL) return false;
  try {
    const res = await fetch(
      `${API_URL}/api/studios/by-site/${encodeURIComponent(siteStudioId)}`,
      {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      },
    );
    if (res.status === 404) return false;
    if (!res.ok) {
      console.warn('[booking-service] 실시간 예약 여부 확인 실패', res.status);
      return false;
    }
    const body = (await res.json()) as { rooms?: unknown[] };
    // 업체는 이어졌지만 예약을 받는 방이 없으면 들어가도 고를 게 없다.
    return Array.isArray(body.rooms) && body.rooms.length > 0;
  } catch (err) {
    console.warn('[booking-service] 실시간 예약 여부 확인 실패', err);
    return false;
  }
}

export interface ManagedStudio {
  studioId: number;
  name: string;
}

/**
 * 로그인한 사람이 예약관리로 관리하는 합주실. 사장님 초대 링크를 수락한 사람만 있다.
 * accessToken은 이 사이트의 Supabase 세션 토큰이다(예약 서버가 같은 토큰을 믿는다).
 */
export async function fetchManagedStudios(accessToken: string): Promise<ManagedStudio[]> {
  if (!API_URL) return [];
  try {
    const res = await fetch(`${API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      console.warn('[booking-service] 관리 합주실 조회 실패', res.status);
      return [];
    }
    const body = (await res.json()) as { studios?: ManagedStudio[] };
    return body.studios ?? [];
  } catch (err) {
    console.warn('[booking-service] 관리 합주실 조회 실패', err);
    return [];
  }
}
