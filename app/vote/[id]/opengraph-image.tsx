import { ImageResponse } from 'next/og';
import { supabase } from '@/lib/supabase';

export const runtime = 'edge';
export const alt = '합주 후보 투표 | Music Spot';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

interface Props {
  params: { id: string };
}

/** 단톡방 미리보기 카드: "다음 합주 어디서? 후보 N곳 투표" */
export default async function OGImage({ params }: Props) {
  const { data } = await supabase.rpc('get_vote', { p_vote_id: params.id });
  const count = (data as { studio_ids?: string[] } | null)?.studio_ids?.length ?? 0;

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
          position: 'relative',
        }}
      >
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
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            background: '#FFFFFF',
            border: '6px solid #0A0A0A',
            borderRadius: 32,
            boxShadow: '12px 12px 0 #0A0A0A',
            padding: '56px 72px',
          }}
        >
          <div style={{ fontSize: 72, marginBottom: 12 }}>🗳️</div>
          <div style={{ fontSize: 68, fontWeight: 900, color: '#0A0A0A' }}>다음 합주 어디서?</div>
          <div
            style={{
              marginTop: 24,
              fontSize: 44,
              fontWeight: 900,
              color: '#FFFFFF',
              background: '#FF3D77',
              border: '4px solid #0A0A0A',
              borderRadius: 20,
              padding: '10px 32px',
            }}
          >
            {count > 0 ? `후보 ${count}곳 투표` : '합주 후보 투표'}
          </div>
          <div style={{ marginTop: 28, fontSize: 28, fontWeight: 700, color: 'rgba(10,10,10,0.6)' }}>
            로그인 없이 바로 투표 · Music Spot
          </div>
        </div>
      </div>
    ),
    size,
  );
}
