-- ============================================================
-- 합주비 N빵 정산 링크 (재방문 ②). /split/[id]
-- 합주가 끝나면 "1인당 얼마"를 단톡방에 올리는 일을 링크로 → 멤버가 로그인 없이 "냈어요" 체크 → 같은 화면에서 다음 합주 투표로.
-- 송금·결제·계좌 기능은 없다(계산과 체크만). 금액은 안내용.
--
-- 정책 (10_votes.sql과 같은 패턴):
--   - 두 테이블 모두 RLS 켜고 정책 없음 + anon/authenticated 권한 REVOKE = 직접 읽기·쓰기 불가
--   - 모든 읽기·쓰기는 SECURITY DEFINER RPC 3개로만 (search_path 고정, 입력 검증·개수 제한을 함수 안에서)
--       create_split / get_split / toggle_split_paid
--   - 1인당 금액은 서버가 같은 규칙(lib/split.ts calcPerPerson: 100원 단위 올림)으로 다시 계산해 저장. 클라이언트 값은 받지 않는다
--   - 만든 사람 판별은 생성 때 한 번만 돌려주는 비밀 토큰. DB에는 sha256 해시만(어떤 RPC도 반환하지 않음)
--   - get_split은 payer_key를 반환하지 않는다(닉네임·냈어요·내 것 여부만)
-- 여러 번 실행해도 안전(idempotent). DROP 없음.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.splits (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),   -- 링크 id (추측 불가)
  created_by_key     text NOT NULL CHECK (char_length(created_by_key) BETWEEN 8 AND 64), -- 만든 기기 키(ms_vk). 속도 제한용
  created_by_user    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  creator_token_hash text NOT NULL,                                 -- 만든 사람 토큰 sha256. get_split이 내보내지 않음
  studio_id          uuid REFERENCES public.studios(id) ON DELETE SET NULL,
  vote_id            uuid REFERENCES public.votes(id) ON DELETE SET NULL, -- 결정된 투표에서 만든 정산
  hourly_price       integer NOT NULL CHECK (hourly_price BETWEEN 0 AND 1000000),
  hours              numeric(3,1) NOT NULL CHECK (hours BETWEEN 0.5 AND 24 AND hours * 2 = trunc(hours * 2)), -- 0.5 단위
  people             integer NOT NULL CHECK (people BETWEEN 2 AND 20),
  extra              integer NOT NULL DEFAULT 0 CHECK (extra BETWEEN 0 AND 1000000),
  per_person         integer NOT NULL CHECK (per_person >= 0),
  played_on          date,
  country            text NOT NULL DEFAULT 'KR',
  language           text NOT NULL DEFAULT 'ko',
  created_at         timestamptz NOT NULL DEFAULT now(),
  expires_at         timestamptz NOT NULL DEFAULT now() + interval '60 days'
);

CREATE INDEX IF NOT EXISTS splits_created_by_key_idx ON public.splits (created_by_key, created_at DESC);
CREATE INDEX IF NOT EXISTS splits_created_at_idx ON public.splits (created_at DESC);
CREATE INDEX IF NOT EXISTS splits_vote_idx ON public.splits (vote_id) WHERE vote_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.split_payers (
  split_id   uuid NOT NULL REFERENCES public.splits(id) ON DELETE CASCADE,
  payer_key  text NOT NULL CHECK (char_length(payer_key) BETWEEN 8 AND 64), -- 기기 키(ms_vk) — 한 기기 한 줄
  payer_user uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  nickname   text NOT NULL CHECK (char_length(btrim(nickname)) BETWEEN 1 AND 20),
  paid       boolean NOT NULL DEFAULT false,
  country    text NOT NULL DEFAULT 'KR',
  language   text NOT NULL DEFAULT 'ko',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (split_id, payer_key)
);

ALTER TABLE public.splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.split_payers ENABLE ROW LEVEL SECURITY;
-- 정책을 만들지 않는다 → 직접 접근 전부 거부. 아래 RPC만 통로
REVOKE ALL ON public.splits, public.split_payers FROM anon, authenticated;

-- 1인당 금액: (시간당 × 시간 + 추가) ÷ 인원, 100원 단위 올림. lib/split.ts calcPerPerson과 같은 규칙
CREATE OR REPLACE FUNCTION public.split_per_person(p_hourly integer, p_hours numeric, p_people integer, p_extra integer)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT (ceil((p_hourly * p_hours + p_extra) / p_people / 100.0) * 100)::integer;
$$;

-- ── 1. 만들기 ────────────────────────────────────────────────
-- 반환: { id, creator_token, per_person } — creator_token은 이때 한 번만(클라이언트 localStorage)
-- 거부(예외 메시지): invalid_key | invalid_people | invalid_hours | invalid_amount | invalid_studio | invalid_vote | rate_limited
-- 제한: 같은 기기 1시간 10개, 전체 1시간 300개. 인원 2~20, 시간당·추가 0~1,000,000원, 총액 1,000,000원 이하
CREATE OR REPLACE FUNCTION public.create_split(
  p_creator_key  text,
  p_hourly_price integer,
  p_hours        numeric,
  p_people       integer,
  p_extra        integer DEFAULT 0,
  p_studio_id    uuid DEFAULT NULL,
  p_vote_id      uuid DEFAULT NULL,
  p_played_on    date DEFAULT NULL,
  p_country      text DEFAULT 'KR',
  p_language     text DEFAULT 'ko'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_extra  integer := coalesce(p_extra, 0);
  v_token  text := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  v_studio uuid := p_studio_id;
  v_played date := p_played_on;
  v_per    integer;
  v_id     uuid;
BEGIN
  IF p_creator_key IS NULL OR char_length(p_creator_key) NOT BETWEEN 8 AND 64 THEN
    RAISE EXCEPTION 'invalid_key' USING ERRCODE = '22023';
  END IF;
  IF p_people IS NULL OR p_people NOT BETWEEN 2 AND 20 THEN
    RAISE EXCEPTION 'invalid_people' USING ERRCODE = '22023';
  END IF;
  IF p_hours IS NULL OR p_hours NOT BETWEEN 0.5 AND 24 OR p_hours * 2 <> trunc(p_hours * 2) THEN
    RAISE EXCEPTION 'invalid_hours' USING ERRCODE = '22023';
  END IF;
  IF p_hourly_price IS NULL OR p_hourly_price NOT BETWEEN 0 AND 1000000
     OR v_extra NOT BETWEEN 0 AND 1000000
     OR p_hourly_price * p_hours + v_extra > 1000000 THEN
    RAISE EXCEPTION 'invalid_amount' USING ERRCODE = '22023';
  END IF;

  -- 투표에서 왔으면 그 투표가 있어야 하고, 연습실이 비었으면 결정된 곳으로
  IF p_vote_id IS NOT NULL THEN
    SELECT coalesce(v_studio, decided_studio_id) INTO v_studio FROM public.votes WHERE id = p_vote_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'invalid_vote' USING ERRCODE = '22023'; END IF;
  END IF;
  IF v_studio IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.studios WHERE id = v_studio) THEN
    RAISE EXCEPTION 'invalid_studio' USING ERRCODE = '22023';
  END IF;
  -- 합주 날짜는 앞뒤 60일(KST) 안만 남긴다
  IF v_played IS NOT NULL AND v_played NOT BETWEEN (now() AT TIME ZONE 'Asia/Seoul')::date - 60
                                              AND (now() AT TIME ZONE 'Asia/Seoul')::date + 60 THEN
    v_played := NULL;
  END IF;

  IF (SELECT count(*) FROM public.splits WHERE created_by_key = p_creator_key AND created_at > now() - interval '1 hour') >= 10
     OR (SELECT count(*) FROM public.splits WHERE created_at > now() - interval '1 hour') >= 300 THEN
    RAISE EXCEPTION 'rate_limited' USING ERRCODE = 'P0001';
  END IF;

  v_per := public.split_per_person(p_hourly_price, p_hours, p_people, v_extra);

  INSERT INTO public.splits (created_by_key, created_by_user, creator_token_hash, studio_id, vote_id,
                             hourly_price, hours, people, extra, per_person, played_on, country, language)
  VALUES (p_creator_key, auth.uid(), encode(sha256(convert_to(v_token, 'UTF8')), 'hex'), v_studio, p_vote_id,
          p_hourly_price, p_hours, p_people, v_extra, v_per, v_played,
          CASE WHEN p_country IN ('KR', 'JP', 'GLOBAL') THEN p_country ELSE 'KR' END,
          CASE WHEN p_language IN ('ko', 'ja', 'en') THEN p_language ELSE 'ko' END)
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('id', v_id, 'creator_token', v_token, 'per_person', v_per);
END;
$$;

-- ── 2. 보기 ──────────────────────────────────────────────────
-- 링크를 가진 누구나. payer_key는 내보내지 않고 내 줄(p_payer_key 일치)만 is_mine으로 표시
CREATE OR REPLACE FUNCTION public.get_split(p_split_id uuid, p_payer_key text DEFAULT NULL, p_creator_token text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s public.splits%ROWTYPE;
BEGIN
  SELECT * INTO s FROM public.splits WHERE id = p_split_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  RETURN jsonb_build_object(
    'id', s.id,
    'studio_id', s.studio_id,
    'vote_id', s.vote_id,
    'hourly_price', s.hourly_price,
    'hours', s.hours,
    'people', s.people,
    'extra', s.extra,
    'total', (s.hourly_price * s.hours + s.extra)::integer,
    'per_person', s.per_person,
    'played_on', s.played_on,
    'created_at', s.created_at,
    'expires_at', s.expires_at,
    'is_expired', s.expires_at < now(),
    'is_creator', p_creator_token IS NOT NULL
                  AND s.creator_token_hash = encode(sha256(convert_to(p_creator_token, 'UTF8')), 'hex'),
    'payers', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
               'nickname', p.nickname,
               'paid', p.paid,
               'is_mine', p_payer_key IS NOT NULL AND p.payer_key = p_payer_key
             ) ORDER BY p.created_at)
      FROM public.split_payers p WHERE p.split_id = s.id
    ), '[]'::jsonb)
  );
END;
$$;

-- ── 3. 냈어요 체크 ───────────────────────────────────────────
-- 같은 기기는 덮어쓰기(닉네임 수정·냈어요 끄고 켜기)
-- 반환: 'saved' | 'not_found' | 'expired' | 'full'(20명) | 'invalid'
CREATE OR REPLACE FUNCTION public.toggle_split_paid(
  p_split_id  uuid,
  p_payer_key text,
  p_nickname  text,
  p_paid      boolean,
  p_country   text DEFAULT 'KR',
  p_language  text DEFAULT 'ko'
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s public.splits%ROWTYPE;
  v_nick text := btrim(coalesce(p_nickname, ''));
BEGIN
  IF p_payer_key IS NULL OR char_length(p_payer_key) NOT BETWEEN 8 AND 64
     OR char_length(v_nick) NOT BETWEEN 1 AND 20 OR p_paid IS NULL THEN
    RETURN 'invalid';
  END IF;

  SELECT * INTO s FROM public.splits WHERE id = p_split_id FOR UPDATE; -- 20명 제한을 동시 요청에도 지키려고 잠금
  IF NOT FOUND THEN RETURN 'not_found'; END IF;
  IF s.expires_at < now() THEN RETURN 'expired'; END IF;

  IF NOT EXISTS (SELECT 1 FROM public.split_payers WHERE split_id = s.id AND payer_key = p_payer_key)
     AND (SELECT count(*) FROM public.split_payers WHERE split_id = s.id) >= 20 THEN
    RETURN 'full';
  END IF;

  INSERT INTO public.split_payers AS p (split_id, payer_key, payer_user, nickname, paid, country, language)
  VALUES (s.id, p_payer_key, auth.uid(), v_nick, p_paid,
          CASE WHEN p_country IN ('KR', 'JP', 'GLOBAL') THEN p_country ELSE 'KR' END,
          CASE WHEN p_language IN ('ko', 'ja', 'en') THEN p_language ELSE 'ko' END)
  ON CONFLICT (split_id, payer_key) DO UPDATE SET
    nickname = EXCLUDED.nickname,
    paid = EXCLUDED.paid,
    payer_user = coalesce(EXCLUDED.payer_user, p.payer_user),
    updated_at = now();

  RETURN 'saved';
END;
$$;

-- Supabase 기본 권한이 새 함수에 anon·authenticated EXECUTE를 자동으로 주므로 PUBLIC만으로는 부족하다(11_security_hardening과 같은 이유)
REVOKE ALL ON FUNCTION public.split_per_person(integer, numeric, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_split(text, integer, numeric, integer, integer, uuid, uuid, date, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_split(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.toggle_split_paid(uuid, text, text, boolean, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_split(text, integer, numeric, integer, integer, uuid, uuid, date, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_split(uuid, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_split_paid(uuid, text, text, boolean, text, text) TO anon, authenticated;
-- split_per_person은 RPC 안에서만 쓴다(정의자 권한으로 실행) — anon·authenticated에 열지 않음
