-- ============================================================
-- 웹 푸시 발송 기록 (재방문 ③ PR 2 — 즉시 발송). 설계: docs/PLAN_notifications.md
-- 같은 알림을 두 번 보내지 않기 위한 장부. 발송 서버(app/api/push/notify, service key)만 쓰고 읽는다.
--   event 예: 'response:<10분 구간 번호>'(멤버 응답 → 만든 사람, 10분에 1번)
--             'decided:<연습실 id>'(결정 → 멤버, 결정이 바뀌면 그 연습실로 1번 더)
--             PR 3: 'reminder:<날짜>'(전날) · 'unpaid'(정산 미납, 1번)
-- 저장: 구독 id·대상·event·결과·시각. 알림 문구·endpoint는 저장하지 않는다.
--
-- 정책: RLS 켜고 정책 없음 + anon/authenticated 권한 REVOKE (RPC도 없음 — 클라이언트는 이 테이블에 닿을 길이 없다)
-- 여러 번 실행해도 안전(idempotent). DROP 없음.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.push_log (
  subscription_id uuid NOT NULL REFERENCES public.push_subscriptions(id) ON DELETE CASCADE,
  kind            text NOT NULL CHECK (kind IN ('vote', 'split')),
  target_id       uuid NOT NULL,
  event           text NOT NULL CHECK (char_length(event) BETWEEN 1 AND 80),
  status          text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
                  -- pending: 자리 잡음(중복 방지) → sent | failed(재시도 안 함). 404·410이면 구독을 지워 이 행도 같이 사라짐
  country         text NOT NULL DEFAULT 'KR',
  language        text NOT NULL DEFAULT 'ko',
  created_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (subscription_id, kind, target_id, event)
);
CREATE INDEX IF NOT EXISTS push_log_created_idx ON public.push_log (created_at);

ALTER TABLE public.push_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.push_log FROM anon, authenticated;
