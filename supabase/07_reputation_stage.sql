-- 07_reputation_stage.sql
-- 명성 무대 RPC: 잔디(기여 그래프) + 이번 주 리더보드
-- ⚠️ 이미 Supabase에 생성·검증 완료. 이 파일은 형상관리(버전 기록)용.
--    재실행해도 안전(CREATE OR REPLACE).
--
-- 관련 컬럼은 모두 uuid (stem_tracks.user_id / user_profiles.user_id) → 캐스팅 불필요.
-- 모두 읽기 전용(STABLE), SECURITY DEFINER, anon/authenticated EXECUTE.

-- ──────────────────────────────────────────────────────────────
-- 1) 잔디: 유저별 날짜별 던진 마디 수 (최근 p_days일)
--    반환: (day date, cnt bigint) — 활동 있는 날짜만. 빈 날짜는 프론트에서 0으로 채움.
--    프론트: components/ActivityGrass.tsx (UserProfileClient에서 호출)
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.user_activity_calendar(p_user_id uuid, p_days int DEFAULT 119)
RETURNS TABLE (day date, cnt bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.created_at::date AS day, count(*) AS cnt
  FROM public.stem_tracks t
  WHERE t.user_id = p_user_id
    AND t.created_at >= (now() - make_interval(days => p_days))
  GROUP BY t.created_at::date
  ORDER BY day;
$$;

-- ──────────────────────────────────────────────────────────────
-- 2) 리더보드: 기간 내 많이 던진 TOP N
--    반환: (user_id uuid, thrown bigint, display_name text, avatar_url text)
--    프론트: components/LeaderboardThrowers.tsx (/stems 상단)
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.leaderboard_throwers(p_since_days int DEFAULT 7, p_limit int DEFAULT 10)
RETURNS TABLE (user_id uuid, thrown bigint, display_name text, avatar_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.user_id,
         count(*) AS thrown,
         p.display_name,
         p.avatar_url
  FROM public.stem_tracks t
  LEFT JOIN public.user_profiles p ON p.user_id = t.user_id
  WHERE t.user_id IS NOT NULL
    AND t.created_at >= (now() - make_interval(days => p_since_days))
  GROUP BY t.user_id, p.display_name, p.avatar_url
  ORDER BY thrown DESC
  LIMIT p_limit;
$$;

-- 실행 권한: 비로그인(anon)도 프로필·리더보드 열람 가능
GRANT EXECUTE ON FUNCTION public.user_activity_calendar(uuid, int) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.leaderboard_throwers(int, int)    TO anon, authenticated;

-- ──────────────────────────────────────────────────────────────
-- 테스트 쿼리 (수동 검증용)
-- ──────────────────────────────────────────────────────────────
-- 1) 잔디 (<UID>를 트랙 보유 유저 id로 치환)
--    SELECT * FROM public.user_activity_calendar('<UID>', 119);
--
-- 2) 이번 주 리더보드
--    SELECT * FROM public.leaderboard_throwers(7, 10);
--
-- 3) 전체 기간 리더보드(기간 토글 대비)
--    SELECT * FROM public.leaderboard_throwers(36500, 10);
