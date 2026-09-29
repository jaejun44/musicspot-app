// 합주실 실시간 예약은 별도 배포(musicspot-booking 저장소, Vite)다. /booking 아래를 그쪽으로 넘긴다.
// 같은 출처(www)에서 열려야 예약 화면이 이 사이트의 Supabase 로그인 세션을 그대로 읽는다.
// 서브도메인으로 옮기면 손님이 로그인을 두 번 해야 한다.
const BOOKING_ORIGIN = (process.env.BOOKING_ORIGIN ?? '').replace(/\/+$/, '');

if (!BOOKING_ORIGIN) {
  // 운영에서 빠지면 /booking 전체가 404가 된다. 배포 순간 알도록 빌드를 멈춘다.
  // 로컬·프리뷰에서는 예약 서비스 없이도 사이트를 띄울 수 있게 경고만 한다.
  if (process.env.VERCEL_ENV === 'production') {
    throw new Error('BOOKING_ORIGIN이 없습니다. 예약 서비스 배포 주소를 Vercel env에 넣어야 /booking이 열립니다.');
  }
  console.warn('[next.config] BOOKING_ORIGIN이 없어 /booking을 넘기지 않습니다.');
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'geolocation=(self), camera=(), microphone=(self)' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
        ],
      },
    ];
  },
  async rewrites() {
    if (!BOOKING_ORIGIN) return [];
    return [
      { source: '/booking', destination: `${BOOKING_ORIGIN}/booking/` },
      { source: '/booking/:path*', destination: `${BOOKING_ORIGIN}/booking/:path*` },
    ];
  },
  async redirects() {
    return [
      {
        source: '/studios',
        destination: '/search',
        permanent: true,
      },
      {
        source: '/studios/:id',
        destination: '/room/:id',
        permanent: true,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'mwllqreadynmaoorymkn.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 't1.kakaocdn.net',
      },
      {
        protocol: 'https',
        hostname: 'cdn.mule.co.kr',
      },
      {
        protocol: 'https',
        hostname: 'nrbe.pstatic.net',
      },
      {
        protocol: 'https',
        hostname: '*.edge.naverncp.com',
      },
      {
        protocol: 'https',
        hostname: 'simg.pstatic.net',
      },
      {
        protocol: 'https',
        hostname: 'bub.searchroom.kr',
      },
    ],
  },
};

module.exports = nextConfig;
