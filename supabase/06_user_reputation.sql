-- 06_user_reputation.sql
-- 음악인 명성 집계 RPC: 프로필(/u/[id]) GitHub식 명성카드용
-- 실행: Supabase SQL Editor에서 직접 실행 (빌드와 무관)
--
-- 목적: 클라이언트 무거운 집계 없이, 호출 1회로 유저별 핵심 명성 지표 4개를 집계.
--
-- 반환: 단일 행 (모두 bigint)
--   thrown_count  = 던짐   : 유저가 던진 트랙(마디) 수        (stem_tracks where user_id)
--   passed_count  = 이어짐 : "내 던지기가 남에게 이어진 정도"
--                            = 내가 참여한 프로젝트에 달린 '남의' 후속 트랙 수
--   mutual_total  = 추천   : user_mutual_responses 의 response_count 합 (양쪽 당사자)
--   title_count   = 명예   : user_titles 보유 칭호 수
--
-- 타입 주의:
--   stem_tracks.user_id        = uuid  → p_user_id 그대로 비교
--   user_titles.user_id        = text  → p_user_id::text 캐스팅
--   user_mutual_responses.*_id = text  → p_user_id::text 캐스팅
--
-- 동시성/성능: 모두 읽기 전용(STABLE). user_id 인덱스 가정. 프로필 로딩 부담 최소.

CREATE OR REPLACE FUNCTION public.user_reputation(p_user_id uuid)
RETURNS TABLE (
  thrown_count bigint,
  passed_count bigint,
  mutual_total bigint,
  title_count  bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    -- 던짐: 내가 올린 트랙 수
    (SELECT count(*) FROM public.stem_tracks t WHERE t.user_id = p_user_id),

    -- 이어짐: 내가 참여한 프로젝트에서 '다른 사람'이 올린 후속 트랙 수
    --   (others.user_id IS DISTINCT FROM p_user_id → 익명 트랙도 '남의 이어짐'으로 집계)
    (SELECT count(*)
       FROM public.stem_tracks others
      WHERE others.user_id IS DISTINCT FROM p_user_id
        AND others.project_id IN (
          SELECT mine.project_id
            FROM public.stem_tracks mine
           WHERE mine.user_id = p_user_id
        )),

    -- 추천(케미) 합: 내가 한쪽 당사자인 상호 응답 횟수 총합
    (SELECT COALESCE(sum(response_count), 0)
       FROM public.user_mutual_responses m
      WHERE m.user_a_id = p_user_id::text
         OR m.user_b_id = p_user_id::text),

    -- 명예: 보유 칭호 수
    (SELECT count(*) FROM public.user_titles ut WHERE ut.user_id = p_user_id::text);
$$;

-- 실행 권한: 비로그인(anon)도 프로필 열람 시 명성 조회 가능
GRANT EXECUTE ON FUNCTION public.user_reputation(uuid) TO anon, authenticated;

-- ──────────────────────────────────────────────────────────────
-- 테스트 쿼리 (수동 검증용)
-- ──────────────────────────────────────────────────────────────
-- 1) 트랙을 가진 유저 id 1개 확인
--    SELECT user_id, count(*) FROM public.stem_tracks
--    WHERE user_id IS NOT NULL GROUP BY user_id ORDER BY 2 DESC LIMIT 1;
--
-- 2) 해당 유저 명성 집계 (<UID>를 위 user_id로 치환)
--    SELECT * FROM public.user_reputation('<UID>');
--
-- 3) 활동 없는 유저 → 모두 0 반환 확인
--    SELECT * FROM public.user_reputation('00000000-0000-0000-0000-000000000000');
--
-- 4) 던짐 수동 대조 (RPC thrown_count 와 일치해야 함)
--    SELECT count(*) FROM public.stem_tracks WHERE user_id = '<UID>';
