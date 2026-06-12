import { ImageResponse } from 'next/og';
import { getRegionBySlug } from '@/lib/regions';

export const runtime = 'edge';
export const alt = '지역 합주실·연습실 | Music Spot';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

interface Props {
  params: { slug: string };
}

export default async function OGImage({ params }: Props) {
  const region = getRegionBySlug(params.slug);
  const label = region?.label ?? '우리 동네';
  const city = region?.city ?? '';

  return new ImageResponse(
    (
      <div
        style={{
          background: '#FFF8F0',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
          position: 'relative',
          overflow: 'hidden',
          padding: '64px 72px',
        }}
      >
        {/* 배경 도트 패턴 */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            backgroundImage: 'radial-gradient(rgba(10,10,10,0.13) 2px, rgba(0,0,0,0) 2px)',
            backgroundSize: '32px 32px',
          }}
        />

        {/* 도시 뱃지 */}
        <div
          style={{
            position: 'relative',
            background: '#FF3D77',
            border: '3px solid #0A0A0A',
            borderRadius: '999px',
            padding: '8px 24px',
            fontSize: 26,
            fontWeight: 700,
            color: '#FFFFFF',
            display: 'flex',
            alignSelf: 'flex-start',
            marginBottom: 32,
            boxShadow: '4px 4px 0 #0A0A0A',
          }}
        >
          📍 {city || '대한민국'}
        </div>

        {/* 지역명 */}
        <div
          style={{
            position: 'relative',
            fontSize: 88,
            fontWeight: 900,
            color: '#0A0A0A',
            lineHeight: 1.05,
            marginBottom: 20,
            display: 'flex',
          }}
        >
          {label} 합주실·연습실
        </div>

        {/* 서브카피 */}
        <div
          style={{
            position: 'relative',
            fontSize: 34,
            color: 'rgba(10,10,10,0.6)',
            fontWeight: 500,
            marginBottom: 48,
            display: 'flex',
          }}
        >
          위치·가격·드럼 여부로 비교하고 바로 문의
        </div>

        {/* 브랜드 */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              background: '#0A0A0A',
              borderRadius: '12px',
              padding: '10px 24px',
              fontSize: 26,
              fontWeight: 900,
              color: '#F5FF4F',
              display: 'flex',
            }}
          >
            MUSIC SPOT
          </div>
        </div>

        {/* 우상단 워터마크 */}
        <div
          style={{
            position: 'absolute',
            top: 28,
            right: 28,
            background: '#FF3D77',
            border: '3px solid #0A0A0A',
            borderRadius: '12px',
            padding: '8px 20px',
            fontSize: 22,
            fontWeight: 900,
            color: '#FFFFFF',
            boxShadow: '4px 4px 0 #0A0A0A',
            display: 'flex',
          }}
        >
          Music Spot
        </div>
      </div>
    ),
    { ...size }
  );
}
