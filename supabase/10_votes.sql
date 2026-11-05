-- ============================================================
-- 합주 후보 투표 (재방문 루프 Phase C). /vote/[id]
-- 후보 연습실(최대 5곳)과 날짜 후보를 담은 투표 링크를 밴드 단톡방에 공유 → 멤버가 로그인 없이 투표 → 만든 사람이 결정.
--
-- 정책 (비로그인 쓰기 남용 방지가 핵심):
--   - 세 테이블 모두 RLS 켜고 정책 없음 = anon/authenticated가 직접 읽기·쓰기 불가
--   - 모든 읽기·쓰기는 아래 SECURITY DEFINER RPC 4개로만 (입력 검증·개수 제한을 함수 안에서)
--       create_vote / get_vote / submit_vote_response / decide_vote
--   - 만든 사람 판별은 anon_id(위조 가능)가 아니라 생성 때 한 번만 돌려주는 비밀 토큰.
--     DB에는 sha256 해시만 저장(vote_secrets, 어떤 RPC도 반환하지 않음)
--   - get_vote는 응답자의 anon_id를 반환하지 않는다(닉네임·선택만)
-- 여러 번 실행해도 안전(idempotent). DROP 없음.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.votes (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),     -- 링크 id (추측 불가)
  created_by_anon   text NOT NULL CHECK (char_length(created_by_anon) BETWEEN 8 AND 64),
  created_by_user   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  studio_ids        uuid[] NOT NULL CHECK (cardinality(studio_ids) BETWEEN 1 AND 5),
  date_options      date[] NOT NULL DEFAULT '{}' CHECK (cardinality(date_options) <= 7),
  decided_studio_id uuid REFERENCES public.studios(id) ON DELETE SET NULL,
  decided_at        timestamptz,
  parent_vote_id    uuid REFERENCES public.votes(id) ON DELETE SET NULL, -- "다음 합주도 여기서 정하기"로 이어 만든 경우 이전 투표
  expires_at        timestamptz NOT NULL DEFAULT now() + interval '14 days',
  country           text NOT NULL DEFAULT 'KR',
  region            text,                                            -- 첫 후보 연습실의 region
  language          text NOT NULL DEFAULT 'ko',
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS votes_created_by_anon_idx ON public.votes (created_by_anon, created_at DESC);
CREATE INDEX IF NOT EXISTS votes_created_at_idx ON public.votes (created_at DESC);
CREATE INDEX IF NOT EXISTS votes_parent_idx ON public.votes (parent_vote_id) WHERE parent_vote_id IS NOT NULL;

-- 만든 사람 토큰 해시. 별도 테이블로 두어 어떤 조회에도 섞이지 않게
CREATE TABLE IF NOT EXISTS public.vote_secrets (
  vote_id            uuid PRIMARY KEY REFERENCES public.votes(id) ON DELETE CASCADE,
  creator_token_hash text NOT NULL,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.vote_responses (
  vote_id           uuid NOT NULL REFERENCES public.votes(id) ON DELETE CASCADE,
  voter_anon        text NOT NULL CHECK (char_length(voter_anon) BETWEEN 8 AND 64),
  voter_user        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  nickname          text NOT NULL CHECK (char_length(btrim(nickname)) BETWEEN 1 AND 20),
  picked_studio_ids uuid[] NOT NULL DEFAULT '{}' CHECK (cardinality(picked_studio_ids) <= 5),
  picked_dates      date[] NOT NULL DEFAULT '{}' CHECK (cardinality(picked_dates) <= 7),
  picked_slots      text[] NOT NULL DEFAULT '{}'
                    CHECK (picked_slots <@ ARRAY['morning', 'afternoon', 'evening', 'night']::text[]),
  country           text NOT NULL DEFAULT 'KR',
  language          text NOT NULL DEFAULT 'ko',
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (vote_id, voter_anon)                                 -- 한 투표당 같은 anon_id 1회(이후 수정)
);

ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vote_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vote_responses ENABLE ROW LEVEL SECURITY;
-- 정책을 만들지 않는다 → 직접 접근 전부 거부. 아래 RPC만 통로
REVOKE ALL ON public.votes, public.vote_secrets, public.vote_responses FROM anon, authenticated;

-- ── 1. 만들기 ────────────────────────────────────────────────
-- 반환: { id, creator_token } — creator_token은 이때 한 번만. 클라이언트 localStorage에 보관
-- p_parent_vote_id: 이전 투표에서 이어 만들 때(링크를 가진 누구나). 없는 id면 거부
-- 제한: 같은 anon_id 1시간 10개, 전체 1시간 300개(anon_id를 바꿔 가며 찍어내는 경우의 차단기)
CREATE OR REPLACE FUNCTION public.create_vote(
  p_anon_id      text,
  p_studio_ids   uuid[],
  p_date_options date[] DEFAULT '{}',
  p_country      text DEFAULT 'KR',
  p_language     text DEFAULT 'ko',
  p_parent_vote_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ids    uuid[];
  v_dates  date[];
  v_region text;
  v_token  text := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  v_id     uuid;
BEGIN
  IF p_anon_id IS NULL OR char_length(p_anon_id) NOT BETWEEN 8 AND 64 THEN
    RAISE EXCEPTION 'invalid_anon' USING ERRCODE = '22023';
  END IF;

  -- 중복 제거 + 공개 연습실만 (순서 유지)
  SELECT array_agg(t.id ORDER BY t.ord) INTO v_ids
  FROM (
    SELECT DISTINCT ON (u.id) u.id, u.ord
    FROM unnest(p_studio_ids) WITH ORDINALITY AS u(id, ord)
    JOIN public.studios s ON s.id = u.id AND s.is_published
    ORDER BY u.id, u.ord
  ) t;
  IF v_ids IS NULL OR cardinality(v_ids) NOT BETWEEN 1 AND 5 THEN
    RAISE EXCEPTION 'invalid_studios' USING ERRCODE = '22023';
  END IF;

  -- 날짜: 오늘(KST)부터 60일 안, 중복 제거, 최대 7개
  SELECT coalesce(array_agg(DISTINCT d ORDER BY d), '{}') INTO v_dates
  FROM unnest(coalesce(p_date_options, '{}')) AS d
  WHERE d BETWEEN (now() AT TIME ZONE 'Asia/Seoul')::date AND (now() AT TIME ZONE 'Asia/Seoul')::date + 60;
  IF cardinality(v_dates) > 7 THEN
    RAISE EXCEPTION 'too_many_dates' USING ERRCODE = '22023';
  END IF;

  IF (SELECT count(*) FROM public.votes WHERE created_by_anon = p_anon_id AND created_at > now() - interval '1 hour') >= 10
     OR (SELECT count(*) FROM public.votes WHERE created_at > now() - interval '1 hour') >= 300 THEN
    RAISE EXCEPTION 'rate_limited' USING ERRCODE = 'P0001';
  END IF;

  IF p_parent_vote_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.votes WHERE id = p_parent_vote_id) THEN
    RAISE EXCEPTION 'invalid_parent' USING ERRCODE = '22023';
  END IF;

  SELECT region INTO v_region FROM public.studios WHERE id = v_ids[1];

  INSERT INTO public.votes (created_by_anon, created_by_user, studio_ids, date_options, parent_vote_id, country, region, language)
  VALUES (p_anon_id, auth.uid(), v_ids, v_dates, p_parent_vote_id,
          CASE WHEN p_country IN ('KR', 'JP', 'GLOBAL') THEN p_country ELSE 'KR' END,
          v_region,
          CASE WHEN p_language IN ('ko', 'ja', 'en') THEN p_language ELSE 'ko' END)
  RETURNING id INTO v_id;

  INSERT INTO public.vote_secrets (vote_id, creator_token_hash)
  VALUES (v_id, encode(sha256(convert_to(v_token, 'UTF8')), 'hex'));

  RETURN jsonb_build_object('id', v_id, 'creator_token', v_token);
END;
$$;

-- ── 2. 보기 ──────────────────────────────────────────────────
-- 링크를 가진 누구나. 응답자 anon_id는 내보내지 않고 내 응답(p_anon_id 일치)만 따로 준다.
-- p_creator_token이 맞으면 is_creator = true
CREATE OR REPLACE FUNCTION public.get_vote(p_vote_id uuid, p_anon_id text DEFAULT NULL, p_creator_token text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v public.votes%ROWTYPE;
BEGIN
  SELECT * INTO v FROM public.votes WHERE id = p_vote_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  RETURN jsonb_build_object(
    'id', v.id,
    'studio_ids', to_jsonb(v.studio_ids),
    'date_options', to_jsonb(v.date_options),
    'decided_studio_id', v.decided_studio_id,
    'decided_at', v.decided_at,
    'expires_at', v.expires_at,
    'is_expired', v.expires_at < now(),
    'created_at', v.created_at,
    'parent_vote_id', v.parent_vote_id,
    -- 이 투표에서 이어 만든 가장 최근 투표. 단톡방의 옛 링크가 새 투표로 안내하는 데 쓴다
    'next_vote_id', (SELECT c.id FROM public.votes c WHERE c.parent_vote_id = v.id ORDER BY c.created_at DESC LIMIT 1),
    'is_creator', p_creator_token IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.vote_secrets
      WHERE vote_id = v.id AND creator_token_hash = encode(sha256(convert_to(p_creator_token, 'UTF8')), 'hex')
    ),
    'responses', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
               'nickname', r.nickname,
               'picked_studio_ids', to_jsonb(r.picked_studio_ids),
               'picked_dates', to_jsonb(r.picked_dates),
               'picked_slots', to_jsonb(r.picked_slots),
               'is_mine', p_anon_id IS NOT NULL AND r.voter_anon = p_anon_id
             ) ORDER BY r.created_at)
      FROM public.vote_responses r WHERE r.vote_id = v.id
    ), '[]'::jsonb)
  );
END;
$$;

-- ── 3. 투표(응답) ────────────────────────────────────────────
-- 같은 anon_id는 덮어쓰기(수정). 선택은 투표의 후보·날짜 안에서만 남긴다.
-- 거부: 'not_found' | 'expired' | 'decided' | 'full'(응답 50명) | 'invalid'
-- 반환: 'saved'
CREATE OR REPLACE FUNCTION public.submit_vote_response(
  p_vote_id   uuid,
  p_anon_id   text,
  p_nickname  text,
  p_studio_ids uuid[] DEFAULT '{}',
  p_dates     date[] DEFAULT '{}',
  p_slots     text[] DEFAULT '{}',
  p_country   text DEFAULT 'KR',
  p_language  text DEFAULT 'ko'
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v public.votes%ROWTYPE;
  v_nick text := btrim(coalesce(p_nickname, ''));
BEGIN
  IF p_anon_id IS NULL OR char_length(p_anon_id) NOT BETWEEN 8 AND 64 OR char_length(v_nick) NOT BETWEEN 1 AND 20 THEN
    RETURN 'invalid';
  END IF;

  SELECT * INTO v FROM public.votes WHERE id = p_vote_id FOR UPDATE; -- 50명 제한을 동시 요청에도 지키려고 잠금
  IF NOT FOUND THEN RETURN 'not_found'; END IF;
  IF v.expires_at < now() THEN RETURN 'expired'; END IF;
  IF v.decided_studio_id IS NOT NULL THEN RETURN 'decided'; END IF;

  IF NOT EXISTS (SELECT 1 FROM public.vote_responses WHERE vote_id = v.id AND voter_anon = p_anon_id)
     AND (SELECT count(*) FROM public.vote_responses WHERE vote_id = v.id) >= 50 THEN
    RETURN 'full';
  END IF;

  INSERT INTO public.vote_responses AS r
    (vote_id, voter_anon, voter_user, nickname, picked_studio_ids, picked_dates, picked_slots, country, language)
  VALUES (
    v.id, p_anon_id, auth.uid(), v_nick,
    ARRAY(SELECT DISTINCT x FROM unnest(coalesce(p_studio_ids, '{}')) x WHERE x = ANY (v.studio_ids)),
    ARRAY(SELECT DISTINCT x FROM unnest(coalesce(p_dates, '{}')) x WHERE x = ANY (v.date_options)),
    ARRAY(SELECT DISTINCT x FROM unnest(coalesce(p_slots, '{}')) x WHERE x IN ('morning', 'afternoon', 'evening', 'night')),
    CASE WHEN p_country IN ('KR', 'JP', 'GLOBAL') THEN p_country ELSE 'KR' END,
    CASE WHEN p_language IN ('ko', 'ja', 'en') THEN p_language ELSE 'ko' END
  )
  ON CONFLICT (vote_id, voter_anon) DO UPDATE SET
    nickname = EXCLUDED.nickname,
    voter_user = coalesce(EXCLUDED.voter_user, r.voter_user),
    picked_studio_ids = EXCLUDED.picked_studio_ids,
    picked_dates = EXCLUDED.picked_dates,
    picked_slots = EXCLUDED.picked_slots,
    updated_at = now();

  RETURN 'saved';
END;
$$;

-- ── 4. 결정 (만든 사람만) ────────────────────────────────────
-- 반환: 'decided' | 'not_found' | 'forbidden' | 'invalid'
-- 다시 부르면 결정을 바꿀 수 있다(만든 사람이 잘못 눌렀을 때)
CREATE OR REPLACE FUNCTION public.decide_vote(p_vote_id uuid, p_creator_token text, p_studio_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v public.votes%ROWTYPE;
BEGIN
  SELECT * INTO v FROM public.votes WHERE id = p_vote_id FOR UPDATE;
  IF NOT FOUND THEN RETURN 'not_found'; END IF;
  IF p_creator_token IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.vote_secrets
    WHERE vote_id = v.id AND creator_token_hash = encode(sha256(convert_to(p_creator_token, 'UTF8')), 'hex')
  ) THEN
    RETURN 'forbidden';
  END IF;
  IF NOT (p_studio_id = ANY (v.studio_ids)) THEN RETURN 'invalid'; END IF;

  UPDATE public.votes SET decided_studio_id = p_studio_id, decided_at = now() WHERE id = v.id;
  RETURN 'decided';
END;
$$;

REVOKE ALL ON FUNCTION public.create_vote(text, uuid[], date[], text, text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_vote(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_vote_response(uuid, text, text, uuid[], date[], text[], text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.decide_vote(uuid, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_vote(text, uuid[], date[], text, text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_vote(uuid, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_vote_response(uuid, text, text, uuid[], date[], text[], text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.decide_vote(uuid, text, uuid) TO anon, authenticated;
