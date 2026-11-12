import { bandRank } from '@/lib/studio-kinds';
import type { Studio } from '@/types/studio';

/** 밴드용(band_rank 0) 묶음이 끝나는 자리. 앞에 밴드용이 있고 여기서 그 외가 시작될 때만 */
export function isBandBoundary(list: Pick<Studio, 'band_rank'>[], i: number): boolean {
  return i > 0 && bandRank(list[i - 1]) === 0 && bandRank(list[i]) > 0;
}

/** 목록 구분선 1줄 — 그리드 안에서 한 줄을 다 쓴다 */
export default function BandDivider() {
  return (
    <div className="col-span-full flex items-center gap-3 py-1" role="separator" style={{ fontFamily: 'Pretendard, sans-serif' }}>
      <span className="h-[2px] flex-1 bg-[#0A0A0A]/20" />
      <span className="shrink-0 text-[13px] font-bold text-[#0A0A0A]/60 break-keep text-center">
        아래는 개인 연습·보컬·댄스용 연습실이에요
      </span>
      <span className="h-[2px] flex-1 bg-[#0A0A0A]/20" />
    </div>
  );
}
