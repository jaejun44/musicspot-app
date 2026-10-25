import type { Studio } from '@/types/studio';

/** 카드·상세에 쓰는 요금 한 줄. 시간당 가격 → 업체 원문(price_info) → '가격 문의' 순 */
export function studioPriceLabel(studio: Pick<Studio, 'price_per_hour' | 'price_info'>): string {
  return studio.price_per_hour
    ? `₩${studio.price_per_hour.toLocaleString()}/h`
    : studio.price_info ?? '가격 문의';
}
