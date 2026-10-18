-- ============================================================
-- 온라인 잼 방 (모집글형). 밴드찾기 > 온라인 잼 탭.
-- 호스트가 방을 열고 다른 사람이 참가한다. SonoBus 방 이름·비밀번호는 저장하지 않고
-- 서버(/api/jam-sessions/[id]/room)가 세션 id + SONOBUS_ROOM_SECRET HMAC으로 만들어 호스트·참가자에게만 준다.
--
-- 정책:
--   - 두 테이블 모두 읽기 공개 (목록·인원 표시)
--   - 방 생성: 본인을 host_id로만 / 수정(마감): 호스트만
--   - 참가: join_jam_session() RPC로만 (정원 검사를 행 잠금으로 원자적으로). 직접 INSERT 정책 없음
--   - 나가기: 본인 참가 행만 DELETE
-- 여러 번 실행해도 안전(idempotent). ⚠️ 단, 아래 DROP 때문에 다시 실행하면 잼 방 데이터가 지워진다.
-- ============================================================

-- 2026-04 옛 잼 기능의 테이블(앱 코드 미사용, 테스트 세션 8건·참가 0건)을 사용자 승인 하에 제거하고 새로 만든다.
-- CASCADE로 chat_messages_jam_session_id_fkey 제약도 함께 빠진다(chat_messages.jam_session_id 컬럼과 값은 남음, 연결된 메시지 0건).
DROP TABLE IF EXISTS public.jam_participants CASCADE;
DROP TABLE IF EXISTS public.jam_sessions CASCADE;

CREATE TABLE IF NOT EXISTS public.jam_sessions (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id            uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title              text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 60),
  description        text CHECK (description IS NULL OR char_length(description) <= 300),
  instruments_wanted text[] NOT NULL DEFAULT '{}',
  starts_at          timestamptz NOT NULL,
  capacity           smallint NOT NULL DEFAULT 4 CHECK (capacity BETWEEN 2 AND 8), -- 호스트 포함 총원
  status             text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  country            text NOT NULL DEFAULT 'KR',
  language           text NOT NULL DEFAULT 'ko',
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS jam_sessions_open_starts_idx
  ON public.jam_sessions (starts_at) WHERE status = 'open';

CREATE TABLE IF NOT EXISTS public.jam_participants (
  session_id uuid NOT NULL REFERENCES public.jam_sessions(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  country    text NOT NULL DEFAULT 'KR',
  language   text NOT NULL DEFAULT 'ko',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (session_id, user_id)
);

CREATE INDEX IF NOT EXISTS jam_participants_user_idx ON public.jam_participants (user_id);

ALTER TABLE public.jam_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jam_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS jam_sessions_select ON public.jam_sessions;
CREATE POLICY jam_sessions_select ON public.jam_sessions
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS jam_sessions_insert_own ON public.jam_sessions;
CREATE POLICY jam_sessions_insert_own ON public.jam_sessions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = host_id AND status = 'open');

DROP POLICY IF EXISTS jam_sessions_update_host ON public.jam_sessions;
CREATE POLICY jam_sessions_update_host ON public.jam_sessions
  FOR UPDATE TO authenticated USING (auth.uid() = host_id) WITH CHECK (auth.uid() = host_id);

DROP POLICY IF EXISTS jam_participants_select ON public.jam_participants;
CREATE POLICY jam_participants_select ON public.jam_participants
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS jam_participants_delete_own ON public.jam_participants;
CREATE POLICY jam_participants_delete_own ON public.jam_participants
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 참가: 세션 행을 잠그고 정원을 확인한 뒤 넣는다. 동시에 눌러도 정원을 넘지 않는다.
-- 반환: 'joined' | 'already' | 'full' | 'closed' | 'host' | 'not_found'
CREATE OR REPLACE FUNCTION public.join_jam_session(p_session_id uuid, p_country text DEFAULT 'KR', p_language text DEFAULT 'ko')
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_session public.jam_sessions%ROWTYPE;
  v_count int;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_session FROM public.jam_sessions WHERE id = p_session_id FOR UPDATE;
  IF NOT FOUND THEN RETURN 'not_found'; END IF;
  IF v_session.host_id = v_uid THEN RETURN 'host'; END IF;
  IF EXISTS (SELECT 1 FROM public.jam_participants WHERE session_id = p_session_id AND user_id = v_uid) THEN
    RETURN 'already';
  END IF;
  IF v_session.status <> 'open' THEN RETURN 'closed'; END IF;

  SELECT count(*) INTO v_count FROM public.jam_participants WHERE session_id = p_session_id;
  IF v_count + 1 >= v_session.capacity THEN RETURN 'full'; END IF; -- +1 = 호스트

  INSERT INTO public.jam_participants (session_id, user_id, country, language)
  VALUES (p_session_id, v_uid, coalesce(p_country, 'KR'), coalesce(p_language, 'ko'));
  RETURN 'joined';
END;
$$;

REVOKE ALL ON FUNCTION public.join_jam_session(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_jam_session(uuid, text, text) TO authenticated;
