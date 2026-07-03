import { NextRequest, NextResponse } from 'next/server';
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  isJaBlockedPath,
  isLocale,
  type Locale,
} from '@/lib/i18n/locale';

const LOCALE_HEADER = 'x-locale';

/**
 * 로케일 판별 우선순위:
 * 1. 쿠키 (유저가 토글로 직접 선택한 값 포함)
 * 2. IP 국가 (Vercel geo 헤더 x-vercel-ip-country === 'JP')
 * 3. 브라우저 언어 (Accept-Language 1순위가 ja)
 */
function resolveLocale(req: NextRequest): Locale {
  const cookieValue = req.cookies.get(LOCALE_COOKIE)?.value;
  if (isLocale(cookieValue)) return cookieValue;

  const country = req.headers.get('x-vercel-ip-country');
  if (country === 'JP') return 'ja';

  const acceptLanguage = req.headers.get('accept-language') ?? '';
  const primary = acceptLanguage.split(',')[0]?.trim().toLowerCase() ?? '';
  if (primary.startsWith('ja')) return 'ja';

  return DEFAULT_LOCALE;
}

export function middleware(req: NextRequest) {
  const locale = resolveLocale(req);
  const { pathname } = req.nextUrl;

  // 일본어 모드: 연습실 관련 경로 접근 차단 → 홈으로
  if (locale === 'ja' && isJaBlockedPath(pathname)) {
    const res = NextResponse.redirect(new URL('/', req.url));
    persistLocale(res, req, locale);
    return res;
  }

  // 레이아웃(서버 컴포넌트)에서 읽을 수 있도록 요청 헤더에 로케일 주입
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set(LOCALE_HEADER, locale);

  const res = NextResponse.next({ request: { headers: requestHeaders } });
  persistLocale(res, req, locale);
  persistCountry(res, req);
  return res;
}

/** IP 국가(Vercel geo)를 쿠키로 저장 → 게시물 작성 시 클라이언트가 읽어 country 기록. */
function persistCountry(res: NextResponse, req: NextRequest) {
  const country = req.headers.get('x-vercel-ip-country');
  if (country && /^[A-Z]{2}$/.test(country) && req.cookies.get('ms_country')?.value !== country) {
    res.cookies.set('ms_country', country, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    });
  }
}

function persistLocale(res: NextResponse, req: NextRequest, locale: Locale) {
  if (req.cookies.get(LOCALE_COOKIE)?.value !== locale) {
    res.cookies.set(LOCALE_COOKIE, locale, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    });
  }
}

export const config = {
  // 정적 리소스·API·Next 내부 경로 제외
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.\\w+$).*)'],
};
