/**
 * 이벤트 스키마 단일 소스.
 *
 * 여기 정의된 이름·속성만 track()에 넘길 수 있다. 오타나 속성 누락은 컴파일 에러.
 * Amplitude 차트는 이벤트명·속성 문자열에 그대로 묶이므로, 한 번 배포된 이름은
 * 바꾸지 말고 새 이름을 추가할 것 (이름을 바꾸면 과거 데이터와 끊긴다).
 *
 * 명명 규칙: `<도메인>_<객체>_<동작>` 소문자 snake_case.
 *   도메인 = studio / challenge / auth / match / dm / community / feed / honor
 */

// ─── 공통 값 타입 ────────────────────────────────────────────────
/** 텍스트 길이를 그대로 보내지 않고 버킷으로 (개인정보·카디널리티 방어) */
export type LengthBucket = 'short' | 'medium' | 'long';

/** 해당 화면에 어떤 경로로 들어왔는가 */
export type EntrySource = 'list' | 'deeplink' | 'share' | 'feed' | 'profile' | 'notification';

export type ShareChannel = 'copy' | 'x' | 'line' | 'kakao' | 'native';

/** 8마디 업로드 경로. TrackUploadPanel의 UploadMode와 1:1 대응 */
export type UploadSource = 'file' | 'record' | 'youtube' | 'jam';

// ─── 이벤트 스키마 ───────────────────────────────────────────────
export type EventSchema = {
  // ── 연습실 (기존 — 이름 변경 금지) ──────────────────────────
  studio_view: { studio_id: string; studio_name: string };
  contact_click: { type: 'source' | 'naver' | 'kakao' | 'phone'; studio_id: string };
  search: { method: 'gps' | 'text'; query?: string };
  filter_apply: { filter_type: string; value: string };
  view_toggle: { view: 'list' | 'map' };
  load_more: { current_count: number };
  favorite_toggle: { action: 'add' | 'remove'; studio_id: string };
  map_marker_click: { studio_id: string; studio_name: string };
  hot_room_click: { studio_id: string; studio_name: string };
  coming_soon_click: { tab_name: 'band_matching' | 'community' };
  booking_attempt: { studio_id: string; studio_name: string };
  booking_start: { studio_id: string; studio_name: string };
  payment_select: { method: 'card' | 'bank' | 'kakao'; studio_id: string };
  booking_complete: { studio_id: string; studio_name: string; value?: number };

  // ── 8마디 챌린지 (Stage 1~4 관통 OS — 최우선 계측) ──────────
  /** 챌린지 목록 진입 */
  challenge_list_view: { project_count: number; is_logged_in_view: boolean };
  /** 프로젝트 상세(모달) 열람. entry로 딥링크/공유 유입 분리 → K-factor 분모 */
  challenge_project_view: {
    project_id: string;
    genre?: string;
    bpm?: number;
    pass_count: number;
    track_count: number;
    is_open: boolean;
    entry: EntrySource;
  };
  /** 합주 재생 (앙상블/단일 트랙) — 소비 지표 */
  challenge_play: { project_id: string; mode: 'ensemble' | 'single'; track_count: number };
  /** 프로젝트 생성 모달 열기 */
  challenge_create_start: Record<string, never>;
  /** 프로젝트 생성 완료 = 릴레이 시작점 */
  challenge_create_complete: {
    project_id: string;
    genre?: string;
    bpm?: number;
    key_signature?: string;
  };
  /** 업로드 버튼을 누른 시점 (전송 시작) */
  challenge_upload_start: { project_id: string; track_order: number; source: UploadSource };
  /** 업로드 완료 = 패스 1회. 이게 K-factor의 분자 */
  challenge_upload_complete: {
    project_id: string;
    track_order: number;
    source: UploadSource;
    section: number;
    has_instrument: boolean;
  };
  /** reason은 자유 문자열 금지 — 카디널리티 폭발 방지 위해 아래 코드값만 */
  challenge_upload_fail: {
    project_id: string;
    source: UploadSource;
    reason: 'size_limit' | 'storage_error' | 'insert_error';
  };
  /** 공유 — channel별로 나눠 일본 X/LINE 루프 성능 측정 */
  challenge_share: { project_id: string; channel: ShareChannel; just_added: boolean };
  /** 비로그인 상태에서 "이어서 8마디 만들기" CTA 클릭 = 바이럴→가입 전환 지점 */
  challenge_login_cta_click: { project_id: string };
  /** 릴레이 오픈/마감 토글 (방장) */
  challenge_open_toggle: { project_id: string; is_open: boolean };
  challenge_track_delete: { project_id: string; track_id: string };

  // ── 인증 · 온보딩 (Stage 1 MAU의 분모) ──────────────────────
  auth_login_view: { return_to?: string };
  auth_login_start: { provider: string };
  auth_login_success: { provider: string; is_new_user: boolean };
  auth_login_fail: { provider: string; reason: string };
  auth_logout: Record<string, never>;
  /** 온보딩 모달 노출 */
  onboarding_view: Record<string, never>;
  /** 온보딩 완료. is_public=false면 매칭 풀에 안 들어가므로 Stage 2 전환에서 빠진다 */
  onboarding_complete: {
    has_instrument: boolean;
    has_genre: boolean;
    has_region: boolean;
    has_purpose: boolean;
    is_public: boolean;
  };
  /** 건너뛰기 = 프로필 비공개로 저장. 온보딩 개선 우선순위의 근거 */
  onboarding_skip: Record<string, never>;
  /** 프로필 저장 (편집 모달) */
  profile_save: {
    has_instrument: boolean;
    has_genre: boolean;
    has_region: boolean;
    has_avatar: boolean;
    has_bio: boolean;
  };

  // ── 밴드매칭 · DM ("Music Spot에서 만난 밴드" KPI) ───────────
  match_list_view: { musician_count: number; position_filter?: string };
  /** 관심 신호 전송 — user_mutual_responses UI 구현 시 연결 (현재 미사용) */
  match_signal_send: { target_user_id: string; position?: string };
  /** 상호 응답 성립 = 매칭 성공 — 위와 동일하게 구현 대기 */
  match_mutual: { target_user_id: string };
  match_contact_click: { target_user_id: string; type: 'open_modal' | 'kakao' | 'dm' };
  dm_open: { thread_user_id: string; is_first: boolean };
  /** 첫 메시지(is_first)가 매칭→대화 전환의 핵심 */
  dm_send: { thread_user_id: string; is_first: boolean; length_bucket: LengthBucket };

  // ── 커뮤니티 · 피드 (리텐션) ────────────────────────────────
  community_list_view: { category?: string; post_count: number };
  post_view: { post_id: string; category?: string; is_own: boolean };
  post_write_start: { category?: string };
  post_publish: { category: string; has_tags: boolean; length_bucket: LengthBucket };
  post_like: { post_id: string; action: 'add' | 'remove' };
  post_comment: { post_id: string; length_bucket: LengthBucket };
  feed_view: { item_count: number };
  follow_toggle: { target_user_id: string; action: 'follow' | 'unfollow' };

  // ── 명예 시스템 ─────────────────────────────────────────────
  leaderboard_view: { tab: string };
  profile_page_view: { target_user_id: string; is_self: boolean };

  // ── 공통 UX ────────────────────────────────────────────────
  locale_switch: { from: string; to: string };
  pwa_install_prompt: { action: 'shown' | 'accepted' | 'dismissed' };
  /** 연습실 등 8마디 외 공유. 챌린지 공유는 challenge_share를 쓸 것 */
  share_click: { channel: ShareChannel; target: 'studio'; studio_id?: string };
  report_submit: { target_type: 'studio'; report_type: string; studio_id?: string };
  feedback_submit: Record<string, never>;
  /** 예약 완료 화면 등에서 8마디로 유도하는 CTA — 대관→커뮤니티 전환 측정 */
  challenge_cta_click: { source: string };
};

export type EventName = keyof EventSchema;

// ─── 헬퍼 ────────────────────────────────────────────────────────
/** 텍스트 길이 → 버킷. 원문 길이를 그대로 보내지 않는다. */
export function lengthBucket(text: string): LengthBucket {
  const n = text.trim().length;
  if (n < 30) return 'short';
  if (n < 150) return 'medium';
  return 'long';
}
