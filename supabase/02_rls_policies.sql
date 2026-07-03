-- ============================================================
-- Music Spot RLS 정책 적용
-- ⚠️ 먼저 01_rls_diagnose.sql 을 실행해 현재 상태를 확인할 것.
-- ⚠️ 이 스크립트는 테이블별로 나뉘어 있다. 한 블록씩 실행하며
--    해당 기능(글쓰기/리뷰/예약 등)이 정상 동작하는지 확인하고 넘어간다.
-- ⚠️ 컬럼명은 코드 기준으로 작성했다. 실제 스키마와 다르면 컬럼명만 수정.
--
-- 핵심 원칙:
--   - SELECT: 공개 콘텐츠는 anon 허용, 개인정보(DM/예약/알림)는 본인만.
--   - INSERT: with_check 로 "소유자 컬럼 = auth.uid()" 강제 → ID 위조 차단.
--   - UPDATE/DELETE: using 으로 본인 소유 행만.
-- DROP POLICY IF EXISTS 를 먼저 둬서 여러 번 실행해도 안전(idempotent).
-- ============================================================


-- ─────────────────────────────────────────────
-- studio_reviews : 리뷰. 읽기 공개, 쓰기는 본인 user_id 만.
-- ─────────────────────────────────────────────
ALTER TABLE public.studio_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS reviews_select ON public.studio_reviews;
CREATE POLICY reviews_select ON public.studio_reviews
  FOR SELECT USING (true);

DROP POLICY IF EXISTS reviews_insert ON public.studio_reviews;
CREATE POLICY reviews_insert ON public.studio_reviews
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS reviews_update ON public.studio_reviews;
CREATE POLICY reviews_update ON public.studio_reviews
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS reviews_delete ON public.studio_reviews;
CREATE POLICY reviews_delete ON public.studio_reviews
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);


-- ─────────────────────────────────────────────
-- posts : 커뮤니티 글. 소유자 컬럼 = author_id.
-- ─────────────────────────────────────────────
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS posts_select ON public.posts;
CREATE POLICY posts_select ON public.posts
  FOR SELECT USING (is_published = true OR auth.uid() = author_id);

DROP POLICY IF EXISTS posts_insert ON public.posts;
CREATE POLICY posts_insert ON public.posts
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS posts_update ON public.posts;
CREATE POLICY posts_update ON public.posts
  FOR UPDATE TO authenticated
  USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS posts_delete ON public.posts;
CREATE POLICY posts_delete ON public.posts
  FOR DELETE TO authenticated
  USING (auth.uid() = author_id);


-- ─────────────────────────────────────────────
-- post_comments : 댓글. (코드에 컬럼 미확인 → 보통 user_id/author_id)
--   실제 컬럼명 확인 후 아래 user_id 를 맞출 것.
-- ─────────────────────────────────────────────
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS comments_select ON public.post_comments;
CREATE POLICY comments_select ON public.post_comments
  FOR SELECT USING (true);

DROP POLICY IF EXISTS comments_insert ON public.post_comments;
CREATE POLICY comments_insert ON public.post_comments
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);   -- 컬럼명 다르면 수정

DROP POLICY IF EXISTS comments_delete ON public.post_comments;
CREATE POLICY comments_delete ON public.post_comments
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);


-- ─────────────────────────────────────────────
-- post_likes : 좋아요. 본인 user_id 만 추가/삭제, 집계 위해 읽기 공개.
-- ─────────────────────────────────────────────
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS likes_select ON public.post_likes;
CREATE POLICY likes_select ON public.post_likes FOR SELECT USING (true);

DROP POLICY IF EXISTS likes_insert ON public.post_likes;
CREATE POLICY likes_insert ON public.post_likes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS likes_delete ON public.post_likes;
CREATE POLICY likes_delete ON public.post_likes
  FOR DELETE TO authenticated USING (auth.uid() = user_id);


-- ─────────────────────────────────────────────
-- direct_messages : 1:1 DM. ★개인정보★ 당사자만 읽기.
--   소유자 컬럼: sender_id / receiver_id.
-- ─────────────────────────────────────────────
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dm_select ON public.direct_messages;
CREATE POLICY dm_select ON public.direct_messages
  FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS dm_insert ON public.direct_messages;
CREATE POLICY dm_insert ON public.direct_messages
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id);   -- 보낸 사람만 본인 명의로

-- DM 은 보통 수정 불가. 읽음표시 등 update 가 필요하면 receiver 한정으로 추가.


-- ─────────────────────────────────────────────
-- notifications : 알림. 본인 대상 알림만 읽기/수정.
--   소유자 컬럼: 보통 user_id (수신자). 코드 확인 후 맞출 것.
-- ─────────────────────────────────────────────
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notif_select ON public.notifications;
CREATE POLICY notif_select ON public.notifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS notif_update ON public.notifications;
CREATE POLICY notif_update ON public.notifications
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 알림 생성(insert)은 타인이 트리거하는 경우가 많다(팔로우 알림 등).
-- 클라이언트에서 직접 insert 중이면 아래처럼 "로그인 사용자 누구나 생성" 허용.
-- 더 안전하게 하려면 이 insert 를 서버(서비스 롤) 또는 DB 트리거로 옮길 것.
DROP POLICY IF EXISTS notif_insert ON public.notifications;
CREATE POLICY notif_insert ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (true);


-- ─────────────────────────────────────────────
-- bookings : 예약. ★개인정보★ 본인 것만.
-- ─────────────────────────────────────────────
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bookings_select ON public.bookings;
CREATE POLICY bookings_select ON public.bookings
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS bookings_insert ON public.bookings;
CREATE POLICY bookings_insert ON public.bookings
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);


-- ─────────────────────────────────────────────
-- user_follows : 팔로우. 본인이 follower 일 때만 추가/삭제.
-- ─────────────────────────────────────────────
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS follows_select ON public.user_follows;
CREATE POLICY follows_select ON public.user_follows FOR SELECT USING (true);

DROP POLICY IF EXISTS follows_insert ON public.user_follows;
CREATE POLICY follows_insert ON public.user_follows
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = follower_id);

DROP POLICY IF EXISTS follows_delete ON public.user_follows;
CREATE POLICY follows_delete ON public.user_follows
  FOR DELETE TO authenticated USING (auth.uid() = follower_id);


-- ─────────────────────────────────────────────
-- user_profiles : 프로필. 읽기 공개, 본인 행만 생성/수정(upsert).
--   소유자 컬럼: user_id.
-- ─────────────────────────────────────────────
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_select ON public.user_profiles;
CREATE POLICY profiles_select ON public.user_profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS profiles_insert ON public.user_profiles;
CREATE POLICY profiles_insert ON public.user_profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS profiles_update ON public.user_profiles;
CREATE POLICY profiles_update ON public.user_profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);


-- ─────────────────────────────────────────────
-- bands / band_members / band_schedules : 밴드.
--   bands.created_by, band_members.user_id 기준.
-- ─────────────────────────────────────────────
ALTER TABLE public.bands ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS bands_select ON public.bands;
CREATE POLICY bands_select ON public.bands FOR SELECT USING (true);
DROP POLICY IF EXISTS bands_insert ON public.bands;
CREATE POLICY bands_insert ON public.bands
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
DROP POLICY IF EXISTS bands_update ON public.bands;
CREATE POLICY bands_update ON public.bands
  FOR UPDATE TO authenticated USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);

ALTER TABLE public.band_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS bandmembers_select ON public.band_members;
CREATE POLICY bandmembers_select ON public.band_members FOR SELECT USING (true);
DROP POLICY IF EXISTS bandmembers_insert ON public.band_members;
CREATE POLICY bandmembers_insert ON public.band_members
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS bandmembers_delete ON public.band_members;
CREATE POLICY bandmembers_delete ON public.band_members
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

ALTER TABLE public.band_schedules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS schedules_select ON public.band_schedules;
CREATE POLICY schedules_select ON public.band_schedules
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS schedules_write ON public.band_schedules;
CREATE POLICY schedules_write ON public.band_schedules
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
-- 일정은 밴드 멤버만 쓰게 하려면 EXISTS(band_members ...) 서브쿼리로 강화 가능.


-- ─────────────────────────────────────────────
-- stem_projects / stem_tracks : 8마디. 본인 user_id 기준.
-- ─────────────────────────────────────────────
-- ★ stem_projects 의 소유자 컬럼은 creator_id (user_id 아님).
ALTER TABLE public.stem_projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS projects_select ON public.stem_projects;
CREATE POLICY projects_select ON public.stem_projects FOR SELECT USING (true);
DROP POLICY IF EXISTS projects_insert ON public.stem_projects;
CREATE POLICY projects_insert ON public.stem_projects
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = creator_id);
DROP POLICY IF EXISTS projects_update ON public.stem_projects;
CREATE POLICY projects_update ON public.stem_projects
  FOR UPDATE TO authenticated USING (auth.uid() = creator_id) WITH CHECK (auth.uid() = creator_id);
DROP POLICY IF EXISTS projects_delete ON public.stem_projects;
CREATE POLICY projects_delete ON public.stem_projects
  FOR DELETE TO authenticated USING (auth.uid() = creator_id);

ALTER TABLE public.stem_tracks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tracks_select ON public.stem_tracks;
CREATE POLICY tracks_select ON public.stem_tracks FOR SELECT USING (true);
DROP POLICY IF EXISTS tracks_insert ON public.stem_tracks;
CREATE POLICY tracks_insert ON public.stem_tracks
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS tracks_delete ON public.stem_tracks;
CREATE POLICY tracks_delete ON public.stem_tracks
  FOR DELETE TO authenticated USING (auth.uid() = user_id);


-- ─────────────────────────────────────────────
-- 비로그인도 제출 가능한 테이블 : anon insert 허용, 읽기는 막음.
--   feedbacks / studio_requests / studio_reports / page_views
--   → 누구나 INSERT, SELECT 는 어드민(서비스 롤)만. anon 읽기 차단.
-- ─────────────────────────────────────────────
ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS feedbacks_insert ON public.feedbacks;
CREATE POLICY feedbacks_insert ON public.feedbacks
  FOR INSERT TO anon, authenticated WITH CHECK (true);
-- SELECT 정책 없음 → anon/authenticated 읽기 불가. 어드민은 서비스 롤로 RLS 우회.

ALTER TABLE public.studio_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS requests_insert ON public.studio_requests;
CREATE POLICY requests_insert ON public.studio_requests
  FOR INSERT TO anon, authenticated WITH CHECK (true);

ALTER TABLE public.studio_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS reports_insert ON public.studio_reports;
CREATE POLICY reports_insert ON public.studio_reports
  FOR INSERT TO anon, authenticated WITH CHECK (true);

ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pageviews_insert ON public.page_views;
CREATE POLICY pageviews_insert ON public.page_views
  FOR INSERT TO anon, authenticated WITH CHECK (true);


-- ─────────────────────────────────────────────
-- studios / partner_studios : 공개 카탈로그. 읽기만 anon 허용.
--   쓰기는 어드민(서비스 롤)만 → 정책 없이 SELECT 만 연다.
-- ─────────────────────────────────────────────
ALTER TABLE public.studios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS studios_select ON public.studios;
CREATE POLICY studios_select ON public.studios
  FOR SELECT USING (is_published = true);
-- insert/update/delete 정책 없음 → anon/authenticated 쓰기 전면 차단.
-- 어드민 발행/수정은 서비스 롤(createAdminClient)이 RLS 우회하므로 정상 동작.

ALTER TABLE public.partner_studios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS partners_select ON public.partner_studios;
CREATE POLICY partners_select ON public.partner_studios FOR SELECT USING (true);

-- ============================================================
-- 적용 후 검증: 01_rls_diagnose.sql 의 [3] 쿼리를 다시 돌려
-- "RLS 켜졌지만 정책 0개"인 테이블이 없는지 확인.
-- 그다음 실사이트에서 글쓰기/리뷰/예약/DM 이 정상 동작하는지 클릭 테스트.
-- ============================================================
