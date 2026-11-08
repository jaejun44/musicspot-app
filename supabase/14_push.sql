-- ============================================================
-- 웹 푸시 구독 (재방문 ③ PR 1 — 구독만, 발송은 PR 2). 설계: docs/PLAN_notifications.md
-- 투표·정산을 로그인 없이 쓰는 멤버도 받을 수 있게, 브라우저 구독을 기기 키(ms_vk)와 투표·정산에 묶는다.
--
-- 정책 (10_votes.sql·13_splits.sql과 같은 패턴):
--   - 두 테이블 모두 RLS 켜고 정책 없음 + anon/authenticated 권한 REVOKE = 직접 읽기·쓰기 불가
--   - 쓰기는 SECURITY DEFINER RPC 2개로만: subscribe_push / unsubscribe_push
--   - 읽는 RPC는 없다. endpoint는 "아는 사람은 누구나 보낼 수 있는 URL"(MDN)이라 발송 서버가 service key로만 읽는다
--   - 만든 사람(creator) 역할은 투표·정산의 만든 사람 토큰(sha256 대조)으로만 얻는다
--   - 투표 멤버 역할은 그 기기 키로 응답한 적이 있어야 한다(아무 투표나 구독해 남의 결과를 받는 것 방지)
--   - 저장: endpoint·암호화 키·기기 키·(로그인 시) user_id·국가·언어·시각. 이름·전화번호 없음
-- 여러 번 실행해도 안전(idempotent). DROP 없음.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_key  text NOT NULL CHECK (char_length(device_key) BETWEEN 8 AND 64), -- 기기 키(ms_vk). 투표 응답·정산 체크와 같은 값
  user_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  endpoint    text NOT NULL UNIQUE CHECK (endpoint ~ '^https://' AND char_length(endpoint) <= 1024),
  p256dh      text NOT NULL CHECK (p256dh ~ '^[A-Za-z0-9_-]{80,100}={0,2}$'), -- base64url P-256 공개키(65바이트 ≈ 87자)
  auth        text NOT NULL CHECK (auth ~ '^[A-Za-z0-9_-]{16,32}={0,2}$'),     -- base64url 16바이트 ≈ 22자
  country     text NOT NULL DEFAULT 'KR',
  language    text NOT NULL DEFAULT 'ko',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS push_subscriptions_device_idx ON public.push_subscriptions (device_key);
CREATE INDEX IF NOT EXISTS push_subscriptions_created_idx ON public.push_subscriptions (created_at);

-- 무엇을 받을지. target은 투표 또는 정산 id(지워지거나 만료된 대상은 PR 3 Cron이 정리)
CREATE TABLE IF NOT EXISTS public.push_topics (
  subscription_id uuid NOT NULL REFERENCES public.push_subscriptions(id) ON DELETE CASCADE,
  kind            text NOT NULL CHECK (kind IN ('vote', 'split')),
  target_id       uuid NOT NULL,
  role            text NOT NULL CHECK (role IN ('creator', 'member')),
  country         text NOT NULL DEFAULT 'KR',
  language        text NOT NULL DEFAULT 'ko',
  created_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (subscription_id, kind, target_id)
);
CREATE INDEX IF NOT EXISTS push_topics_target_idx ON public.push_topics (kind, target_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_topics ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.push_subscriptions, public.push_topics FROM anon, authenticated;

-- ─── 구독 저장 ───────────────────────────────────────────────
-- 반환: saved | invalid | not_found | expired | not_member | limited
--   saved      : 구독·대상 저장(이미 있으면 키 갱신, 만든 사람이면 역할 올림)
--   not_member : 투표에 이 기기로 응답한 적 없음(만든 사람 토큰도 안 맞음)
--   limited    : 기기당 구독 5개 · 구독당 대상 50개 · 전체 새 구독 시간당 300개 초과
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
     OR p_kind IS NULL OR p_kind NOT IN ('vote', 'split') OR p_target_id IS NULL THEN
    RETURN 'invalid';
  END IF;

  -- 대상 확인 + 역할 결정
  IF p_kind = 'vote' THEN
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

-- ─── 구독 해제 ───────────────────────────────────────────────
-- p_kind·p_target_id가 있으면 그 대상만, 없으면 이 브라우저 구독 전체(대상은 CASCADE)
-- endpoint 자체가 비밀이라 그것을 아는 브라우저만 끌 수 있다
-- 반환: deleted | not_found | invalid
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
     OR (p_kind IS NOT NULL AND p_kind NOT IN ('vote', 'split')) THEN
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

-- Supabase 기본 권한은 새 함수에 anon/authenticated EXECUTE를 자동으로 준다 → PUBLIC에서 걷고 필요한 것만 다시 준다
REVOKE ALL ON FUNCTION public.subscribe_push(text, text, text, text, text, uuid, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.unsubscribe_push(text, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.subscribe_push(text, text, text, text, text, uuid, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.unsubscribe_push(text, text, uuid) TO anon, authenticated;
