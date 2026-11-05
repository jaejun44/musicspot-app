-- ============================================================
-- award_season_titles: "column reference "title_key" is ambiguous" 수정 (2026-11-06)
-- 반환형 TABLE(awarded_user_id, title_key)의 title_key가 PL/pgSQL 변수가 되어
-- INSERT ... RETURNING user_id, title_key 의 title_key(테이블 컬럼)와 충돌했다.
-- 11_security_hardening 전에는 앱이 인자 이름을 잘못 넘겨 여기까지 실행된 적이 없어 드러나지 않았음.
-- 수정: #variable_conflict use_column 한 줄만 추가. 본문·시그니처·기본값은 그대로
--      (CREATE OR REPLACE는 실행 권한을 유지 → 11번의 anon/authenticated 차단도 유지)
-- ============================================================

CREATE OR REPLACE FUNCTION public.award_season_titles(
  p_season_year integer,
  p_season_quarter integer DEFAULT NULL::integer,
  p_country text DEFAULT 'KR'::text,
  p_top_n integer DEFAULT 10
)
RETURNS TABLE(awarded_user_id uuid, title_key text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
#variable_conflict use_column
BEGIN
  RETURN QUERY
  WITH top_users AS (
    SELECT ucs.user_id
    FROM user_challenge_score ucs
    WHERE ucs.country = p_country
    ORDER BY ucs.total_score DESC
    LIMIT p_top_n
  ),
  inserted AS (
    INSERT INTO user_titles (
      user_id,
      title_key,
      season_year,
      season_quarter,
      country,
      language,
      awarded_at,
      metadata
    )
    SELECT
      tu.user_id,
      'BEST_CHALLENGER',
      p_season_year,
      p_season_quarter,
      p_country,
      CASE p_country WHEN 'JP' THEN 'ja' WHEN 'KR' THEN 'ko' ELSE 'en' END,
      now(),
      jsonb_build_object(
        'awarded_by', 'system',
        'season_year', p_season_year,
        'season_quarter', p_season_quarter
      )
    FROM top_users tu
    -- 동일 시즌 중복 부여 방지
    WHERE NOT EXISTS (
      SELECT 1 FROM user_titles ut
      WHERE ut.user_id        = tu.user_id
        AND ut.title_key      = 'BEST_CHALLENGER'
        AND ut.season_year    = p_season_year
        AND (
              (p_season_quarter IS NULL AND ut.season_quarter IS NULL)
           OR ut.season_quarter = p_season_quarter
            )
        AND ut.country = p_country
    )
    RETURNING user_id, title_key
  )
  SELECT i.user_id, i.title_key FROM inserted i;
END;
$function$;
