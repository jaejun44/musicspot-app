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
    ],
  },
};

module.exports = nextConfig;
