-- ============================================================
-- 위치기반 "내 주변 연습실" 서버 정렬 RPC
-- 클라이언트가 전체 행을 다운로드해 정렬하던 것을 서버로 위임.
-- earthdistance(+cube) 확장으로 좌표 거리 계산 + 인덱스 가능.
--
-- 반환: 정렬·반경필터된 studios 행(SETOF studios).
--   거리 표시는 클라이언트가 보유한 getDistanceKm 로 처리(중복 계산 비용 미미).
--   → 타입 안전: 프론트가 기존 Studio 타입 그대로 사용 가능.
--
-- 실행 순서:
--   1) 확장 활성화 (1회)
--   2) 인덱스 생성
--   3) 함수 생성
--   4) 맨 아래 테스트 쿼리로 동작 확인
-- 여러 번 실행해도 안전(CREATE OR REPLACE / IF NOT EXISTS).
-- ============================================================

-- [1] 거리 계산용 확장
CREATE EXTENSION IF NOT EXISTS cube;
CREATE EXTENSION IF NOT EXISTS earthdistance;

-- [2] 좌표 인덱스 (ll_to_earth 기반 GiST). 데이터 커지면 거리 정렬을 가속.
CREATE INDEX IF NOT EXISTS idx_studios_earth
  ON public.studios
  USING gist (ll_to_earth(lat, lng))
  WHERE is_published = true AND lat IS NOT NULL AND lng IS NOT NULL;

-- [3] 내 주변 연습실 함수
--   - p_lat/p_lng: 사용자 좌표
--   - p_radius_km: 반경(기본 3km)
--   - p_limit/p_offset: 페이지네이션
--   정렬: 거리 오름차순 → 같은 거리대면 data_quality_score 내림차순
CREATE OR REPLACE FUNCTION public.nearby_studios(
  p_lat double precision,
  p_lng double precision,
  p_radius_km double precision DEFAULT 3,
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0
)
RETURNS SETOF public.studios
LANGUAGE sql
STABLE
AS $$
  SELECT s.*
  FROM public.studios s
  WHERE s.is_published = true
    AND s.lat IS NOT NULL
    AND s.lng IS NOT NULL
    AND (
      s.category ILIKE '%악기%' OR s.category ILIKE '%보컬%' OR
      s.category ILIKE '%녹음%' OR s.category ILIKE '%합주%' OR
      s.category ILIKE '%개인연습실%'
    )
    AND earth_box(ll_to_earth(p_lat, p_lng), p_radius_km * 1000) @> ll_to_earth(s.lat, s.lng)
    AND earth_distance(ll_to_earth(p_lat, p_lng), ll_to_earth(s.lat, s.lng)) <= p_radius_km * 1000
  ORDER BY
    earth_distance(ll_to_earth(p_lat, p_lng), ll_to_earth(s.lat, s.lng)) ASC,
    s.data_quality_score DESC NULLS LAST
  LIMIT p_limit OFFSET p_offset;
$$;

-- anon/authenticated 가 RPC 호출 가능하도록
GRANT EXECUTE ON FUNCTION public.nearby_studios(double precision, double precision, double precision, integer, integer)
  TO anon, authenticated;

-- ============================================================
-- 테스트: 서울 시청 좌표 기준 3km 내 10개 (가까운 순)
--   SELECT id, name, region FROM public.nearby_studios(37.5665, 126.978, 3, 10, 0);
-- 반경 안에 데이터 있으면 가까운 순으로 나와야 정상.
-- ============================================================
