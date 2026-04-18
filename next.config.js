/** @type {import('next').NextConfig} */
const nextConfig = {
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
