import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Music Spot — 내 밴드에 맞는 연습실 찾기';
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
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
          border: '12px solid #0A0A0A',
          position: 'relative',
        }}
      >
        {/* 배경 도트 패턴 */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'radial-gradient(#0A0A0A22 2px, transparent 2px)',
            backgroundSize: '32px 32px',
          }}
        />

        {/* 메인 카드 */}
        <div
          style={{
            background: '#FF3D77',
            border: '6px solid #0A0A0A',
            borderRadius: '32px',
            padding: '48px 72px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            boxShadow: '12px 12px 0 #0A0A0A',
            position: 'relative',
          }}
        >
          <div style={{ fontSize: 80, marginBottom: 16 }}>🎸</div>
          <div
            style={{
              fontSize: 72,
              fontWeight: 900,
              color: '#FFFFFF',
              letterSpacing: '-2px',
              lineHeight: 1,
              textTransform: 'uppercase',
            }}
          >
            MUSIC SPOT
          </div>
          <div
            style={{
              marginTop: 24,
              fontSize: 32,
              color: '#F5FF4F',
              fontWeight: 700,
            }}
          >
            내 밴드에 맞는 연습실 찾기
          </div>
        </div>

        {/* 하단 태그 */}
        <div
          style={{
            marginTop: 40,
            display: 'flex',
            gap: 16,
          }}
        >
          {['1,000+ 연습실', '위치 기반 검색', '바로 문의'].map((tag) => (
            <div
              key={tag}
              style={{
                background: '#F5FF4F',
                border: '3px solid #0A0A0A',
                borderRadius: '999px',
                padding: '10px 24px',
                fontSize: 24,
                fontWeight: 700,
                color: '#0A0A0A',
                boxShadow: '4px 4px 0 #0A0A0A',
              }}
            >
              {tag}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
