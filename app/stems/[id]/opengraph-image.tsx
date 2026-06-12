import { ImageResponse } from 'next/og';
import { supabase } from '@/lib/supabase';

export const runtime = 'edge';
export const alt = '8마디 챌린지 | Music Spot';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

interface Props {
  params: { id: string };
}

export default async function OGImage({ params }: Props) {
  const { data } = await supabase
    .from('stem_projects')
    .select('title, creator_name, creator_emoji, genre, bpm, key_signature, pass_count, stem_tracks(count)')
    .eq('id', params.id)
    .maybeSingle();

  const title = data?.title ?? '8마디 챌린지';
  const creator = data?.creator_name ?? 'Music Spot';
  const emoji = data?.creator_emoji ?? '🎵';
  const genre = data?.genre ?? '';
  const bpm = data?.bpm ?? null;
  const keySig = data?.key_signature ?? '';
  const trackCount =
    (data?.stem_tracks as { count: number }[] | null)?.[0]?.count ?? 0;

  const stats = [
    { label: '참여', value: `${trackCount}명` },
    ...(bpm ? [{ label: 'BPM', value: String(bpm) }] : []),
    ...(keySig ? [{ label: 'KEY', value: keySig }] : []),
  ];

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
          padding: '64px 80px',
        }}
      >
        {/* 배경 도트 */}
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
        {/* 장식 원 */}
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

        {/* 뱃지 */}
        <div
          style={{
            position: 'relative',
            background: '#F5FF4F',
            border: '3px solid #0A0A0A',
            borderRadius: '999px',
            padding: '8px 24px',
            fontSize: 24,
            fontWeight: 700,
            color: '#0A0A0A',
            display: 'flex',
            alignSelf: 'flex-start',
            marginBottom: 28,
            boxShadow: '4px 4px 0 #0A0A0A',
          }}
        >
          🎵 8마디 챌린지{genre ? ` · ${genre}` : ''}
        </div>

        {/* 프로젝트 제목 */}
        <div
          style={{
            position: 'relative',
            fontSize: 72,
            fontWeight: 900,
            color: '#0A0A0A',
            lineHeight: 1.05,
            marginBottom: 20,
            display: 'flex',
            maxWidth: '900px',
          }}
        >
          {title}
        </div>

        {/* 시작한 사람 */}
        <div
          style={{
            position: 'relative',
            fontSize: 30,
            color: 'rgba(10,10,10,0.6)',
            fontWeight: 600,
            marginBottom: 40,
            display: 'flex',
          }}
        >
          {emoji} {creator} 님이 시작한 릴레이
        </div>

        {/* 스탯 칩 */}
        <div style={{ position: 'relative', display: 'flex', gap: 16 }}>
          {stats.map((s) => (
            <div
              key={s.label}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                background: '#FFFFFF',
                border: '3px solid #0A0A0A',
                borderRadius: '16px',
                padding: '14px 28px',
                boxShadow: '4px 4px 0 #0A0A0A',
              }}
            >
              <div style={{ fontSize: 36, fontWeight: 900, color: '#FF3D77' }}>{s.value}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'rgba(10,10,10,0.5)' }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* 워터마크 */}
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
