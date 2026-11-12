-- ============================================================
-- 웹 푸시 대상에 "오늘의 음감"(ear) 추가 — 매일 1번 "아직 안 풀었어요" 알림 (2026-11-12)
-- 14_push.sql·15_push_log.sql 위에 덧붙인다. 바뀌는 것:
--   1) push_topics.kind · push_log.kind CHECK에 'ear' 추가 (제약만 바꿈, 행은 그대로)
--   2) subscribe_push: kind 'ear' 허용. target_id는 고정값 00000000-0000-0000-0000-000000000000 하나뿐(음감은 대상이 하나),
--      만료·만든 사람 확인 없음, 역할은 member. 기기당 5개·구독당 50개·시간당 300개 제한은 그대로
--   3) unsubscribe_push: kind 'ear' 허용
-- 정책·권한은 14와 같음(RLS 정책 0개, 테이블 REVOKE, RPC 2개만 anon/authenticated 실행).
-- 저장하는 것도 같음(endpoint·키·기기 키·국가·언어·시각). 누가 풀었는지는 서버에 저장하지 않는다.
-- 여러 번 실행해도 안전(idempotent). 테이블·행 DROP 없음(CHECK 제약만 교체).
-- ============================================================

ALTER TABLE public.push_topics DROP CONSTRAINT IF EXISTS push_topics_kind_check;
ALTER TABLE public.push_topics ADD CONSTRAINT push_topics_kind_check CHECK (kind IN ('vote', 'split', 'ear'));
ALTER TABLE public.push_log DROP CONSTRAINT IF EXISTS push_log_kind_check;
ALTER TABLE public.push_log ADD CONSTRAINT push_log_kind_check CHECK (kind IN ('vote', 'split', 'ear'));

-- ─── 구독 저장 (14_push.sql과 같고 ear 분기만 추가) ─────────────
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
  v_country  text := left(coalesce(nullif(trim(p_country), ''), 'KR'), 8);
  v_language text := left(coalesce(nullif(trim(p_language), ''), 'ko'), 8);
  v_hash     text := CASE WHEN p_creator_token IS NULL THEN NULL
                          ELSE encode(sha256(convert_to(p_creator_token, 'UTF8')), 'hex') END;
BEGIN
  IF p_device_key IS NULL OR char_length(p_device_key) NOT BETWEEN 8 AND 64
     OR p_endpoint IS NULL OR p_endpoint !~ '^https://' OR char_length(p_endpoint) > 1024
     OR p_p256dh IS NULL OR p_p256dh !~ '^[A-Za-z0-9_-]{80,100}={0,2}$'
     OR p_auth IS NULL OR p_auth !~ '^[A-Za-z0-9_-]{16,32}={0,2}$'
     OR p_kind IS NULL OR p_kind NOT IN ('vote', 'split', 'ear') OR p_target_id IS NULL
     OR (p_kind = 'ear' AND p_target_id <> '00000000-0000-0000-0000-000000000000'::uuid) THEN
    RETURN 'invalid';
  END IF;

  -- 대상 확인 + 역할 결정. 음감(ear)은 대상이 하나(고정 id)뿐이고 만료·만든 사람이 없다 → 누구나 member
  IF p_kind = 'ear' THEN
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
    VALUES (p_device_key, auth.uid(), p_endpoint, p_p256dh, p_auth, v_country, v_language)
    RETURNING id INTO v_sub_id;
  ELSE
    UPDATE public.push_subscriptions
       SET device_key = p_device_key, user_id = coalesce(auth.uid(), user_id),
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

-- ─── 구독 해제 (14_push.sql과 같고 ear만 허용) ────────────────
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
     OR (p_kind IS NOT NULL AND p_kind NOT IN ('vote', 'split', 'ear')) THEN
    RETURN 'invalid';
  END IF;
  SELECT id INTO v_sub_id FROM public.push_subscriptions WHERE endpoint = p_endpoint;
  IF v_sub_id IS NULL THEN RETURN 'not_found'; END IF;

  IF p_kind IS NULL THEN
    DELETE FROM public.push_subscriptions WHERE id = v_sub_id;
  ELSE
    DELETE FROM public.push_topics WHERE subscription_id = v_sub_id AND kind = p_kind AND target_id = p_target_id;
    IF NOT FOUND THEN RETURN 'not_found'; END IF;
    -- 받을 대상이 하나도 없으면 구독 자체를 지운다(쓸모없는 endpoint를 남기지 않음)
    DELETE FROM public.push_subscriptions s
     WHERE s.id = v_sub_id AND NOT EXISTS (SELECT 1 FROM public.push_topics t WHERE t.subscription_id = s.id);
  END IF;
  RETURN 'deleted';
END;
$$;

-- CREATE OR REPLACE는 기존 권한을 유지하지만, 14와 같은 상태임을 분명히 하려고 다시 적는다
REVOKE ALL ON FUNCTION public.subscribe_push(text, text, text, text, text, uuid, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.unsubscribe_push(text, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.subscribe_push(text, text, text, text, text, uuid, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.unsubscribe_push(text, text, uuid) TO anon, authenticated;
