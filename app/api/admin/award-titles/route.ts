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

  const { data, error } = await supabaseAdmin.rpc('award_season_titles', {
    p_year: year,
    p_quarter: quarter,
    p_country: country,
    p_top_n: top_n,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, awarded: data });
}
