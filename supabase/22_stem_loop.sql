-- 22_stem_loop.sql — 8마디 "올린 뒤의 고리": 점수 복구 · 이어 치기 알림 · 웹 푸시 stem (2026-11-16)
-- 바뀌는 것:
--   1) stem_tracks.challenge_score CHECK (0 또는 10). 앱은 lib/challenge-score.ts TRACK_UPLOAD_SCORE(10)만 넣는다.
--      총점·주간 점수는 기존 trg_update_challenge_score가 올릴 때 더한다(트리거 본문 그대로).
--      기존 트랙 2개는 0점 그대로(소급 안 함, 2026-11-16 결정).
--   2) notifications.type CHECK에 'track_reply' 추가 + 트리거 trg_notify_track_reply:
--      새 트랙이 올라오면 프로젝트를 만든 사람 + 그 프로젝트에 앞서 올린 사람들에게 알림 1개씩.
--      올린 본인은 받지 않는다. 같은 받는 사람·프로젝트·올린 사람 조합은 10분 안에 다시 만들지 않는다.
--      문구에 들어가는 개인 정보는 올린 사람 이름뿐(프로필 display_name → 트랙 user_name → '누군가').
--   3) push_topics.kind · push_log.kind CHECK에 'stem' 추가,
--      subscribe_push / unsubscribe_push에 'stem' 분기: 로그인 필수, 프로젝트를 만든 사람(creator)이거나
--      그 프로젝트에 트랙을 올린 사람(member)만. target_id = stem_projects.id. 만료 없음.
-- 그대로인 것: 기존 트리거 4개(stem_tracks)·기존 알림 트리거·RLS 정책(notifications_insert_auth 포함, 이번엔 안 건드림).
-- 여러 번 실행해도 같은 결과. 테이블·행 DROP 없음.
-- 되돌리기:
--   DROP TRIGGER IF EXISTS trg_notify_track_reply ON public.stem_tracks; DROP FUNCTION IF EXISTS public.notify_on_track_reply();
--   ALTER TABLE public.stem_tracks DROP CONSTRAINT IF EXISTS stem_tracks_challenge_score_fixed;
--   (CHECK 목록은 16_push_ear.sql·아래 이전 목록으로 되돌리고, subscribe_push/unsubscribe_push는 16_push_ear.sql을 다시 실행)

-- ─── 1) 점수 값 고정 ─────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'stem_tracks_challenge_score_fixed') THEN
    ALTER TABLE public.stem_tracks ADD CONSTRAINT stem_tracks_challenge_score_fixed
      CHECK (challenge_score IN (0, 10));
  END IF;
END $$;

-- ─── 2) 이어 치기 알림 ───────────────────────────────────────
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check CHECK (type IN (
  'follow', 'comment', 'like', 'match', 'booking_confirmed', 'challenge_cta', 'challenge_nudge', 'track_reply'));

CREATE OR REPLACE FUNCTION public.notify_on_track_reply()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_creator uuid;
  v_title   text;
  v_name    text;
BEGIN
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT creator_id, title INTO v_creator, v_title FROM stem_projects WHERE id = NEW.project_id;
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  SELECT nullif(trim(display_name), '') INTO v_name FROM user_profiles WHERE user_id = NEW.user_id LIMIT 1;
  v_name := left(coalesce(v_name, nullif(trim(NEW.user_name), ''), '누군가'), 20);

  INSERT INTO notifications (user_id, type, title, body, payload)
  SELECT r.uid,
         'track_reply',
         v_name || '님이 내 8마디에 이어 쳤어요',
         left(coalesce(v_title, '8마디'), 60),
         jsonb_build_object(
           'project_id', NEW.project_id,
           'track_id',   NEW.id,
           'uploader_id', NEW.user_id,
           'cta_url',    '/stems/' || NEW.project_id)
    FROM (
      SELECT v_creator AS uid
      UNION
      SELECT t.user_id FROM stem_tracks t
       WHERE t.project_id = NEW.project_id AND t.id <> NEW.id AND t.user_id IS NOT NULL
    ) r
   WHERE r.uid IS NOT NULL
     AND r.uid <> NEW.user_id
     AND NOT EXISTS (
       SELECT 1 FROM notifications n
        WHERE n.user_id = r.uid
          AND n.type = 'track_reply'
          AND n.payload->>'project_id' = NEW.project_id::text
          AND n.payload->>'uploader_id' = NEW.user_id::text
          AND n.created_at > now() - interval '10 minutes');

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_on_track_reply() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_notify_track_reply ON public.stem_tracks;
CREATE TRIGGER trg_notify_track_reply
  AFTER INSERT ON public.stem_tracks
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_track_reply();

-- ─── 3) 웹 푸시 stem ────────────────────────────────────────
ALTER TABLE public.push_topics DROP CONSTRAINT IF EXISTS push_topics_kind_check;
ALTER TABLE public.push_topics ADD CONSTRAINT push_topics_kind_check CHECK (kind IN ('vote', 'split', 'ear', 'stem'));
ALTER TABLE public.push_log DROP CONSTRAINT IF EXISTS push_log_kind_check;
ALTER TABLE public.push_log ADD CONSTRAINT push_log_kind_check CHECK (kind IN ('vote', 'split', 'ear', 'stem'));

-- 구독 저장 (16_push_ear.sql과 같고 stem 분기만 추가)
CREATE OR REPLACE FUNCTION public.subscribe_push(
  p_device_key    text,
  p_endpoint      text,
  p_p256dh        text,
  p_auth          text,
  p_kind          text,
  p_target_id     uuid,
  p_creator_token text DEFAULT NULL,
  p_country       text DEFAULT 'KR',
  p_language      text DEFAULT 'ko'
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expires  timestamptz;
  v_creator  boolean := false;
  v_role     text;
  v_sub_id   uuid;
  v_uid      uuid := auth.uid();
  v_country  text := left(coalesce(nullif(trim(p_country), ''), 'KR'), 8);
  v_language text := left(coalesce(nullif(trim(p_language), ''), 'ko'), 8);
  v_hash     text := CASE WHEN p_creator_token IS NULL THEN NULL
                          ELSE encode(sha256(convert_to(p_creator_token, 'UTF8')), 'hex') END;
BEGIN
  IF p_device_key IS NULL OR char_length(p_device_key) NOT BETWEEN 8 AND 64
     OR p_endpoint IS NULL OR p_endpoint !~ '^https://' OR char_length(p_endpoint) > 1024
     OR p_p256dh IS NULL OR p_p256dh !~ '^[A-Za-z0-9_-]{80,100}={0,2}$'
     OR p_auth IS NULL OR p_auth !~ '^[A-Za-z0-9_-]{16,32}={0,2}$'
     OR p_kind IS NULL OR p_kind NOT IN ('vote', 'split', 'ear', 'stem') OR p_target_id IS NULL
     OR (p_kind = 'ear' AND p_target_id <> '00000000-0000-0000-0000-000000000000'::uuid) THEN
    RETURN 'invalid';
  END IF;

  -- 대상 확인 + 역할 결정
  IF p_kind = 'ear' THEN
    v_expires := NULL;
  ELSIF p_kind = 'stem' THEN
    -- 8마디: 로그인한 사람이 만든 사람이거나 트랙을 올린 사람일 때만. 만료 없음
    IF v_uid IS NULL THEN RETURN 'not_member'; END IF;
    SELECT (creator_id = v_uid) INTO v_creator FROM public.stem_projects WHERE id = p_target_id;
    IF NOT FOUND THEN RETURN 'not_found'; END IF;
    v_creator := coalesce(v_creator, false);
    IF NOT v_creator AND NOT EXISTS (
      SELECT 1 FROM public.stem_tracks WHERE project_id = p_target_id AND user_id = v_uid) THEN
      RETURN 'not_member';
    END IF;
    v_expires := NULL;
  ELSIF p_kind = 'vote' THEN
    SELECT expires_at INTO v_expires FROM public.votes WHERE id = p_target_id;
    IF NOT FOUND THEN RETURN 'not_found'; END IF;
    v_creator := v_hash IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.vote_secrets WHERE vote_id = p_target_id AND creator_token_hash = v_hash);
    IF NOT v_creator AND NOT EXISTS (
      SELECT 1 FROM public.vote_responses WHERE vote_id = p_target_id AND voter_anon = p_device_key) THEN
      RETURN 'not_member';
    END IF;
  ELSE
    SELECT expires_at, (v_hash IS NOT NULL AND creator_token_hash = v_hash)
      INTO v_expires, v_creator
      FROM public.splits WHERE id = p_target_id;
    IF NOT FOUND THEN RETURN 'not_found'; END IF;
  END IF;
  IF v_expires < now() THEN RETURN 'expired'; END IF;
  v_role := CASE WHEN v_creator THEN 'creator' ELSE 'member' END;

  -- 구독(브라우저) 저장. 같은 endpoint면 키·기기 키 갱신
  SELECT id INTO v_sub_id FROM public.push_subscriptions WHERE endpoint = p_endpoint FOR UPDATE;
  IF v_sub_id IS NULL THEN
    IF (SELECT count(*) FROM public.push_subscriptions WHERE device_key = p_device_key) >= 5
       OR (SELECT count(*) FROM public.push_subscriptions WHERE created_at > now() - interval '1 hour') >= 300 THEN
      RETURN 'limited';
    END IF;
    INSERT INTO public.push_subscriptions (device_key, user_id, endpoint, p256dh, auth, country, language)
    VALUES (p_device_key, v_uid, p_endpoint, p_p256dh, p_auth, v_country, v_language)
    RETURNING id INTO v_sub_id;
  ELSE
    UPDATE public.push_subscriptions
       SET device_key = p_device_key, user_id = coalesce(v_uid, user_id),
           p256dh = p_p256dh, auth = p_auth, updated_at = now()
     WHERE id = v_sub_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.push_topics
                 WHERE subscription_id = v_sub_id AND kind = p_kind AND target_id = p_target_id)
     AND (SELECT count(*) FROM public.push_topics WHERE subscription_id = v_sub_id) >= 50 THEN
    RETURN 'limited';
  END IF;

  INSERT INTO public.push_topics (subscription_id, kind, target_id, role, country, language)
  VALUES (v_sub_id, p_kind, p_target_id, v_role, v_country, v_language)
  ON CONFLICT (subscription_id, kind, target_id) DO UPDATE
    SET role = CASE WHEN push_topics.role = 'creator' THEN 'creator' ELSE EXCLUDED.role END; -- 만든 사람 역할은 내려가지 않음

  RETURN 'saved';
END;
$$;

-- 구독 해제 (16_push_ear.sql과 같고 stem만 허용)
CREATE OR REPLACE FUNCTION public.unsubscribe_push(
  p_endpoint  text,
  p_kind      text DEFAULT NULL,
  p_target_id uuid DEFAULT NULL
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub_id uuid;
BEGIN
  IF p_endpoint IS NULL OR char_length(p_endpoint) > 1024
     OR (p_kind IS NULL) <> (p_target_id IS NULL)
     OR (p_kind IS NOT NULL AND p_kind NOT IN ('vote', 'split', 'ear', 'stem')) THEN
    RETURN 'invalid';
  END IF;
  SELECT id INTO v_sub_id FROM public.push_subscriptions WHERE endpoint = p_endpoint;
  IF v_sub_id IS NULL THEN RETURN 'not_found'; END IF;

  IF p_kind IS NULL THEN
    DELETE FROM public.push_subscriptions WHERE id = v_sub_id;
  ELSE
    DELETE FROM public.push_topics WHERE subscription_id = v_sub_id AND kind = p_kind AND target_id = p_target_id;
    IF NOT FOUND THEN RETURN 'not_found'; END IF;
    DELETE FROM public.push_subscriptions s
     WHERE s.id = v_sub_id AND NOT EXISTS (SELECT 1 FROM public.push_topics t WHERE t.subscription_id = s.id);
  END IF;
  RETURN 'deleted';
END;
$$;

REVOKE ALL ON FUNCTION public.subscribe_push(text, text, text, text, text, uuid, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.unsubscribe_push(text, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.subscribe_push(text, text, text, text, text, uuid, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.unsubscribe_push(text, text, uuid) TO anon, authenticated;
