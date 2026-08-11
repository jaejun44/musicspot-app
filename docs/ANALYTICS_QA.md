# 계측 배포 후 QA 체크리스트

새 이벤트는 **Amplitude에 한 번이라도 실제로 들어와야** 차트·퍼널을 만들 수 있다.
트래킹 플랜에 등록만 해둔 상태로는 쿼리 엔진이 `Invalid <event_name>`으로 거부한다.

배포 후 아래 시나리오를 **한 번씩** 밟으면 핵심 이벤트가 전부 발생한다. 10분이면 끝난다.

---

## 0. 사전 확인

- [ ] Vercel 배포 성공 (main 브랜치)
- [ ] 브라우저 콘솔에 `[amplitude] NEXT_PUBLIC_AMPLITUDE_API_KEY 미설정` 경고가 **없을 것**
  → 뜬다면 Vercel 환경변수에 키가 안 들어간 것. 이벤트가 GA4·Supabase로만 가고 Amplitude엔 안 감.
- [ ] Amplitude → Data → Events 에서 이벤트가 들어오는지 실시간 확인

---

## 1. 8마디 챌린지 (최우선)

**비로그인 상태로 시작할 것** — 바이럴 퍼널을 재현해야 한다.

- [ ] 시크릿 창에서 공유 링크로 진입 (`/stems/<project_id>`)
      → `challenge_project_view` (entry=**deeplink**), `challenge_list_view`
- [ ] 합주 재생 버튼 클릭 → `challenge_play`
- [ ] "이어서 8마디 만들기" 클릭 → `challenge_login_cta_click`
- [ ] 로그인 완료 → `auth_login_view` / `auth_login_start` / `auth_login_success`
- [ ] 파일 또는 녹음으로 8마디 업로드 → `challenge_upload_start` → `challenge_upload_complete`
- [ ] 업로드 직후 "내 마디 자랑하기" → `challenge_share` (channel=kakao 또는 copy)
- [ ] 목록에서 다른 프로젝트 열기 → `challenge_project_view` (entry=**list**)
- [ ] ➕ FAB로 새 프로젝트 생성 → `challenge_create_start` → `challenge_create_complete`

> `entry`가 deeplink와 list 양쪽으로 최소 1건씩 찍혀야 K-factor 분모를 나눌 수 있다.

**일본 모드도 확인** (우측 상단 JA 토글):
- [ ] JA 전환 → `locale_switch`
- [ ] 공유 → `challenge_share` (channel=**x**), LINE 버튼 → channel=**line**

---

## 2. 온보딩 · 프로필

- [ ] 신규 계정으로 가입 → `auth_login_success` (is_new_user=**true**)
- [ ] 온보딩 모달 노출 → `onboarding_view`
- [ ] 악기 선택 후 저장 → `onboarding_complete` (is_public=true)
- [ ] (다른 계정) 건너뛰기 → `onboarding_skip`
- [ ] 프로필 편집 저장 → `profile_save`

---

## 3. 밴드매칭 · DM

- [ ] `/band-matching` 진입 → `match_list_view`
- [ ] 포지션 필터 클릭 → `filter_apply` (filter_type=match_position)
- [ ] "연락하기" → `match_contact_click`
- [ ] 다른 사람에게 첫 DM 전송 → `dm_open` (is_first=true) → `dm_send` (is_first=**true**)
- [ ] 같은 사람에게 두 번째 DM → `dm_send` (is_first=**false**)
- [ ] 남의 프로필(`/u/<id>`) 열기 → `profile_page_view` (is_self=false)
- [ ] 팔로우 → `follow_toggle`

> `dm_send`의 is_first가 true/false 양쪽 다 있어야 "매칭 성사" 판정이 성립한다.
> DM 본문이 이벤트에 안 실리는지도 이때 Amplitude에서 눈으로 확인할 것.

---

## 4. 커뮤니티 · 피드

- [ ] `/community` → `community_list_view`
- [ ] 글 상세 → `post_view`
- [ ] 글쓰기 → `post_write_start` → `post_publish`
- [ ] 좋아요, 댓글 → `post_like`, `post_comment`
- [ ] `/feed` → `feed_view`

---

## 5. 프라이버시 확인 (반드시)

Amplitude → 아무 `dm_send` / `post_comment` 이벤트 하나를 열어서:

- [ ] 이벤트 속성에 **본문 텍스트가 없을 것** (`length_bucket`만 있어야 함)
- [ ] `page`에 쿼리스트링이 안 붙었는지 (pathname만)
- [ ] `referrer_host`가 전체 URL이 아니라 호스트만인지

Session Replay에서 DM 화면 녹화 하나를 열어서:

- [ ] 말풍선 텍스트가 마스킹되어 있을 것 (`SR_MASK_CLASS` 동작 확인)

---

## 6. 이벤트가 다 들어온 뒤

Amplitude에서 아래 퍼널을 만든다 (MCP로 자동 생성 가능):

| 퍼널 | 단계 | 전환 창 |
|------|------|---------|
| ① 바이럴 루프 | `challenge_project_view`(entry=deeplink) → `challenge_login_cta_click` → `auth_login_success` → `challenge_upload_complete` | 7일 |
| ② 8마디 생산 | `challenge_list_view` → `challenge_project_view` → `challenge_upload_start` → `challenge_upload_complete` | 1일 |
| ③ 가입·온보딩 | `auth_login_view` → `auth_login_start` → `auth_login_success` → `onboarding_complete` | 1시간 |
| ④ 매칭→대화 | `match_list_view` → `match_contact_click` → `dm_open` → `dm_send`(is_first=true) | 7일 |
| ⑤ 업로드 신뢰성 | `challenge_upload_start` → `challenge_upload_complete` (실패는 `challenge_upload_fail`을 reason별로) | 1시간 |

**①이 가장 중요하다.** 이 퍼널의 마지막 전환율이 K-factor를 결정하고,
그게 "시간이 곧 해자"라는 전제가 실제로 작동하는지를 말해준다.

---

## 알아둘 것

- 이벤트가 Amplitude에 반영되기까지 **수 분** 걸릴 수 있다. 바로 안 보인다고 계측이 깨진 게 아니다.
- `challenge_list_view`는 세션당 1회만 찍힌다 (업로드 후 목록 갱신 때 중복 방지).
- `match_signal_send` / `match_mutual`은 아직 발생하지 않는다 — `user_mutual_responses` 신호 UI 미구현.
