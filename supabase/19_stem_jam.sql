-- 19_stem_jam.sql — 백킹 잼 2단계: 8마디 프로젝트에 "어떤 반주로 쳤는지"만 저장 (2026-11-15)
-- 반주는 음원으로 저장하지 않는다. 조합(lib/jam/catalog.ts 슬러그)·BPM만 남기고 재생할 때 lib/jam/engine.ts로 다시 합성한다.
-- 반주는 stem_tracks 행이 아니므로 점수 트리거·참여자 수·pass_count에 잡히지 않는다.
-- 세 컬럼 모두 NULL이면(기존 프로젝트) 지금과 똑같이 동작한다. 여러 번 실행해도 같은 결과.
-- 정책: 기존 projects_insert / projects_update (auth.uid() = creator_id)가 그대로 적용된다 — 새 정책·권한 없음.
-- 되돌리기: ALTER TABLE public.stem_projects DROP COLUMN jam_slug, DROP COLUMN jam_bpm, DROP COLUMN jam_mutes;  (인덱스·CHECK는 함께 지워진다)

ALTER TABLE public.stem_projects
  ADD COLUMN IF NOT EXISTS jam_slug text,
  ADD COLUMN IF NOT EXISTS jam_bpm smallint,
  ADD COLUMN IF NOT EXISTS jam_mutes smallint;

COMMENT ON COLUMN public.stem_projects.jam_slug IS '백킹 잼 조합 슬러그(예: a-minor-blues). NULL = 반주 없는 일반 프로젝트';
COMMENT ON COLUMN public.stem_projects.jam_bpm IS '백킹 잼 반주 BPM(40~240). jam_slug와 함께 있거나 함께 NULL';
COMMENT ON COLUMN public.stem_projects.jam_mutes IS '녹음 때 끈 반주 파트 비트마스크: 1 드럼, 2 베이스, 4 코드(0~7). NULL·0 = 전부 켬. jam_slug 없이 단독 불가';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'stem_projects_jam_slug_format') THEN
    ALTER TABLE public.stem_projects ADD CONSTRAINT stem_projects_jam_slug_format
      CHECK (jam_slug IS NULL OR (jam_slug ~ '^[a-z0-9-]+$' AND char_length(jam_slug) BETWEEN 3 AND 64));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'stem_projects_jam_bpm_range') THEN
    ALTER TABLE public.stem_projects ADD CONSTRAINT stem_projects_jam_bpm_range
      CHECK (jam_bpm IS NULL OR jam_bpm BETWEEN 40 AND 240);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'stem_projects_jam_pair') THEN
    ALTER TABLE public.stem_projects ADD CONSTRAINT stem_projects_jam_pair
      CHECK ((jam_slug IS NULL) = (jam_bpm IS NULL));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'stem_projects_jam_mutes_range') THEN
    ALTER TABLE public.stem_projects ADD CONSTRAINT stem_projects_jam_mutes_range
      CHECK (jam_mutes IS NULL OR (jam_mutes BETWEEN 0 AND 7 AND jam_slug IS NOT NULL));
  END IF;
END $$;

-- /jam/[slug] "이 반주로 올라온 테이크" 최신 5개용
CREATE INDEX IF NOT EXISTS stem_projects_jam_slug_created_idx
  ON public.stem_projects (jam_slug, created_at DESC)
  WHERE jam_slug IS NOT NULL;
