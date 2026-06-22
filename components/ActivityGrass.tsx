'use client';

import Link from 'next/link';

// user_activity_calendar(p_user_id, p_days) RPC 반환 행
export interface ActivityDay {
  day: string; // 'YYYY-MM-DD'
  cnt: number; // 해당 날짜에 던진 마디 수
}

interface ActivityGrassProps {
  data: ActivityDay[];
  days?: number;   // 표시할 일수 (기본 119 = 17주)
  isSelf?: boolean;
}

// Date → 'YYYY-MM-DD' (로컬 기준)
function toKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// cnt → 잔디 색. 0과 1이 명확히 구분되도록 회색 vs 핑크 (접근성)
function cellColor(cnt: number): string {
  if (cnt <= 0) return '#0A0A0A14'; // 연한 회색 (8%)
  if (cnt <= 2) return '#FF9DBE';   // 연핑크
  return '#FF3D77';                  // 진한 comic-pink
}

export default function ActivityGrass({ data, days = 119, isSelf = false }: ActivityGrassProps) {
  // 날짜 → cnt 맵
  const cntByDay = new Map<string, number>();
  let total = 0;
  for (const row of data) {
    const c = Number(row.cnt) || 0;
    cntByDay.set(row.day, c);
    total += c;
  }

  // 최근 `days`일의 셀 + 주(열) 정렬용 선행 빈칸
  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - (days - 1));

  const leading = start.getDay(); // 첫 열을 요일에 맞추기 위한 빈칸 수
  const cells: ({ key: string; cnt: number } | null)[] = [];
  for (let i = 0; i < leading; i++) cells.push(null);
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = toKey(d);
    cells.push({ key, cnt: cntByDay.get(key) ?? 0 });
  }

  const isEmpty = total === 0;

  return (
    <div>
      {/* 안내 문구 */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-[12px] font-bold text-[#0A0A0A]/60" style={{ fontFamily: 'Pretendard, sans-serif' }}>
          {isEmpty ? '여기에 매일 던진 마디가 잔디처럼 쌓여요' : `🌱 최근 던지기 ${total}`}
        </p>
        {isEmpty && isSelf && (
          <Link
            href="/stems"
            className="text-[11px] font-bold text-[#FF3D77] shrink-0"
            style={{ fontFamily: 'Pretendard, sans-serif' }}
          >
            오늘 첫 칸을 채워보세요 →
          </Link>
        )}
      </div>

      {/* 잔디 그리드 (가로 스크롤) */}
      <div className="overflow-x-auto -mx-1 px-1" style={{ opacity: isEmpty ? 0.55 : 1 }}>
        <div
          className="grid grid-flow-col gap-[3px] w-max"
          style={{ gridTemplateRows: 'repeat(7, 11px)' }}
        >
          {cells.map((cell, i) =>
            cell === null ? (
              <div key={`empty-${i}`} className="w-[11px] h-[11px]" />
            ) : (
              <div
                key={cell.key}
                title={`${cell.key} · ${cell.cnt}회`}
                className="w-[11px] h-[11px] rounded-[3px] border border-[#0A0A0A]/10"
                style={{ backgroundColor: cellColor(cell.cnt) }}
              />
            ),
          )}
        </div>
      </div>
    </div>
  );
}
