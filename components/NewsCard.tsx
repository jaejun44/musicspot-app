import Link from 'next/link';
import Image from 'next/image';
import { formatNewsDate, newsImageUrl, type NewsSummary } from '@/lib/news';

const FONT = { fontFamily: 'Pretendard, sans-serif' };

/** 뉴스 카드 한 장: 첫 장 이미지 · 날짜 · 제목. 목록 카드라 기울이지 않는다(DESIGN) */
export default function NewsCard({ post, onClick }: { post: NewsSummary; onClick?: () => void }) {
  const cover = post.images[0];
  return (
    <Link
      href={`/news/${post.slug}`}
      onClick={onClick}
      className="group block bg-white rounded-[20px] border-[3px] border-[#0A0A0A] overflow-hidden"
      style={{ boxShadow: '4px 4px 0 #0A0A0A', ...FONT }}
    >
      {cover && (
        <div className="relative aspect-[4/5] border-b-[3px] border-[#0A0A0A] bg-[#FFF8F0]">
          <Image
            src={newsImageUrl(cover)}
            alt={post.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 300px"
            className="object-cover"
          />
        </div>
      )}
      <div className="px-3 py-3">
        <p className="text-[12px] font-bold text-[#0A0A0A]/50">{formatNewsDate(post.published_on)}</p>
        <p className="mt-1 text-[14px] font-bold text-[#0A0A0A] leading-snug line-clamp-2 break-keep group-hover:text-[#FF3D77]">
          {post.title}
        </p>
      </div>
    </Link>
  );
}
