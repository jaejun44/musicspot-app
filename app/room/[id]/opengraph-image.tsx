import { ImageResponse } from 'next/og';
import { supabase } from '@/lib/supabase';

export const runtime = 'edge';
export const alt = '연습실 정보 | Music Spot';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

interface Props {
  params: { id: string };
}

export default async function OGImage({ params }: Props) {
  const { data } = await supabase
    .from('studios')
    .select('name, address, photos')
    .eq('id', params.id)
    .eq('is_published', true)
    .single();

  const name = data?.name ?? '연습실';
  const address = data?.address ?? '뮤지션을 위한 합주/연습실';
  const photo = data?.photos?.[0] ?? null;

  return new ImageResponse(
    (
      <div
        style={{
          background: '#FFF8F0',
          width: '100%',
          height: '100%',
          display: 'flex',
          fontFamily: 'sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* 배경 도트 패턴 */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'radial-gradient(rgba(10,10,10,0.13) 2px, transparent 2px)',
            backgroundSize: '32px 32px',
          }}
        />

        {/* 사진 영역 (있을 때만) */}
        {photo && (
          <img
            src={photo}
            style={{
              position: 'absolute',
              right: 0,
              top: 0,
              width: '480px',
              height: '100%',
              objectFit: 'cover',
              opacity: 0.85,
            }}
          />
        )}

        {/* 사진 위 그라디언트 오버레이 */}
        {photo && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to right, #FFF8F0 55%, transparent 80%)',
            }}
          />
        )}

        {/* 텍스트 영역 */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '64px 72px',
            maxWidth: '680px',
          }}
        >
          {/* 카테고리 뱃지 */}
          <div
            style={{
              background: '#FF3D77',
              border: '3px solid #0A0A0A',
              borderRadius: '999px',
              padding: '8px 24px',
              fontSize: 24,
              fontWeight: 700,
              color: '#FFFFFF',
              display: 'inline-flex',
              alignSelf: 'flex-start',
              marginBottom: 32,
              boxShadow: '4px 4px 0 #0A0A0A',
            }}
          >
            🎸 합주/연습실
          </div>

          {/* 연습실 이름 */}
          <div
            style={{
              fontSize: 64,
              fontWeight: 900,
              color: '#0A0A0A',
              lineHeight: 1.1,
              marginBottom: 24,
              letterSpacing: '-1px',
            }}
          >
            {name}
          </div>

          {/* 주소 */}
          <div
            style={{
              fontSize: 32,
              color: 'rgba(10,10,10,0.6)',
              fontWeight: 500,
              marginBottom: 48,
            }}
          >
            {address}
          </div>

          {/* Music Spot 브랜드 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div
              style={{
                background: '#0A0A0A',
                borderRadius: '12px',
                padding: '8px 20px',
                fontSize: 22,
                fontWeight: 900,
                color: '#F5FF4F',
                letterSpacing: '1px',
              }}
            >
              MUSIC SPOT
            </div>
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
          }}
        >
          Music Spot
        </div>
      </div>
    ),
    { ...size }
  );
}
