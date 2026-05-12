import { ImageResponse } from 'next/og';
import { supabase } from '@/lib/supabase';

export const runtime = 'edge';
export const alt = '뮤지션 프로필 | Music Spot';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

interface Props {
  params: { id: string };
}

const POSITION_EMOJIS: Record<string, string> = {
  '보컬': '🎤',
  '기타': '🎸',
  '베이스': '🎸',
  '드럼': '🥁',
  '건반': '🎹',
  '키보드': '🎹',
  '바이올린': '🎻',
  '색소폰': '🎷',
  '트럼펫': '🎺',
};

export default async function OGImage({ params }: Props) {
  const { data } = await supabase
    .from('user_profiles')
    .select('display_name, bio, instruments, avatar_url')
    .eq('user_id', params.id)
    .maybeSingle();

  const name = data?.display_name ?? '뮤지션';
  const bio = data?.bio ?? 'Music Spot에서 활동 중인 뮤지션';
  const instruments: string[] = data?.instruments ?? [];
  const emoji = POSITION_EMOJIS[instruments[0] ?? ''] ?? '🎶';

  return new ImageResponse(
    (
      <div
        style={{
          background: '#FFF8F0',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
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

        {/* 우측 장식 원 */}
        <div
          style={{
            position: 'absolute',
            right: -80,
            top: -80,
            width: '480px',
            height: '480px',
            background: '#FF3D77',
            borderRadius: '50%',
            opacity: 0.12,
          }}
        />
        <div
          style={{
            position: 'absolute',
            right: 80,
            bottom: -120,
            width: '360px',
            height: '360px',
            background: '#4FC3F7',
            borderRadius: '50%',
            opacity: 0.15,
          }}
        />

        {/* 메인 컨텐츠 */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            padding: '64px 80px',
            flex: 1,
          }}
        >
          {/* 카테고리 뱃지 */}
          <div
            style={{
              background: '#4FC3F7',
              border: '3px solid #0A0A0A',
              borderRadius: '999px',
              padding: '8px 24px',
              fontSize: 24,
              fontWeight: 700,
              color: '#0A0A0A',
              display: 'inline-flex',
              alignSelf: 'flex-start',
              marginBottom: 40,
              boxShadow: '4px 4px 0 #0A0A0A',
            }}
          >
            뮤지션 프로필
          </div>

          {/* 이름 + 이모지 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 24,
              marginBottom: 24,
            }}
          >
            <div style={{ fontSize: 72 }}>{emoji}</div>
            <div
              style={{
                fontSize: 72,
                fontWeight: 900,
                color: '#0A0A0A',
                lineHeight: 1.1,
                letterSpacing: '-1px',
              }}
            >
              {name}
            </div>
          </div>

          {/* bio */}
          <div
            style={{
              fontSize: 32,
              color: 'rgba(10,10,10,0.6)',
              fontWeight: 500,
              marginBottom: 48,
              maxWidth: '800px',
              overflow: 'hidden',
            }}
          >
            {bio.length > 60 ? bio.slice(0, 60) + '…' : bio}
          </div>

          {/* 악기 태그 */}
          {instruments.length > 0 && (
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {instruments.slice(0, 4).map((inst) => (
                <div
                  key={inst}
                  style={{
                    background: '#F5FF4F',
                    border: '3px solid #0A0A0A',
                    borderRadius: '999px',
                    padding: '8px 24px',
                    fontSize: 24,
                    fontWeight: 700,
                    color: '#0A0A0A',
                    boxShadow: '3px 3px 0 #0A0A0A',
                  }}
                >
                  {inst}
                </div>
              ))}
            </div>
          )}
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
