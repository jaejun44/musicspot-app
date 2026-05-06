import { Suspense } from 'react';
import type { Metadata } from 'next';
import StemsClient from './_components/StemsClient';

export const metadata: Metadata = {
  title: '8마디 주고받기 | Music Spot',
  description: '뮤지션들이 8마디씩 릴레이로 만들어가는 음악 프로젝트',
};

export default function StemsPage() {
  return (
    <Suspense>
      <StemsClient />
    </Suspense>
  );
}
