import { Suspense } from 'react';
import { Metadata } from 'next';
import { supabase } from '@/lib/supabase';
import RoomDetailClient from './_components/RoomDetailClient';

interface Props {
  params: { id: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { data } = await supabase
    .from('studios')
    .select('name, address, price_info, price_per_hour, photos')
    .eq('id', params.id)
    .eq('is_published', true)
    .single();

  if (!data) {
    return {
      title: '연습실 | Music Spot',
      description: '뮤지션을 위한 합주/연습실 플랫폼',
    };
  }

  const title = `${data.name} | Music Spot`;
  const price = data.price_per_hour
    ? `₩${data.price_per_hour.toLocaleString()}/h`
    : data.price_info ?? '';
  const description = [data.address, price].filter(Boolean).join(' · ');
  const imageUrl = data.photos?.[0] ?? `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/hero-bg.png`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: imageUrl }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default function RoomDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FFF8F0] flex items-center justify-center">
          <div className="w-10 h-10 rounded-full border-[3px] border-[#FF3D77] border-t-transparent animate-spin" />
        </div>
      }
    >
      <RoomDetailClient />
    </Suspense>
  );
}
