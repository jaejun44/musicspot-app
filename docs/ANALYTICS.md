# Analytics 이벤트 트래킹

모든 이벤트는 `lib/analytics/`의 **`track()` 하나**로 나가고, **GA4 + Amplitude + Supabase `user_events`** 세 곳에 동시 기록된다.

```
lib/analytics/
  events.ts    이벤트 스키마 (이름 + 속성 타입) — 단일 소스
  context.ts   공통 속성 자동 첨부 · 유저 속성 동기화
  index.ts     track() 진입점 + 연습실 레거시 래퍼
```

## 사용법

```typescript
import { track } from '@/lib/analytics';

track('challenge_upload_complete', {
  project_id: projectId,
  track_order: trackOrder,
  source: 'record',
  section,
  has_instrument: true,
});
```

- **이벤트명·속성은 `EventSchema`가 강제한다.** 오타나 속성 누락은 컴파일 에러.
- **`country` / `locale` / `page` / `is_logged_in` / `utm_*`는 직접 넣지 말 것.** 자동 첨부된다.
- 속성이 없는 이벤트는 인자 생략: `track('auth_logout')`
- 새 이벤트는 반드시 `events.ts`에 먼저 정의한다. **배포된 이름은 바꾸지 않는다** (Amplitude 차트가 문자열에 묶여 있어 과거 데이터와 끊긴다).

---

## 공통 속성 (모든 이벤트 자동 첨부)

| 속성 | 값 | 비고 |
|------|-----|------|
| `page` | `window.location.pathname` | 쿼리 제외 (검색어·토큰 PII 방어) |
| `referrer_host` | 호스트만 (`direct`/`internal`/도메인) | 전체 URL 안 보냄 |
| `locale` | `ko` / `ja` | `getClientLocale()` |
| `country` | IP 국가 (`ms_country` 쿠키) 또는 `unknown` | 한일 비교의 축 |
| `is_logged_in` | boolean | `setAnalyticsUserId()` 캐시 기반 |
| `is_pwa` | boolean | `display-mode: standalone` |
| `utm_source/medium/campaign/content` | 현재 URL에 있을 때만 | 인플루언서 = `utm_content` |

## 유저 속성 (Amplitude)

`syncUserProperties(userId)` — 로그인 직후 · 온보딩/프로필 저장 후 호출.

| 속성 | 소스 |
|------|------|
| `language` / `country` | 쿠키 |
| `challenge_score` | `user_challenge_score.score` |
| `title_count` | `user_titles` count |
| `has_band` | `band_members` count > 0 |
| `has_profile` | `user_profiles` 존재 여부 |
| `stem_track_count` | `stem_tracks` count |
| `signup_date` | `user_profiles.created_at` (`setOnce` — 코호트 기준일) |

누적 카운터는 `incrementUserProperty(key)`: `stem_track_count`, `challenge_created_count`, `post_count`.

---

## 이벤트 목록

### 8마디 챌린지 (최우선 — 4단계 깔때기 전체를 관통)

| 이벤트 | 트리거 | 파일 |
|--------|--------|------|
| `challenge_list_view` | `/stems` 목록 로드 (세션 1회). 로그인 여부는 공통 속성 `is_logged_in`을 볼 것 | `StemsClient.tsx` |
| `challenge_project_view` | 프로젝트 상세 오픈. `entry`로 `list`/`deeplink` 구분 | `StemsClient.tsx` |
| `challenge_play` | 합주 재생 시작 (소비 지표) | `ProjectDetailModal.tsx` |
| `challenge_create_start` | 생성 모달 오픈 | `StemsClient.tsx` |
| `challenge_create_complete` | 프로젝트 생성 = 릴레이 시작 | `CreateProjectModal.tsx` |
| `challenge_upload_start` | 업로드 버튼 클릭 | `TrackUploadPanel.tsx` |
| `challenge_upload_complete` | **패스 1회 = K-factor 분자** | `TrackUploadPanel.tsx` |
| `challenge_upload_fail` | `size_limit`/`storage_error`/`insert_error` | `TrackUploadPanel.tsx` |
| `challenge_share` | 채널별 (`kakao`/`x`/`line`/`native`/`copy`) | `ProjectDetailModal.tsx` |
| `challenge_login_cta_click` | 비로그인 → "이어서 8마디" | `ProjectDetailModal.tsx`, `StemsClient.tsx` |
| `challenge_open_toggle` | 릴레이 오픈/마감 | `ProjectDetailModal.tsx` |
| `challenge_track_delete` | 트랙 삭제 | `ProjectDetailModal.tsx` |
| `challenge_cta_click` | 예약 완료 화면 → 8마디 유도 | `CompleteClient.tsx` |

**핵심 퍼널**: `challenge_project_view(entry=deeplink)` → `challenge_login_cta_click` → `auth_login_success` → `challenge_upload_complete`
→ 이 4단계가 바이럴 루프. 각 구간 전환율이 K-factor를 결정한다.

### 인증 · 온보딩

| 이벤트 | 트리거 | 파일 |
|--------|--------|------|
| `auth_login_view` | 로그인 화면. `return_to` 有 = 딥링크 유입 | `LoginClient.tsx` |
| `auth_login_start` | 카카오/구글/이메일 시도 | `LoginClient.tsx` |
| `auth_login_success` | 콜백 성공. `is_new_user`(생성 60초 이내) | `app/auth/callback/page.tsx` |
| `auth_login_fail` | 시도 실패 | `LoginClient.tsx`, `callback` |
| `auth_logout` | `SIGNED_OUT` | `AmplitudeProvider.tsx` |
| `onboarding_view` / `onboarding_complete` / `onboarding_skip` | 온보딩 모달 | `OnboardingModal.tsx` |
| `profile_save` | 프로필 편집 저장 | `ProfileEditModal.tsx` |

### 밴드매칭 · DM

| 이벤트 | 트리거 | 파일 |
|--------|--------|------|
| `match_list_view` | 매칭 목록 로드. `musician_count`=공급량 | `BandMatchingClient.tsx` |
| `match_contact_click` | 연락하기 (`open_modal`/`kakao`/`dm`) | `MusicianCard.tsx`, `ChatModal.tsx` |
| `profile_page_view` | `/u/[id]`. `is_self`로 본인 조회 분리 | `UserProfileClient.tsx` |
| `dm_open` | 대화 오픈. `is_first`=이력 없음 | `ChatModal.tsx` |
| `dm_send` | **첫 메시지(`is_first`)가 매칭 성사 판정** | `ChatModal.tsx` |
| `follow_toggle` | 팔로우/언팔로우 | `MusicianCard.tsx` |
| `match_signal_send` / `match_mutual` | ⏳ `user_mutual_responses` UI 구현 시 연결 (스키마만 예약) | — |

### 커뮤니티 · 피드 · 명예

| 이벤트 | 트리거 | 파일 |
|--------|--------|------|
| `community_list_view` | 커뮤니티 목록 | `CommunityClient.tsx` |
| `post_view` | 글 상세. `is_own` 분리 | `PostDetailClient.tsx` |
| `post_write_start` / `post_publish` | 글쓰기 시작/발행 | `CommunityClient.tsx`, `WritePostModal.tsx` |
| `post_like` / `post_comment` | 좋아요·댓글 | `CommunityClient.tsx`, `CommentSection.tsx` |
| `feed_view` | 팔로잉 피드. `item_count=0` 비율 주시 | `FeedClient.tsx` |
| `leaderboard_view` | 주간 리더보드 노출 | `LeaderboardThrowers.tsx` |

### 연습실 (기존 — 이름 변경 금지)

`studio_view` · `contact_click` · `search` · `filter_apply` · `view_toggle` · `load_more` · `favorite_toggle` · `map_marker_click` · `hot_room_click` · `coming_soon_click` · `booking_attempt` · `booking_start` · `payment_select` · `booking_complete`

호출부는 `lib/analytics/index.ts`의 `track*()` 래퍼를 그대로 쓴다 (내부에서 `track()` 호출).

### 공통 UX

`locale_switch` · `pwa_install_prompt` · `share_click` · `report_submit` · `feedback_submit`

---

## 개인정보 원칙

- **본문 텍스트를 이벤트에 넣지 않는다.** DM·댓글·게시글은 `lengthBucket()`으로 `short`/`medium`/`long`만.
- `page`는 pathname만 (쿼리스트링 제외). `referrer`는 호스트만.
- 에러 메시지는 80자로 자르고, 실패 사유는 가급적 고정 코드값(`size_limit` 등)으로.

---

## Amplitude (Analytics + Session Replay)

`@amplitude/unified` 단일 패키지. 초기화는 `components/AmplitudeProvider.tsx`(루트 레이아웃 1회 마운트),
설정 상수는 `lib/amplitude.ts`.

| 항목 | 값 |
|------|-----|
| 환경변수 | `NEXT_PUBLIC_AMPLITUDE_API_KEY` (클라이언트 write key — 브라우저 노출 정상) |
| autocapture | `true` — 페이지뷰·클릭·폼 자동 수집 |
| Session Replay | `sampleRate: 1` (**100% 녹화**) |
| user_id | Supabase `user.id`. `onAuthStateChange`로 갱신, 로그아웃 시 `amplitude.reset()` |

### 주의사항

- **키 미설정 시 Amplitude만 비활성.** `AMPLITUDE_ENABLED=false`여도 GA4·`user_events`·`setAnalyticsUserId`는 정상 동작한다
  (init 없이 `track()`을 부르면 SDK 내부 `dispatchQ`에 무한 적립되므로 Amplitude 호출만 건너뛴다).
- **init 순서 걱정 불필요.** `initAll()`이 async여도 그 전 `track()`은 `dispatchQ`가 버퍼링 후 flush.
- **Session Replay 프라이버시.** `<input>` 값은 기본 마스킹(medium)이 가리지만 **div 텍스트는 안 가려진다.**
  개인정보가 뜨는 영역엔 `SR_MASK_CLASS` 적용 필수. 현재: 1:1 DM 말풍선 (`ChatModal.tsx`).
  ⚠️ 개인정보 노출 화면을 새로 만들 때마다 검토할 것.
- **sampleRate 1은 초기 단계 의도.** 트래픽 늘면 비용·용량 때문에 낮춰야 한다.

---

## Supabase `user_events`

마이그레이션: `supabase/08_user_events_props.sql` (적용 완료)

| 컬럼 | 용도 |
|------|------|
| `event_type` | 이벤트명 |
| `props` (jsonb) | **속성 전체** (공통 속성 포함). 신규 이벤트는 여기만 본다 |
| `user_id` / `country` / `language` | 세그먼트 축 |
| `studio_id` / `studio_name` / `click_type` / `search_query` | 레거시 전용 컬럼 (기존 쿼리 호환 유지) |

인덱스: `(event_type, created_at desc)`, `(user_id, created_at desc)`, `gin(props)`

```sql
-- 예: 채널별 8마디 공유 수
select props->>'channel' as channel, count(*)
from user_events
where event_type = 'challenge_share' and created_at > now() - interval '7 days'
group by 1 order by 2 desc;
```

---

## UTM 표준
- `utm_source` / `utm_medium` / `utm_campaign` / `utm_content`
- 인플루언서: `utm_content={influencer_id}`
- 모든 공유 버튼 자동 삽입 (`lib/share-utm.ts`, `KakaoShareButton` 참조)
- 모든 이벤트에 자동 첨부되므로 별도 처리 불필요
