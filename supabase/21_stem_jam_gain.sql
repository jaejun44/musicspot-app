-- 21_stem_jam_gain.sql — 백킹 잼 2단계: 올릴 때 정한 반주 음량 저장 (2026-11-16)
-- 반주는 음원으로 저장하지 않고 재생할 때 합성하므로, 미리듣기에서 맞춘 반주 음량을 퍼센트(0~200)로 저장해 두었다가 재생 때 곱한다.
-- NULL = 100%(기본). 반주 프로젝트(jam_slug 있음)에서만 값을 가질 수 있다.
-- 정책: 기존 stem_projects_insert_own / update_own 그대로. 여러 번 실행해도 같은 결과.
-- 되돌리기: ALTER TABLE public.stem_projects DROP COLUMN jam_gain;

ALTER TABLE public.stem_projects
  ADD COLUMN IF NOT EXISTS jam_gain smallint;

COMMENT ON COLUMN public.stem_projects.jam_gain IS '백킹 잼 반주 음량 %(0~200). NULL이면 100. jam_slug 있을 때만';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'stem_projects_jam_gain_range') THEN
    ALTER TABLE public.stem_projects ADD CONSTRAINT stem_projects_jam_gain_range
      CHECK (jam_gain IS NULL OR (jam_gain BETWEEN 0 AND 200 AND jam_slug IS NOT NULL));
  END IF;
END $$;
