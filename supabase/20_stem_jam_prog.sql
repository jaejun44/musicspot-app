-- 20_stem_jam_prog.sql — 백킹 잼 2단계: 녹음 때 고른 코드 진행 id 저장 (2026-11-16)
-- 조합(jam_slug)마다 진행이 2~3개라 slug만으로는 반주를 다시 만들 수 없다. lib/jam/catalog.ts 진행 id(예: 'I-V-vi-IV', 'im7-IV7')를 그대로 저장.
-- 진행 id는 한번 정하면 바꾸지 않는다(tests/jam-catalog.cjs에 목록 고정). 없애야 하면 지우지 않고 "새 녹음에서 숨김".
-- 앱이 저장된 id를 카탈로그에서 못 찾으면 반주 없이 테이크만 재생한다.
-- jam_slug가 있으면 jam_prog도 있어야 하고(19는 아직 반주 프로젝트 0개라 기존 행 영향 없음), 단독으로는 불가.
-- 정책: 기존 stem_projects_insert_own / update_own 그대로. 여러 번 실행해도 같은 결과.
-- 되돌리기: ALTER TABLE public.stem_projects DROP COLUMN jam_prog;

ALTER TABLE public.stem_projects
  ADD COLUMN IF NOT EXISTS jam_prog text;

COMMENT ON COLUMN public.stem_projects.jam_prog IS '백킹 잼 코드 진행 id(lib/jam/catalog.ts, 바뀌지 않음). jam_slug와 함께 있거나 함께 NULL';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'stem_projects_jam_prog_format') THEN
    ALTER TABLE public.stem_projects ADD CONSTRAINT stem_projects_jam_prog_format
      CHECK (jam_prog IS NULL OR jam_prog ~ '^[A-Za-z0-9-]{1,32}$');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'stem_projects_jam_prog_pair') THEN
    ALTER TABLE public.stem_projects ADD CONSTRAINT stem_projects_jam_prog_pair
      CHECK ((jam_slug IS NULL) = (jam_prog IS NULL));
  END IF;
END $$;
