-- ============================================================
-- 밴드씬 뉴스 /news — 인스타 카드뉴스 웹 보관 (2026-11-12)
-- 원본: ~/Desktop/musicSpot_cardnews/_active/daily/<날짜>/slot-*/ (읽기만)
-- 넣는 쪽: scripts/import_cardnews.py (service key, source_key 기준 upsert)
--
-- 정책:
--   - RLS on. 읽기 정책 1개 = is_published = true 인 행만 anon·authenticated SELECT
--   - 쓰기 정책 없음 + INSERT/UPDATE/DELETE 권한 REVOKE → anon·authenticated는 쓰기 불가. service_role(RLS 우회)만 쓴다
--   - Storage 공개 버킷 news: 공개 URL로 이미지 읽기만. storage.objects 정책을 만들지 않으므로
--     anon·authenticated는 업로드·삭제·목록 불가(service_role만). WebP만, 장당 2MB 이하
-- 여러 번 실행해도 안전(idempotent). 테이블·행 DROP 없음(읽기 정책만 다시 만듦).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.news_posts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND char_length(slug) <= 120),
  title         text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 200),
  body          text NOT NULL DEFAULT '',
  published_on  date NOT NULL,                                   -- 카드뉴스 슬롯 날짜(KST)
  topic         text,
  images        text[] NOT NULL DEFAULT '{}',                    -- 저장소 경로 <날짜>/<슬롯>/01.webp
  image_count   integer NOT NULL DEFAULT 0 CHECK (image_count >= 0),
  sources       jsonb NOT NULL DEFAULT '[]'::jsonb,              -- [{url, label?}]
  photo_credit  text NOT NULL CHECK (char_length(btrim(photo_credit)) > 0), -- 저작자 표기(원문 그대로). 없으면 가져오지 않음
  image_source_kind text NOT NULL CHECK (image_source_kind IN ('cc', 'original', 'official')), -- 아래 ALTER 참고
  hashtags      text[] NOT NULL DEFAULT '{}',
  instagram_url text NOT NULL CHECK (instagram_url ~ '^https://www\.instagram\.com/'),
  source_key    text NOT NULL UNIQUE,                            -- <날짜>/<슬롯> — upsert 기준
  is_published  boolean NOT NULL DEFAULT true,
  country       text NOT NULL DEFAULT 'KR',
  region        text,
  language      text NOT NULL DEFAULT 'ko',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- 이미지 출처 분류(2026-11-12 추가, 사용자 요청). 이미 만든 DB에도 붙도록 ADD COLUMN IF NOT EXISTS
--   cc = Wikimedia·CC·퍼블릭 도메인 사진 / original = MUSIC SPOT 자체 그래픽 / official = 레이블·밴드 공식 자료·재킷·포스터·보도 사진
--   섞여 있으면 official(scripts/cardnews_parse.py classify_credit). 나중에 official만 내릴 때:
--   UPDATE public.news_posts SET is_published = false WHERE image_source_kind = 'official';
--   운영은 2026-11-12 이미 1행이 있어 "빈 값 허용으로 추가 → 그 행을 original로 채움 → NOT NULL·CHECK" 순서로 적용(사용자 승인)
ALTER TABLE public.news_posts ADD COLUMN IF NOT EXISTS image_source_kind text NOT NULL
  CHECK (image_source_kind IN ('cc', 'original', 'official'));

-- 목록·이전/다음 글: 최신순 + 같은 날 2개는 source_key로 고정 순서
CREATE INDEX IF NOT EXISTS news_posts_list_idx ON public.news_posts (published_on DESC, source_key DESC) WHERE is_published;

ALTER TABLE public.news_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS news_posts_read_published ON public.news_posts;
CREATE POLICY news_posts_read_published ON public.news_posts
  FOR SELECT TO anon, authenticated
  USING (is_published = true);

REVOKE ALL ON public.news_posts FROM anon, authenticated;
GRANT SELECT ON public.news_posts TO anon, authenticated;

-- ─── Storage: 공개 버킷 news (이미지 읽기만 공개) ────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('news', 'news', true, 2097152, ARRAY['image/webp'])
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;
