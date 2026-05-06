import { Metadata } from 'next';
import FeedClient from './_components/FeedClient';

export const metadata: Metadata = {
  title: '피드 — Music Spot',
  description: '팔로우한 뮤지션의 최신 활동을 확인하세요',
  openGraph: {
    title: '피드 — Music Spot',
    description: '팔로우한 뮤지션의 최신 활동을 확인하세요',
  },
};

export default function FeedPage() {
  return <FeedClient />;
}
