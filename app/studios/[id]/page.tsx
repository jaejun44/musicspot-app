import type { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';
import StudioDetail from './StudioDetail';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function getStudio(id: string) {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data } = await supabase
    .from('studios')
    .select('name, address, price_info, photos')
    .eq('id', id)
    .single();
  return data;
}

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const studio = await getStudio(params.id);
  if (!studio) {
    return { title: '연습실 | Music Spot' };
  }

  const title = `${studio.name} | Music Spot`;
  const description = [studio.address, studio.price_info]
    .filter(Boolean)
    .join(' | ');

  return {
    title,
    description,
    openGraph: {
      title: studio.name,
      description: description || '연습실 정보 보기',
      images: studio.photos?.[0] ? [studio.photos[0]] : [],
      url: `https://musicspotapp.vercel.app/studios/${params.id}`,
    },
  };
}

export default function Page() {
  return <StudioDetail />;
}
