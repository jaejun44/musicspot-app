import { ImageResponse } from 'next/og';
import { supabase } from '@/lib/supabase';

export const runtime = 'edge';
export const alt = '커뮤니티 | Music Spot';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

interface Props {
  params: { id: string };
}

const CATEGORY_LABELS: Record<string, string> = {
  'free': '자유',
  'recruit': '멤버 모집',
  'review': '연습실 리뷰',
  'gear': '장비',
  'cover': '커버',
  'collab': '협업',
};

export default async function OGImage({ params }: Props) {
  const { data } = await supabase
    .from('posts')
    .select('title, author_name, author_emoji, category')
    .eq('id', params.id)
    .maybeSingle();

  const title = data?.title ?? '커뮤니티 게시물';
  const authorName = data?.author_name ?? '뮤지션';
  const authorEmoji = data?.author_emoji ?? '🎸';
  const categoryLabel = CATEGORY_LABELS[data?.category ?? ''] ?? '커뮤니티';

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

        {/* 좌측 장식 바 */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: '24px',
            height: '100%',
            background: '#FF3D77',
          }}
        />

        {/* 컨텐츠 */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
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
            {categoryLabel}
          </div>

          {/* 게시물 제목 */}
          <div
            style={{
              fontSize: title.length > 30 ? 56 : 68,
              fontWeight: 900,
              color: '#0A0A0A',
              lineHeight: 1.2,
              marginBottom: 48,
              maxWidth: '960px',
            }}
          >
            {title.length > 50 ? title.slice(0, 50) + '…' : title}
          </div>

          {/* 작성자 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
            }}
          >
            <div
              style={{
                background: '#0A0A0A',
                border: '3px solid #0A0A0A',
                borderRadius: '50%',
                width: '56px',
                height: '56px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 32,
              }}
            >
              {authorEmoji}
            </div>
            <div
              style={{
                fontSize: 32,
                fontWeight: 700,
                color: 'rgba(10,10,10,0.6)',
              }}
            >
              {authorName}
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
