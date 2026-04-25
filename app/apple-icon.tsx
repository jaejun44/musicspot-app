import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const contentType = 'image/png';
export const size = { width: 180, height: 180 };

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          background: '#FF3D77',
          borderRadius: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            fontSize: 72,
            fontWeight: 900,
            color: '#FFFFFF',
            lineHeight: 1,
            letterSpacing: -3,
          }}
        >
          MS
        </div>
        <div
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: '#FFD600',
            marginTop: 4,
            letterSpacing: 2,
          }}
        >
          MUSIC
        </div>
      </div>
    ),
    { width: 180, height: 180 }
  );
}
