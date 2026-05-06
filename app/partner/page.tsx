import { Metadata } from 'next';
import PartnerClient from './_components/PartnerClient';

export const metadata: Metadata = {
  title: '업체 대시보드 — Music Spot',
  description: 'Music Spot 파트너 업체 관리 대시보드',
};

export default function PartnerPage() {
  return <PartnerClient />;
}
