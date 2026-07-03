-- ============================================================
-- user_mutual_responses RLS 활성화 (유일하게 무방비였던 테이블)
-- 양방향 매칭 집계 테이블. 컬럼: user_a_id, user_b_id, response_count, country, ...
-- 코드(BandMatchingClient)는 SELECT 만 수행. 쓰기는 서버/RPC(service_role)가 처리.
--
-- 정책:
--   - SELECT: 본인이 당사자(a 또는 b)인 행만.
--   - INSERT/UPDATE/DELETE: 클라이언트 정책 없음 → anon/authenticated 쓰기 차단.
--     집계 쓰기는 service_role 이 RLS 를 우회하므로 정상 동작.
-- 여러 번 실행해도 안전(idempotent).
-- ============================================================

ALTER TABLE public.user_mutual_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS umr_select_own ON public.user_mutual_responses;
CREATE POLICY umr_select_own ON public.user_mutual_responses
  FOR SELECT TO authenticated
  USING (auth.uid() = user_a_id OR auth.uid() = user_b_id);

-- 검증: 아래가 true 로 나와야 함.
SELECT relrowsecurity AS rls_enabled
FROM pg_class
WHERE oid = 'public.user_mutual_responses'::regclass;
