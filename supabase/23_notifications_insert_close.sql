-- 23_notifications_insert_close.sql — 알림 쓰기 정책 닫기 (2026-11-17)
-- 문제: notifications_insert_auth (WITH CHECK auth.uid() IS NOT NULL) 때문에 로그인한 누구나 남 앞으로 알림을 만들 수 있었다(가짜 알림).
-- 알림은 전부 DB 트리거 함수(SECURITY DEFINER, 소유자 postgres = BYPASSRLS)가 만든다 → 정책이 없어도 그대로 생성된다.
--   trg_notify_user_follow · trg_notify_post_like · trg_notify_post_comment · trg_notify_direct_message · trg_notify_match
--   trg_notify_booking_complete · trg_notify_booking_challenge_nudge · trg_track_mutual_response · trg_notify_track_reply(22)
-- 브라우저에서 직접 만들던 곳(MusicianCard 팔로우)은 PR #52에서 지웠다.
-- ⚠️ 적용 순서: PR #52가 머지·운영 배포된 뒤에 적용한다. 먼저 닫으면 옛 코드가 열린 브라우저에서 팔로우할 때
--    알림 insert가 거부된다(팔로우 자체는 되지만 콘솔 오류). docs/HANDOFF.md 참고.
-- 바뀌는 것: INSERT 정책 1개 삭제. 읽기(select_own)·읽음 처리(update_own) 정책, 테이블·행은 그대로.
-- 여러 번 실행해도 같은 결과.
-- 되돌리기:
--   CREATE POLICY notifications_insert_auth ON public.notifications FOR INSERT TO public WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS notifications_insert_auth ON public.notifications;
