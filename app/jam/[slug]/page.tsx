import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Navigation from '@/components/Navigation';
import SiteFooter from '@/components/SiteFooter';
import { COMBOS, comboMeta, parseSlug } from '@/lib/jam/catalog';
import JamClient from '../_components/JamClient';

interface Props {
  params: { slug: string };
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.musicspotfest.com';

// 키×스타일 조합만(그 외 404). BPM·진행은 화면 조절값이라 주소를 만들지 않는다
export const dynamicParams = false;

export function generateStaticParams() {
  return COMBOS.map((c) => ({ slug: c.slug }));
}

export function generateMetadata({ params }: Props): Metadata {
  const combo = parseSlug(params.slug);
  if (!combo) return {};
  const { title, description } = comboMeta(combo);
  const url = `${SITE_URL}/jam/${combo.slug}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: 'Music Spot', type: 'website', locale: 'ko_KR' },
    twitter: { card: 'summary', title, description },
  };
}

export default function JamComboPage({ params }: Props) {
  if (!parseSlug(params.slug)) notFound();
  return (
    <>
      <Navigation />
      <JamClient slug={params.slug} />
      <SiteFooter />
    </>
  );
}
