-- 05_increment_counts.sql
-- 8마디 바이럴 루프: share_count / pass_count 원자적 증가 RPC
-- 실행: Supabase SQL Editor에서 직접 실행 (빌드와 무관)
--
-- 배경: 공유(handleShare) / 트랙 업로드(pass) 시 카운트가 코드 어디서도 증가하지 않아
--       generateStaticParams의 share_count desc 정렬과 OG 스탯이 항상 0 기준으로 죽어 있었음.
--
-- 동시성: UPDATE ... SET x = x + 1 은 행 단위 락으로 원자적이라 동시 호출에도 유실 없음.
-- 권한: anon(비로그인 공유 가능) + authenticated 모두 EXECUTE 허용.
--       SECURITY DEFINER로 두어 RLS와 무관하게 카운트만 증가 (다른 컬럼은 건드리지 않음).

-- 사전 확인: 컬럼 존재 여부 (없으면 추가)
ALTER TABLE public.stem_projects
  ADD COLUMN IF NOT EXISTS share_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pass_count  integer NOT NULL DEFAULT 0;

-- 공유 카운트 +1
CREATE OR REPLACE FUNCTION public.increment_share_count(p_project_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.stem_projects
  SET share_count = share_count + 1
  WHERE id = p_project_id;
$$;

-- 패스(트랙 업로드) 카운트 +1
CREATE OR REPLACE FUNCTION public.increment_pass_count(p_project_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.stem_projects
  SET pass_count = pass_count + 1
  WHERE id = p_project_id;
$$;

-- 실행 권한
GRANT EXECUTE ON FUNCTION public.increment_share_count(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_pass_count(uuid)  TO anon, authenticated;

-- ──────────────────────────────────────────────────────────────
-- 테스트 쿼리 (수동 검증용, 실제 운영 데이터에는 주의)
-- ──────────────────────────────────────────────────────────────
-- 1) 임의 프로젝트 1개 id 확인
--    SELECT id, title, share_count, pass_count FROM public.stem_projects LIMIT 1;
--
-- 2) RPC 호출 후 증가 확인 (<ID>를 위 id로 치환)
--    SELECT public.increment_share_count('<ID>');
--    SELECT public.increment_pass_count('<ID>');
--    SELECT id, share_count, pass_count FROM public.stem_projects WHERE id = '<ID>';
--
-- 3) 정렬이 살아나는지 확인
--    SELECT id, title, share_count FROM public.stem_projects
--    ORDER BY share_count DESC LIMIT 10;
