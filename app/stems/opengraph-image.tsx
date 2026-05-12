import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = '8마디 주고받기 | Music Spot';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OGImage() {
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
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            backgroundImage: 'radial-gradient(rgba(10,10,10,0.13) 2px, rgba(0,0,0,0) 2px)',
            backgroundSize: '32px 32px',
          }}
        />

        {/* 우측 장식 원 */}
        <div
          style={{
            position: 'absolute',
            right: -60,
            top: -60,
            width: '420px',
            height: '420px',
            background: '#FF3D77',
            borderRadius: '50%',
            opacity: 0.1,
          }}
        />
        <div
          style={{
            position: 'absolute',
            right: 100,
            bottom: -100,
            width: '300px',
            height: '300px',
            background: '#F5FF4F',
            borderRadius: '50%',
            opacity: 0.18,
          }}
        />

        {/* 메인 컨텐츠 */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '64px 80px',
            flex: 1,
          }}
        >
          {/* 카테고리 뱃지 */}
          <div
            style={{
              background: '#F5FF4F',
              border: '3px solid #0A0A0A',
              borderRadius: '999px',
              padding: '8px 24px',
              fontSize: 24,
              fontWeight: 700,
              color: '#0A0A0A',
              display: 'flex',
              alignSelf: 'flex-start',
              marginBottom: 36,
              boxShadow: '4px 4px 0 #0A0A0A',
            }}
          >
            🎵 Music Spot RIFF
          </div>

          {/* 메인 헤드라인 */}
          <div
            style={{
              fontSize: 80,
              fontWeight: 900,
              color: '#0A0A0A',
              lineHeight: 1.05,
              marginBottom: 24,
            }}
          >
            8마디
          </div>
          <div
            style={{
              fontSize: 48,
              fontWeight: 900,
              color: '#FF3D77',
              lineHeight: 1.1,
              marginBottom: 36,
            }}
          >
            주고받기
          </div>

          {/* 설명 */}
          <div
            style={{
              fontSize: 28,
              color: 'rgba(10,10,10,0.6)',
              fontWeight: 500,
              marginBottom: 48,
              maxWidth: '700px',
            }}
          >
            뮤지션들이 8마디씩 릴레이로 만들어가는 음악 프로젝트
          </div>

          {/* 태그 칩 */}
          <div style={{ display: 'flex', gap: 12 }}>
            {['🎸 기타', '🥁 드럼', '🎹 건반', '🎤 보컬'].map((tag) => (
              <div
                key={tag}
                style={{
                  background: 'rgba(255,61,119,0.12)',
                  border: '2px solid #FF3D77',
                  borderRadius: '999px',
                  padding: '8px 20px',
                  fontSize: 22,
                  fontWeight: 700,
                  color: '#FF3D77',
                  display: 'flex',
                }}
              >
                {tag}
              </div>
            ))}
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
