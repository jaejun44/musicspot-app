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
| `utm_source/medium/campaign/content` | 탭 세션에서 최근 명시적 캠페인을 유지 | 인플루언서 = `utm_content` |

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

- `booking_realtime_click` (2026-09-29 추가): 연습실 상세의 "실시간 예약" → `/booking/s/:id`. `RoomBookingWidget.tsx`.
- `room_unavailable_view` / `room_unavailable_click` (2026-10-26 추가): 비공개(폐업·모집 끝난 광고) 연습실 주소로 들어온 화면. view는 `nearby_count`(대안 수), click은 `to: studio | region | search`(+`to_studio_id`). `UnavailableRoom.tsx`. 이동률 = click 세션 / view 세션
  외부 링크 이동(`booking_attempt`)과 분리한다. 실시간 예약 전환율의 분모다.
- `return_strip_view` / `return_strip_click` (2026-11-06 추가): 홈·검색 상단 "최근 본 / 찜한 연습실" 스트립(`components/ReturnStrip.tsx`). `kind: recent | favorite`. view는 목록이 있을 때 kind별로 화면당 1회(`count` = 보인 카드 수), click은 `studio_id`. 처음 온 사람에게는 안 보이므로 view 세션 = 재방문 세션의 근사치다. 클릭률 = click 세션 / view 세션
- `compare_view` / `compare_click` (2026-11-06 추가): 연습실 상세 위치 아래 "근처 비슷한 연습실" 비교 블록(`RoomCompare.tsx`, 최대 3곳). view는 `studio_id`(보고 있는 곳)·`count`, click은 `studio_id`(이동한 곳). 상세→상세 이동률 = click 세션 / view 세션. 세션당 상세 조회의 직접 원인 지표
- `candidate_toggle` (2026-11-06 추가): 합주 후보 담기/해제(`CandidateToggle.tsx`·후보 시트 빼기). `on`·`count`(바뀐 뒤 후보 수, 최대 5). 가득 차서 거부된 시도는 보내지 않는다. 후보 2곳 이상 세션 = Phase C 투표 링크의 잠재 분모
- `vote_create` · `vote_share` · `vote_view` · `vote_submit` · `vote_decide` · `vote_to_contact` (2026-11-06 추가): 합주 후보 투표(`/vote/[id]`). 모두 `vote_id`를 담는다
  - `vote_create {vote_id, count}`: 후보 시트(`VoteCreatePanel.tsx`)에서 링크 생성
  - `vote_share {vote_id, channel: kakao|copy}`: 만든 사람 화면 공유
  - `vote_view {vote_id, is_creator}`: is_creator=false = 단톡방 링크로 들어온 멤버
  - `vote_submit {vote_id, is_update}` / `vote_decide {vote_id, studio_id}` / `vote_to_contact {vote_id, studio_id}`(결정 화면 → 상세)
  - **투표 링크 1개당 유입** = `vote_view`(is_creator=false)의 distinct anon_id / `vote_create` 수
  - 응답자 구분은 분석에 안 실리는 기기 키(`ms_vk`)라 이벤트의 anon_id와 다르다. 재방문 집계는 이벤트의 anon_id로
- `vote_band_save {vote_id, is_new_band}` (2026-11-06 추가): 결정된 투표 → 내 밴드 합주 일정 저장(로그인, `VoteSaveToBand.tsx`)
- `return_strip_*.placement` (2026-11-08 추가, 선택): `home` | `search` | `region` | `room` — 스트립이 붙은 화면. 지역·상세는 검색으로 바로 들어오는 재방문자의 착지 페이지. 상세에서는 지금 보는 연습실을 뺀다. 그 이전 행은 비어 있음(= 홈·검색)
- `calendar_add {from: vote|band, method: google|ics}` (2026-11-08 추가): 결정된 투표·밴드 일정 → 내 캘린더(`components/AddToCalendar.tsx`, `lib/calendar.ts`). 캘린더 메모 링크로 돌아온 방문은 `utm_source=calendar`(campaign `vote`, 밴드 일정 자체 링크는 `utm_content=band`)
- `ask_members_click {studio_id, from: booking_widget|info_card|return_nudge, candidate_count}` · `ask_members_nudge_view {studio_id}` · `ask_members_nudge_dismiss {studio_id}` (2026-11-08 추가): 상세 "📣 멤버한테 물어보기"(`AskMembersButton`·`AskMembersSheet`). nudge = 외부 문의(전화 제외) 후 10초~30분 안에 같은 상세로 돌아왔을 때 세션당 1회
  - `vote_create.source` (2026-11-08 추가, 선택): `ask_members` | `candidate_bar` | `followup` | `split` — 그 이전 행은 비어 있음
  - **입구별 투표 생성** = `vote_create`를 `source`로 묶기. 넛지 효과 = `ask_members_click(from=return_nudge)` / `ask_members_nudge_view`
- 합주비 정산 (2026-11-08 추가, `/split/[id]`, `app/split/`·`lib/split.ts`) — 금액·이름·토큰은 담지 않는다
  - `split_open {from: vote|room}`: "🧮 합주비 계산" 시트 열기(결정된 투표 카드 / 상세 요금 줄)
  - `split_create {people, has_vote}`: 정산 링크 만들기 성공
  - `split_share {channel: kakao|copy}`: 만든 사람의 단톡방 공유(링크는 `utm_campaign=split`)
  - `split_view {is_creator}`: 정산 화면 첫 로드 1회
  - `split_paid_toggle {on}`: [냈어요] 체크·취소 저장 성공
  - `split_next_vote_click {}`: "🔁 다음 합주 정하기" 펼침 → 투표가 만들어지면 `vote_create {source: split}`
  - **정산 → 다음 투표 전환** = `split_next_vote_click` 대비 `vote_create(source=split)`. 멤버 참여 = `split_view(is_creator=false)`·`split_paid_toggle`
- 웹 푸시 구독 (2026-11-08 추가, `components/PushOptIn.tsx`·`lib/push.ts`, 설계 `docs/PLAN_notifications.md`) — endpoint·키는 담지 않는다
  - `push_prompt_view {where: vote_creator|vote_member|split, permission: default|denied|granted}`: "알림 받기" 카드 노출(지원 브라우저만, 켜져 있으면 안 보냄)
  - `push_permission {where, result: granted|denied}`: 권한 요청 결과(버튼 클릭 후)
  - `push_subscribe {kind: vote|split, where}`: 서버 저장 성공
  - 알림 클릭 유입(2026-11-08 PR 2): `utm_source=push`, `utm_campaign=vote`, `utm_content=response|decided`. 발송 건수는 이벤트가 아니라 `push_log`(status sent|failed)
  - **허용률** = `push_permission(granted)` / `push_prompt_view`. **미지원 비율**은 카드가 안 보여 이벤트가 없음 → 지원 여부는 PR 2 이후 알림 유입(`utm_source=push`)과 함께 본다
- `vote_admin_link_copy {vote_id, method: kakao|copy}` · `vote_admin_link_open {vote_id, valid}` (2026-11-06 추가): 만든 사람의 관리 링크(`/vote/<id>#k=…`, `VoteAdminLink.tsx`). open은 해시 토큰으로 들어온 첫 로드 1회, valid=false = 토큰 불일치(멤버 화면으로 표시). **토큰 값은 어떤 이벤트에도 담지 않는다**
- `vote_create`에 `is_followup`(다음 합주 투표를 이전 투표에 이어 만듦), `return_strip_*`에 `kind: vote`(홈 "진행 중인 투표", click은 `vote_id`) 추가
- `booking_start` · `payment_select` · `booking_complete`는 옛 목업(`/booking`·`/payment`·`/complete`)을 지우면서
  호출부가 없다. 이름 변경 금지 규칙에 따라 정의는 남긴다. 실시간 예약 결제가 붙으면 다시 쓴다.

호출부는 `lib/analytics/index.ts`의 `track*()` 래퍼를 그대로 쓴다 (내부에서 `track()` 호출).

### 공통 UX

`locale_switch` · `nav_tab_click` · `pwa_install_prompt` · `share_click` · `report_submit` · `feedback_submit`

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
- 모든 이벤트에 자동 첨부. 내부 이동에도 sessionStorage로 유지하며 새 UTM 링크 진입 시 이전 캠페인 전체를 교체한다. 저장소가 차단되면 현재 URL 값만 사용한다.

---

## 재방문 측정 (2026-11-05 추가)

`session_id`(`ms_sid`)는 sessionStorage라 탭을 닫으면 사라진다 → 비로그인 재방문을 구분할 수 없었다.
`user_events.props.anon_id`(`ms_aid`, localStorage)를 모든 이벤트에 붙인다. 마이그레이션 없음(jsonb).
- 시크릿 모드·저장소 차단이면 `anon_id = null` → 재방문 집계에서 제외(과소 집계 방향).
- 같은 사람이라도 기기·브라우저가 다르면 다른 사람으로 잡힌다. 로그인 유저는 `user_id`를 우선.
- 2026-11-05 이전 데이터에는 anon_id가 없다. 재방문 지표는 이 날짜 이후 코호트만 본다.

### 주간 재방문율 (첫 방문 주 기준, 7일 안에 다른 날 다시 온 비율)
```sql
with v as (
  select coalesce(user_id::text, props->>'anon_id') vid,
         date(created_at at time zone 'Asia/Seoul') d
  from user_events
  where created_at >= '2026-11-05' and (user_id is not null or props->>'anon_id' is not null)
    and user_agent !~* '(bot|spider|crawler|headless|lighthouse)'  -- 세션의 약 40%가 봇(2026-10 기준)
  group by 1, 2
), f as (select vid, min(d) first_d from v group by 1)
select date_trunc('week', f.first_d)::date cohort_week,
       count(*) visitors,
       count(*) filter (where exists (
         select 1 from v where v.vid = f.vid and v.d > f.first_d and v.d <= f.first_d + 7)) returned_d7,
       round(100.0 * count(*) filter (where exists (
         select 1 from v where v.vid = f.vid and v.d > f.first_d and v.d <= f.first_d + 7)) / count(*), 1) d7_pct
from f group by 1 order by 1;
```

### 투표 링크 재진입 (2026-11-06 추가, 재방문 루프 Phase D 판정)
같은 anon_id가 같은 투표를 **다른 날(KST)** 다시 연 경우 = 단톡방 링크·홈 스트립이 다음 방문의 입구가 된 것.
```sql
with v as (
  select props->>'anon_id' anon, props->>'vote_id' vote_id,
         (created_at at time zone 'Asia/Seoul')::date kst_day
  from user_events
  where event_type = 'vote_view' and props->>'anon_id' is not null
    and coalesce(props->>'utm_campaign', '') <> 'codex_qa'          -- QA 제외
    and user_agent !~* '(bot|spider|crawler|headless|lighthouse)'  -- 봇 제외(위 재방문 쿼리와 같은 기준)
)
select count(*) filter (where days >= 2) reentered, count(*) viewers
from (select anon, vote_id, count(distinct kst_day) days from v group by 1, 2) t;
```
- 다음 투표로 이어진 경우(옛 링크 → 새 투표)는 `votes.parent_vote_id`로 묶어서 본다

