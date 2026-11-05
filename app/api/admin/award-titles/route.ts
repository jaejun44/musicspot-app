import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isAdmin } from '@/lib/admin-auth';

export async function POST(req: NextRequest) {
  if (!isAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { year, quarter, country = 'KR', top_n = 10 } = body as {
    year?: number;
    quarter?: number;
    country?: string;
    top_n?: number;
  };

  if (!year || !quarter || quarter < 1 || quarter > 4) {
    return NextResponse.json({ error: '연도와 분기(1~4)를 올바르게 입력해주세요.' }, { status: 400 });
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  // 인자 이름은 DB 함수 정의(p_season_year, p_season_quarter)와 같아야 한다 — 다르면 PostgREST가 함수를 못 찾는다(404)
  const { data, error } = await supabaseAdmin.rpc('award_season_titles', {
    p_season_year: year,
    p_season_quarter: quarter,
    p_country: country,
    p_top_n: top_n,
  });

  if (error) {
    console.error('[award-titles] rpc 실패', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 함수는 새로 부여된 (awarded_user_id, title_key) 행을 돌려준다 → 관리자 화면은 인원 수를 보여 준다
  return NextResponse.json({ ok: true, awarded: Array.isArray(data) ? data.length : 0 });
}
