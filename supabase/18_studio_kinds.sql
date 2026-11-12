-- ============================================================
-- 연습실 종류 구분: 밴드용 우선, 댄스 전용은 뒤로 (2026-11-12)
-- 값은 scripts/studio_rules.py classify_kinds·band_rank 규칙으로 채운다(scripts/update_studio_kinds.py — 미리보기 → 승인 → 백업 → 반영).
--   kinds     : 'band' | 'drum' | 'piano' | 'vocal' | 'recording' | 'dance' 의 배열
--   band_rank : 0 = 밴드 합주 가능(band 또는 drum) / 1 = 그 외(피아노·보컬·녹음 등) / 2 = 댄스 전용
-- 앱: 목록 기본 정렬이 band_rank 오름차순 먼저, "밴드 합주" 칩 = band_rank 0, band_rank 2 상세는 noindex·사이트맵 제외.
-- 연습실을 지우거나 비공개로 바꾸지 않는다(is_published 그대로).
-- 되돌리기: 앱 쪽 정렬·noindex 조건만 빼면 된다(docs/PHASES.md 2026-11-12 항목). 컬럼은 남겨도 무해.
-- 여러 번 실행해도 안전(idempotent). DROP 없음. 정책·권한 변경 없음(기존 studios 읽기 정책 그대로 새 컬럼도 읽힘).
-- nearby_studios RPC(04)는 앱에서 부르지 않아 고치지 않는다(반환형 SETOF studios라 새 컬럼도 함께 나옴).
-- ============================================================

ALTER TABLE public.studios ADD COLUMN IF NOT EXISTS kinds text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.studios ADD COLUMN IF NOT EXISTS band_rank smallint NOT NULL DEFAULT 1;

ALTER TABLE public.studios DROP CONSTRAINT IF EXISTS studios_band_rank_check;
ALTER TABLE public.studios ADD CONSTRAINT studios_band_rank_check CHECK (band_rank BETWEEN 0 AND 2);
ALTER TABLE public.studios DROP CONSTRAINT IF EXISTS studios_kinds_check;
ALTER TABLE public.studios ADD CONSTRAINT studios_kinds_check
  CHECK (kinds <@ ARRAY['band', 'drum', 'piano', 'vocal', 'recording', 'dance']::text[]);

CREATE INDEX IF NOT EXISTS studios_band_rank_idx ON public.studios (band_rank) WHERE is_published;
