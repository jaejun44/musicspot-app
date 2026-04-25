import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Music Spot — 내 밴드에 맞는 연습실',
    short_name: 'Music Spot',
    description: '음악인을 위한 연습실 검색 플랫폼. 위치 기반으로 가까운 연습실을 찾고 바로 문의하세요.',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#FFF8F0',
    theme_color: '#FF3D77',
    icons: [
      { src: '/icon?size=192', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icon?size=512', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/apple-icon', sizes: '180x180', type: 'image/png' },
    ],
    categories: ['music', 'lifestyle', 'entertainment'],
    lang: 'ko',
  };
}
