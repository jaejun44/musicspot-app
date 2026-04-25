import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const contentType = 'image/png';
export const size = { width: 512, height: 512 };

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 512,
          height: 512,
          background: '#FF3D77',
          borderRadius: 120,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            fontSize: 200,
            fontWeight: 900,
            color: '#FFFFFF',
            lineHeight: 1,
            letterSpacing: -8,
          }}
        >
          MS
        </div>
        <div
          style={{
            fontSize: 52,
            fontWeight: 700,
            color: '#FFD600',
            marginTop: 8,
            letterSpacing: 6,
          }}
        >
          MUSIC
        </div>
      </div>
    ),
    { width: 512, height: 512 }
  );
}
