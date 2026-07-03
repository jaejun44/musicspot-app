-- ============================================================
-- Music Spot RLS 진단 (읽기 전용 — 데이터/정책 변경 없음)
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 실행.
-- 결과를 보고 02_rls_policies.sql 적용 여부를 판단한다.
-- ============================================================

-- [1] 클라이언트(anon)가 직접 접근하는 테이블의 RLS 활성화 여부
--     rls_enabled = false 인 테이블이 가장 위험하다.
SELECT
  c.relname            AS table_name,
  c.relrowsecurity     AS rls_enabled,
  c.relforcerowsecurity AS rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relname IN (
    'studios','studio_reviews','studio_reports','studio_requests',
    'posts','post_likes','post_comments',
    'bookings','feedbacks','page_views',
    'direct_messages','notifications',
    'user_profiles','user_follows','user_titles','user_mutual_responses',
    'bands','band_members','band_schedules',
    'stem_projects','stem_tracks','stems',
    'partner_studios'
  )
ORDER BY c.relrowsecurity ASC, c.relname;  -- RLS 꺼진 것부터 위로

-- [2] 각 테이블에 걸린 정책 목록 (정책이 0개면 RLS가 켜져 있어도 기본 거부됨)
SELECT
  tablename,
  policyname,
  cmd            AS command,   -- SELECT / INSERT / UPDATE / DELETE / ALL
  roles,
  qual           AS using_expr,       -- 읽기/수정 조건
  with_check     AS with_check_expr   -- insert/update 시 강제 조건
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd;

-- [3] 위험 신호 요약: RLS 켜졌지만 정책이 하나도 없는 테이블
--     (전부 거부되어 기능이 깨졌거나, 곧 깨질 수 있음)
SELECT c.relname AS table_name
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity = true
  AND NOT EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.schemaname = 'public' AND p.tablename = c.relname
  )
ORDER BY c.relname;
