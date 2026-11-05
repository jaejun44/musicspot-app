-- ============================================================
-- 보안 점검 후속 (2026-11-06, 사용자 승인)
-- 1) award_season_titles: anon 키로 /rest/v1/rpc 직접 호출 시 누구나 명예 칭호 발급 가능했음.
--    호출처는 app/api/admin/award-titles(서비스 키)뿐 → 공개 실행 권한 제거
-- 2) reset_weekly_challenge_scores: 누구나 전체 weekly_score를 0으로 만들 수 있었음.
--    앱·크론 호출처 없음 → 공개 실행 권한 제거
-- 3) user_events: 로그인한 누구나 전 사용자 행동 로그(user_id·경로·anon_id·UA)를 읽을 수 있었음.
--    앱은 INSERT만, 관리자 KPI는 서비스 키 → 읽기 정책 제거(INSERT 정책은 유지)
-- service_role(서버 전용)은 영향 없음. 여러 번 실행해도 안전.
-- ============================================================

REVOKE EXECUTE ON FUNCTION public.award_season_titles(integer, integer, text, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reset_weekly_challenge_scores() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.award_season_titles(integer, integer, text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.reset_weekly_challenge_scores() TO service_role;

DROP POLICY IF EXISTS "authenticated can read events" ON public.user_events;
