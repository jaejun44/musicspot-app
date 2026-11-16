/**
 * 8마디 트랙 1개를 올릴 때 받는 점수 (2026-11-16 결정 — 임시 기준, 바꿀 수 있음. docs/PHASES.md).
 * stem_tracks.challenge_score에 넣으면 DB 트리거 trg_update_challenge_score가 user_challenge_score의
 * total_score·weekly_score에 더한다. DB CHECK가 0 또는 이 값만 받는다(supabase/22_stem_loop.sql) —
 * 값을 바꾸려면 CHECK도 같이 바꿔야 한다.
 * 업로드 경로 3곳(파일·녹음·함께 / 유튜브 링크 / 백킹 잼)이 모두 이 상수를 쓴다. 반주는 트랙이 아니라 점수 없음.
 */
export const TRACK_UPLOAD_SCORE = 10;
