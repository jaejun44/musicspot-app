import type { Studio } from '@/types/studio';

/** 카드·상세에 쓰는 요금 한 줄. 시간당 가격 → 업체 원문(price_info) → '가격 문의' 순 */
export function studioPriceLabel(studio: Pick<Studio, 'price_per_hour' | 'price_info'>): string {
  return studio.price_per_hour
    ? `₩${studio.price_per_hour.toLocaleString()}/h`
    : studio.price_info ?? '가격 문의';
}

/** 시간당 요금(원). price_per_hour가 비어 있으면 업체 원문의 '시간당 N원' 앞머리를 읽는다(서울 음악 연습실 84%가 이 형식) */
export function hourlyPrice(studio: Pick<Studio, 'price_per_hour' | 'price_info'>): number | null {
  if (studio.price_per_hour && studio.price_per_hour > 0) return studio.price_per_hour;
  const m = studio.price_info?.match(/^시간당 ([\d,]+)원/);
  if (!m) return null;
  const won = Number(m[1].replace(/,/g, ''));
  return won > 0 ? won : null;
}
