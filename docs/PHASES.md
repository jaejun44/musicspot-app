# 개발 진행 로그

> **읽는 법 (사람·Claude Code·Cowork 공통)**: 작업 시작 땐 **맨 위부터 첫 `---` 줄까지("현재 상태", 약 30줄)만** 읽는다(전체 약 70KB — 통째 읽기 금지).
> 할 일·보류 상세는 "## 진행 중 / 다음 작업", 과거 상세는 아래 날짜 로그를 필요할 때 grep으로. 에이전트 인수인계·규칙은 `docs/HANDOFF.md`.

## 현재 상태 (최종 갱신 2026-11-06)

**운영**: https://www.musicspotfest.com — main 자동 배포(Vercel). PR #37(이 요약 추가)까지 머지·배포, 열린 PR 0, 원격 브랜치 main만

**지금 운영에 있는 핵심 흐름 (재방문 루프, 11-06 출시)**
연습실 검색 → 상세에서 근처 비교·후보 담기 → `/vote/[id]` 단톡방 투표(로그인 없음) → 만든 사람이 결정(다른 기기는 관리 링크 `#k=`) → 상세 문의·예약 / 밴드 일정 저장 → 다음 합주 때 옛 투표 링크·홈 "최근 본·찜·진행 중인 투표"로 재방문

**기준 수치 (11-05~06, 운영 DB)**
- 공개 연습실 799곳(전부 spacecloud) · 가입자 12명
- 최근 30일 연습실 상세(studio_view) 봇 제외 366세션(봇 포함 768) · 세션당 상세 1.07개
- 판정 지표: D7 잔존 20%(anon_id) · 세션당 상세 조회 · 투표 링크당 멤버 유입

**다음 할 일**
| 언제 | 무엇 | 누가 |
|---|---|---|
| 11-13 무렵 | 재방문 지표 확인(`docs/ANALYTICS.md` 재방문·투표 재진입 쿼리) + 실제 합주팀 3팀 투표 링크 사용 결과(`docs/GROWTH_CHECKPOINT_2026-09-09.md`) 함께 판단 | 에이전트 쿼리 → 사용자 판단 |
| 수시 | 휴대폰 카톡 "나와의 채팅"으로 관리 링크 → 결정 버튼, "우리 밴드로 저장"(로그인), 투표 카카오 공유 | 사용자(에이전트는 로그인·카톡 불가) |
| 11월 말 | 연습실 월간 최신화 `crawling/run_all.sh` → 미리보기 승인 → `APPLY=1` | 에이전트 → 사용자 승인 |
| 11월 | 업체 연락·`/partner`·실결제·일본 진출 우선순위 재결정(10월 웹 집중 기간 종료) | 사용자 |

**보류 (조건이 오면 꺼냄)**: 관리자 로그인 시도 제한·`/api/translate` 호출 제한(가입자 50명 넘으면) · 주간 점수 리셋 Cron(8마디 트랙 활동이 생기면) · 12마디 블루스 폼 · 실결제·`/partner`(B2B 계약 후)

**QA 데이터**: `utm_campaign=codex_qa` 표시, 집계 때 QA 투표 `5845fd1a`·`ad15dff2`·`966f9741` 제외(지우지 않음). 이벤트 확인은 Supabase `user_events`
**작업 규칙**: `docs/HANDOFF.md` "규칙"(전체는 `CLAUDE.md`·`docs/RULES.md`). 작업을 마치면 이 "현재 상태"도 갱신

---

## ✅ Phase 0 — 기존 기능 (보존)
- GPS + 텍스트 기반 연습실 검색
- Supabase studios 데이터 (1,165개)
- 즐겨찾기 / 최근 본 (localStorage)
- 정보 제보 (ReportModal)
- 관리자 페이지 (/admin)
- 업체 등록 신청 (/register)
- 피드백 (/feedback)
- GA4 + Supabase 듀얼 트래킹
- Kakao 공유

## ✅ Phase 1 — 핵심 UI 재구축
- 캐릭터 이미지 `public/ms_character/` 복사
- Navigation 컴포넌트 (Figma 기준)
- Landing 전면 재작성
- SearchResult 페이지 (`/search`)
- 경로 리다이렉트 (`/studios` → `/search`)

## ✅ Phase 2 — 연습실 상세
- RoomDetail 페이지 (`/room/[id]`)
- BookingForm, Payment, BookingComplete (Phase 4에서 완료)

## ✅ Phase 3 — 마이페이지 & 로그인
- MyBookings (`/my-bookings`) — 프로필·탭·즐겨찾기·최근 본
- 온보딩 모달 (첫 로그인)
- ProfileEditModal — 이미지 업로드 버그 2026-04-22 수정
- `hooks/useAuth.ts` — 전역 auth 훅
- `app/auth/callback/page.tsx` — OAuth 리다이렉트
- Login 페이지: 카카오 OAuth + 구글 OAuth + 이메일 매직링크
- Navigation: 로그인 상태 반영 (아바타 + `/my-bookings`)

## ✅ Phase 4 — 신규 기능 & 예약 플로우
- BandMatching (`/band-matching`) — 실데이터
- CommunityFeed (`/community`) — auth 연동
- GA4 + Supabase 전체 버튼 트래킹 (2026-04-23)
- BookingForm — Framer Motion, sessionStorage 전달
- Payment — 결제수단, 쿠폰(MUSIC10), 1.2s 시뮬레이션
- BookingComplete — 체크 애니메이션, QR 플레이스홀더

## ✅ Phase 5 — 예약 DB 연동 & 밴드매칭 채팅 (2026-04-25)
- `bookings` 테이블 연동 — PaymentClient insert + MyBookings read
- Analytics: `booking_start`/`payment_select`/`booking_complete`
- 밴드매칭 1:1 채팅 — `direct_messages` + Realtime
- 자기 자신 채팅 방지 (isSelf 체크)
- OnboardingModal 닫기 버튼 + 밴드찾기 취소 버튼
- ⏳ B2B 계약 후 실결제 오픈 대기

## ✅ Phase 6 — 모바일 버그 수정 (2026-04-26)
- HeroSection CTA 줄바꿈 수정 (fontSize 18px + whiteSpace nowrap)
- SearchBar iOS 날짜 입력 너비 (appearance-none)

## ✅ Phase 7 — 브랜드 컬러 감사 (2026-04-26)
- 전체 33개 파일 #FFD600/#00D26A 감사
- #FFD600 → #F5FF4F (라임옐로) 비 카카오 사용처
- #FFD600 → #4FC3F7 (블루) 주요 CTA
- #00D26A → #41C66B (그린) 전 영역
- 카카오 SDK 4곳만 #FFD600 유지

## ✅ Phase 8 — 커뮤니티 · 리뷰 · 밴드 스케줄러 (2026-05-06)
- 커뮤니티 글쓰기 — `posts` 테이블 + WritePostModal/EditPostModal/PostCard
- 연습실 뮤지션 리뷰 — `studio_reviews` + ReviewSection
- 내 밴드 스케줄러 — `bands`/`band_members`/`band_schedules` + `/my-band`

## ✅ Phase 9 — 뮤지션 활동 피드 (2026-05-06)
- `app/feed/page.tsx` — 서버 컴포넌트 + OG 메타
- `FeedClient.tsx` — 팔로우 기반 타임라인 (posts + stem_tracks 통합)
- `user_follows` → following_ids → 병렬 fetch
- PostCard / TrackCard 유니온 + created_at 정렬
- 빈 상태 처리, Navigation 메뉴 추가

## ✅ Phase 10 — SEO + 8마디 백엔드 + 알림 (2026-05-06)
- `app/sitemap.ts` Next.js 방식 (studios 동적 라우트)
- `/my-band` OG 메타
- 8마디: `stem_projects`/`stem_tracks` + `stems` Storage (30MB, MP3/WAV/OGG/M4A/FLAC)
- 8마디 프론트: StemsClient, CreateProjectModal, ProjectDetailModal, 오디오 플레이어
- 알림: `notifications` 테이블 + RLS + Realtime (`useNotifications`)
- NotificationDropdown + Navigation Bell 뱃지
- 트리거 `trg_notify_user_follow` — `user_follows` INSERT → follow 알림
- 트리거 `trg_notify_direct_message` — `direct_messages` INSERT → match 알림 (첫 메시지만)

## ✅ Phase 11 — 커뮤니티 인터랙션 + 뮤지션 프로필 (2026-05-06)
- `post_likes` 테이블 (PK: post_id+user_id)
- `post_comments` 테이블
- 트리거 `trg_notify_post_like` — INSERT → 원글 작성자 `like` 알림
- 트리거 `trg_notify_post_comment` — INSERT → 원글 작성자 `comment` 알림
- CommentSection — 댓글 fetch + 입력 (Enter 전송, Shift+Enter 줄바꿈)
- PostCard 재작성 — localStorage 제거, Supabase 연동
- CommunityClient 재작성 — likedPostIds Set, 집계 포함
- `app/u/[id]/page.tsx` — 공개 프로필 + generateMetadata OG
- UserProfileClient — 팔로우/언팔로우(낙관적 UI), 트랙/게시물 탭

## ✅ Phase 12 — UX 보정 + KPI + 명예 시스템 (2026-05-26)
- PostCard 작성자 → `/u/[author_id]` 링크
- RoomCard 리뷰 배지 + RoomDetail `#reviews` 앵커
- `trg_notify_user_follow` SECURITY DEFINER 확인
- `notifications.type` CHECK 확장 — `booking_confirmed`, `challenge_cta`, `challenge_nudge`
- KPI 대시보드 (`/admin/kpi`) — stem 지표·유저 지표·challenge_score 분포
- 명예 시스템 DB: `user_titles` + `user_challenge_score` + `challenge_pass_chain`
- UserProfileClient 타이틀 뱃지 표시
- 트리거 `trg_update_challenge_score` — `stem_tracks` INSERT → upsert
- 함수 `award_season_titles(year, quarter, country, top_n)` — BEST_CHALLENGER 자동 부여
- 함수 `reset_weekly_challenge_scores()` — 주간 리셋
- 예약 알림 `cta_url` 버그 수정 (`notify_on_booking_complete`)
- 예약 알림 중복 제거 → `booking_confirmed` + `challenge_nudge` 2개만
- `user_mutual_responses` 테이블 + `track_mutual_response()` 트리거 — 5회 달성 시 양측 `match` 알림
- BandMatching "함께 자주 호흡 맞춘 뮤지션" 섹션
- `/admin` KPI 탭 시즌 시상 폼 + `app/api/admin/award-titles/route.ts`

## ✅ Phase 13 — 보안·성능·SEO 배포 (2026-06-12)

### 보안
- 어드민 인증 서버화(httpOnly 세션, `NEXT_PUBLIC_ADMIN_PASSWORD` 제거) — 커밋 `5a06d96`
- Server Action 12개 `assertAdmin()` 가드
- 보안 헤더 5종 (`next.config.js`)
- RLS 39개 테이블 전부 활성화(마지막 `user_mutual_responses`) — `supabase/03_fix_user_mutual_responses.sql`

### 성능
- ISR 적용: room/community/u/sitemap — 커밋 `595f104` 외
- room `generateStaticParams` 500개 프리렌더

### 마케팅·SEO
- 지역 SEO 페이지 `/region/[slug]` 25개 + sitemap·푸터 내부링크 — 커밋 `7fbd4b1`
- room JSON-LD 강화(aggregateRating·addressRegion) + region OG이미지 + OG/geo 메타 — 커밋 `d1628a3`
- 8마디 공유 페이지 `/stems/[id]` + 동적 OG 카드 + 공유 버튼(바이럴 루프) — 커밋 `4864094`
- hreflang ko-KR+x-default 기초(`lib/seo.ts`, 일본어 확장 대비) — 커밋 `f833164`

### 남은 항목 / TODO
- 결제 금액 서버검증 (실결제 PG 붙기 전 필수)
- ~~검색 거리정렬 서버화(Postgres RPC)~~ → ✅ Phase 14에서 완료
- 중복 RLS 정책 정리 (posts/bookings 등)
- notifications insert 정책 강화(현재 로그인 누구나 → DB 트리거로)
- 일본어 페이지 + ja hreflang 활성화 (웹 기능이므로 선행 가능 — 2026-10 이전)

## ✅ Phase 14 — 검색·지도 경험 복구·개선 (2026-06-12)

### 검색·지도
- 카카오맵 SDK 자동 로드 복구(메인에 SDK 로더가 없어 지도뷰가 안 뜨던 버그 수정) — 커밋 `edc3305`
- 마커 클러스터링(MarkerClusterer) + 로딩/에러 UI — `RoomMapView.tsx` 전면 재작성
- 마커 미니카드 거리(km/m) 표시 — `SearchClient.tsx`
- 검색 첫 진입 '내 주변 연습실 보기' CTA 배너 — `SearchClient.tsx`
- 거리정렬 서버화 `nearby_studios` RPC(earthdistance + GiST 인덱스) + 클라 폴백 — `supabase/04_nearby_studios_rpc.sql`, `hooks/useStudios.ts` (Supabase 실행·테스트 완료)

### TODO 갱신
- (해결됨) 검색 거리정렬 서버화 → 완료
- (해결됨) 지도뷰 미동작 버그 → 복구

## ✅ Phase 15 — 이용자 모으기: 바이럴·SEO·온보딩 (2026-06-16)

### 바이럴 (K-factor)
- 8마디 공유 returnTo 복귀(로그인 후 공유받은 프로젝트로 복귀, 오픈리다이렉트 방지 `lib/safe-redirect.ts`) — 끊긴 루프 복구 — 커밋 `4f60b54`
- share_count/pass_count 실제 증가 RPC — `supabase/05_increment_counts.sql` (Supabase 실행 완료)
- 비로그인 모달 "이어서 8마디 만들기" 능동 CTA
- 8마디 명예·진행 가시화(N번째 주자·참여자 이모지 스택·🔥공유/🎯이어받기 카운트) + 업로드 후 자랑 CTA — 커밋 `331a70c`

### SEO
- `/region` 허브 인덱스 + 내부링크(sitemap·푸터·breadcrumb) — 고아 지역 페이지 구제 — 커밋 `1c53e9f`

### 온보딩
- 신규 방문자 환영 시트(`WelcomeSheet`, 1회성 localStorage) + `/stems` 8마디 설명 인트로(1회성) — 커밋 `3122f7c`

### 보류 (의도적)
- STEP 4 지역 확장 → 데이터가 서울 편중이라 새 도시 추가는 빈 페이지 양산. 보류.
  나중에 "서울 깊게"(동네별 데이터: 방배 28·서교 24·서초 23·사당 21… 근거)로 전환 예정.

## ✅ Phase 16 — 명성 시스템: 음악인의 GitHub (2026-06-22)

### 명성 (놀이→인정 레이어)
- 프로필 명성카드 — 던짐·이어짐·명예 3지표 + 칭호 뱃지 + 빈상태 행동유도 — RPC `user_reputation` — 커밋 `169d1c1`
- 잔디(기여 그래프) — 최근 119일 던지기 활동 점 그리드 + 빈상태 유도 — RPC `user_activity_calendar` — 커밋 `2dd849b`
- 이번 주 리더보드 — 많이 던진 TOP10 + 선점 유도 — RPC `leaderboard_throwers` — 커밋 `2dd849b`
- 3개 RPC 모두 Supabase에 생성·검증 완료(실데이터 거의 0이라 현재는 대부분 빈상태 CTA 노출).

### 다음 (10월 중순 이후 — 시간 확보 시)
- 실행: 첫 사용자 10명 확보 (코드 아닌 사람 모으기 — 이게 진짜 변수)
- 명성 배지 자동 부여(첫 마디·10연속 등) — 필요 시
- 잔디 데이터 쌓이면 리더보드 기간 토글·시즌제

## ✅ Phase 17 — 8마디 놀이형 동시 녹음(JAM): 쌓기/이어붙이기 (2026-06-22)

> **핵심 목표**: "주고받기를 쉽게" — 클릭 한 번으로 카운트인 → (반주 깔고) 동시 녹음 → 자동 정지 → 저장.
> 레벨 A(놀이 우선, 레이턴시 보정 없음). 정밀 싱크 X, "같은 시점 start"만 맞춤.

### 무엇을 만들었나
- JAM 모드: 메트로놈 4박 카운트인 → 8마디 자동 녹음. 녹음본은 **내 마이크 단독 webm**(반주 미합성).
- 두 가지 기여 방식(녹음 시 선택):
  - **쌓기(layer)** — 같은 8마디(최근 섹션) 위에 겹침. 녹음 중 그 섹션 반주가 깔림 → 동시 녹음 → 합주로 두꺼워짐.
  - **이어붙이기(extend)** — 새 8마디(다음 섹션) 추가. 카운트인 후 내 연주만 녹음 → 곡이 길어짐.
- 재생: **섹션 내 동시 + 섹션 간 순차**. 녹음 직후 미리듣기 + 모달 "전체 곡 듣기".

### 아키텍처 (유지보수용 — 어디를 고치면 되나)
```
lib/ensemble-audio.ts   Web Audio 코어. AudioContext 생성/resume(iOS webkit 폴백+무음 unlock),
                        loadTracks/loadTracksAligned(fetch→decodeAudioData),
                        playSequence(섹션 배열 재생) ← playEnsemble은 이것의 단일섹션 래퍼,
                        createMasterChain(게인0.85+리미터, 클리핑 방지), sequenceDuration.
lib/metronome.ts        scheduleCountIn(bpm·박수→클릭음 예약, 끝나는 ctx시간 반환),
                        eightBarsDuration(=60/bpm*4박*8마디).
lib/mic.ts              acquireMic(): getUserMedia 공통 래퍼. secure-context 체크 +
                        에러 원인별 한국어 메시지 + 진단(권한상태·장치수·브라우저).
                        음악용으로 echoCancellation/noiseSuppression/autoGainControl=false.
JamRecorder.tsx         녹음 UI/플로우. 모드 토글, 카운트인 숫자, 마디 진행바.
                        onRecorded(blob, mode)로 부모에 전달. unmount 시 stream/ctx/timer 정리.
TrackUploadPanel.tsx    'jam' 탭 추가. JamRecorder의 blob을 기존 recordedBlob 업로드 경로로 재사용(중복 X).
                        sectionFor(mode)로 저장 section 계산. 녹음 직후 합주/이어 미리듣기.
ProjectDetailModal.tsx  tracks를 section별로 그룹핑(orderedSectionUrls/layerBackingUrls/latestSection)해
                        TrackUploadPanel에 전달. "전체 곡 듣기"=playSequence.
```

### 데이터 모델
- `stem_tracks.section` (int, NOT NULL, default 1) 추가 — 마이그레이션 `add_section_to_stem_tracks`.
  - **같은 section = 레이어(동시재생)**, **다음 section = 이어붙이기(순차재생)**.
  - 기존 트랙 전부 section=1 → 기존 동작(동시재생) 그대로 보존(무중단).
- section 계산 규칙(`sectionFor`): 트랙 없으면 1 / 쌓기=최근섹션 / 이어붙이기=최근섹션+1.
  JAM 외 업로드(파일·녹음·유튜브)는 이어붙이기로 새 섹션.

### 동기화 방식 (왜 이렇게 짰나)
- **합주 재생**은 BufferSourceNode를 같은 `ctx.currentTime`에 start → 샘플 단위 정밀.
- **마이크 녹음 start**는 ctx 시간 예약 불가 → 카운트인 endTime까지 `setTimeout` 근사. 둘은 독립이고
  "같은 시점 start"만 맞춤(레벨 A, 의도된 한계). 섹션 길이는 "그 섹션 최장 트랙 길이" 기준.

### 디버깅 히스토리 (재발 시 참고)
- **마이크 전면 차단**: `next.config.js`의 `Permissions-Policy: microphone=()`(빈 허용목록=모든 출처 금지)가
  원인. → `microphone=(self)`로 수정. 콘솔 `Permissions policy violation: microphone is not allowed`가 단서.
  Chrome이 "denied" 캐시 → 사이트 패널 "권한 재설정" 필요.
- **녹음 뭉개짐**: getUserMedia 기본 통화가공(에코제거가 반주를 에코로 오인) → 셋 다 끔. 스피커 대신 **헤드폰** 필수.
- **합주 클리핑**: 다중 트랙 합산 피크 → 마스터 게인+리미터.

### 커밋
- `c5afb4e` JAM 기본(카운트인+합주 동시 녹음) → `bc20e50` Permissions-Policy 수정 →
  `af6be25` 음질(마이크 가공오프+리미터) → `321740f` 합주 미리듣기 →
  `f896130` 전체듣기 버튼 위치 → `4263be6` 쌓기/이어붙이기 두 모드+섹션 순차재생 →
  `cdd1b7f` 모드 토글 항상 표시.

### TODO / 한계
- 레이턴시 보정 없음(놀이용). 정밀 싱크 필요해지면 별도 설계.
- iOS Safari AudioContext 제약 — 폴백 넣었으나 실기기 추가 검증 필요.
- 섹션 길이를 "최장 트랙"으로 잡아 녹음이 들쭉날쭉하면 이음새가 약간 어긋날 수 있음.

---

## ✅ Phase 18 — Amplitude 도입 마무리 (2026-08-08)

`aa82b6b`에서 WIP로 넘어온 Amplitude 연동(`@amplitude/unified`)을 마감.

### 무엇을 고쳤나
- **API 키 하드코딩 → `NEXT_PUBLIC_AMPLITUDE_API_KEY`** (Vercel Development/Preview/Production 3개 환경 등록 완료).
  설정 상수는 `lib/amplitude.ts` 한 곳으로 모음 — 프로바이더·analytics·채팅 UI가 공유.
- **user_id 연결 (기존 누락).** Supabase 세션의 `user.id`를 `setUserId`로 전달하고
  `onAuthStateChange`로 갱신, 로그아웃 시 `amplitude.reset()`. 그전까지 Amplitude 이벤트는 전부 익명이었다.
- **country / language user property** — `getClientCountry()` / `getClientLocale()` (docs/RULES.md 요구 축).
- **Session Replay 프라이버시.** `sampleRate: 1`(100% 녹화)인데 1:1 DM 말풍선이 그대로 찍히고 있었다.
  `privacyConfig.maskSelector`에 `SR_MASK_CLASS`를 등록하고 `ChatModal`의 메시지 컨테이너에 적용.
  `<input>` 값은 기본 마스킹 레벨(medium)이 이미 가리지만 **div 텍스트는 안 가려진다**는 게 핵심.
- **키 미설정 시 가드.** init 없이 `track()`을 부르면 이벤트가 SDK 내부 큐에 무한 적립되므로
  `AMPLITUDE_ENABLED`가 false면 아예 호출하지 않음. GA4·`user_events`는 영향 없음.

### 확인한 것 / 안 한 것
- ✅ `npx tsc --noEmit` 0 에러, `npm run build` 성공
- ✅ 런타임 스모크(dev + 브라우저): session replay 설정 fetch, `api2.amplitude.com/2/httpapi` 이벤트 업로드,
  `AMP_*` 쿠키 생성, 콘솔 에러/경고 0. 마스킹 클래스가 layout·band-matching 청크 양쪽에 번들됨.
- ⚠️ **미검증**: 로그인 상태의 `setUserId` 반영과 Amplitude 대시보드 실제 도착 — 로그인 플로우를 태우지 않았다.
  첫 배포 후 대시보드에서 user_id·country·language가 붙는지 직접 확인 필요.
- ⚠️ ESLint 미설정 프로젝트 (`next lint`가 대화형 초기 설정을 요구) — lint는 못 돌림.

### 주의
- `initAll()`은 async지만 그전 `track()`은 `dispatchQ`가 버퍼링 → 순서 가드 불필요
  (`@amplitude/analytics-core/lib/cjs/core-client.js:153`).
- **개인정보가 뜨는 화면을 새로 만들 때마다 `SR_MASK_CLASS` 적용을 검토할 것.**
- `sampleRate: 1`은 초기 단계 의도. 트래픽 늘면 비용 때문에 낮춰야 함.

---

## 진행 중 / 다음 작업

### 재방문 루프 후속 (2026-11-06 출시분)
- **지표 확인 (11-13 무렵, 출시 1주 뒤)**: `docs/ANALYTICS.md` "재방문 측정"(D7 잔존, 목표 20%) · "투표 링크 재진입" 쿼리. QA는 `utm_campaign=codex_qa`, QA 투표 `5845fd1a`·`ad15dff2`·`966f9741` 제외
  - 세션당 상세 조회(1.07 → ?), `compare_click`/`compare_view`, `vote_create` 수, 투표 링크당 멤버 유입
- **사용자 확인 필요(에이전트는 로그인 불가)**: 결정된 투표 → "우리 밴드로 저장", `/my-band/[id]` 일정 추가(schedule_date→date 수정분), 투표 카카오톡 공유(`vote_share`)
- 투표 관리 링크(PR #33): 만든 사람이 `/vote/<id>#k=…` 링크로 다른 기기(휴대폰)에서도 결정. QA 투표 `966f9741`도 지표에서 제외. 실제 카카오톡 "나와의 채팅" 전송은 사용자 확인 필요
- 지표 판단은 11-13 수치만이 아니라, 실제 합주팀 3팀에게 투표 링크를 직접 쓰게 한 결과를 함께 본다(`docs/GROWTH_CHECKPOINT_2026-09-09.md` 3팀 모집안).

### 일본어 i18n — 잔여 검증 (구현은 완료)
2026-07-03 인수인계 문서(`HANDOFF_i18n_일본어_*.txt`, 2026-07-09 정리하며 삭제)의 잔여 작업을 재확인한 결과, t() 적용은 전부 끝났다.
`lib/ensemble-audio.ts` / `lib/metronome.ts`는 미적용으로 남아 있었으나 **한국어가 전부 주석이고 사용자 노출 문자열이 없어 작업 대상이 아님**을 확인했다.

남은 것은 검증뿐:
- `npx tsc --noEmit` 타입 에러 0 / `npm run build` 성공
- 쿠키 `NEXT_LOCALE=ja` 또는 KO/JA 토글로 동작 확인
  - 네비에 '연습실'·'마이' 미노출, 랜딩에 연습실 검색/HOT 섹션 없음
  - `/search`, `/room/[id]`, `/my-bookings`, `/register` 직접 접근 → 홈 리다이렉트
  - 사전 누락 시 한국어 폴백
- 잔여 한국어 스캔: `grep -rlP "[가-힣]" --include="*.tsx" app components`

⚠️ `app/layout.tsx`가 `headers()`의 `x-locale`을 읽어 전체 동적 렌더링이 됨. ISR/SSG가 필요해지면 경로 기반 `/ja` 방식으로 전환할 것.

### 보류: 보안 — 남은 2건은 가입자 50명 넘으면 (2026-11-06 결정, 당시 12명)
- ✅ 운영 `ADMIN_PASSWORD` 교체 완료(2026-11-06, 사용자가 Vercel에서 직접) — 시즌 시상이 이제 실제로 동작하고 칭호는 회수 불가라 50명 기준 보류에서 제외했던 항목
  - `ADMIN_SESSION_SECRET`도 함께 교체(세션 쿠키가 이 값 하나로만 서명돼 비밀번호만 바꾸면 기존 쿠키가 계속 유효). Preview·Development도 교체
  - 환경변수 변경 후 운영 재배포(`vercel redeploy`) → 사용자 확인: 기존 로그인 풀림, 옛 비밀번호 실패, 새 비밀번호 성공
- 관리자 로그인(`adminLogin`) 시도 제한
- `/api/translate` 호출 제한 — 로그인 요구 vs Vercel WAF IP 제한 중 그때 결정
- 낮음: `increment_pass_count`·`increment_share_count` 누구나 호출(카운터 부풀리기, 근본 해결은 트리거로 이동)

### 보류: 주간 점수 리셋 Cron (8마디 트랙 0건 — 활동이 생기면)
- `app/api/cron/reset-weekly-scores/route.ts` — Vercel Cron
- 매주 월요일 00:00 KST `reset_weekly_challenge_scores()` 호출
- `Authorization: Bearer {CRON_SECRET}` 헤더 검증
- `CRON_SECRET` 환경변수 Vercel 추가
- `vercel.json`: `"0 15 * * 0"` (일요일 15:00 UTC = 월요일 00:00 KST)
- ⚠️ 2026-11-06부터 이 함수는 `service_role`만 실행 가능(`supabase/11_security_hardening.sql`) → 라우트에서 반드시 `createAdminClient()`(서비스 키)로 호출. anon 클라이언트로 부르면 401

### 보류: 챌린지 폼(form) 옵션 — 12마디 블루스 (2026-08-08 결정)
"메인 컨셉을 8마디 → 12마디(블루스)로 리네임" 안을 검토했고 **8마디 유지**로 결론.
12마디는 길이가 아니라 형식(I–IV–V 블루스 폼)이라 이름에 박으면 장르가 좁아지고,
녹음 길이가 16초→24초로 +50% 늘어 릴레이 완주율이 떨어진다. 전환 비용도 큼
(코드·문서 162곳, JA 사전이 한국어 원문을 키로 쓰는 구조라 전면 재작성 + sitemap/OG SEO 리셋).

대신 기타리스트 유입 훅은 **폼 선택 기능**으로 가져간다 (지금은 보류, 착수 시 아래대로):
- `stem_projects.form` 컬럼 추가 — `default '8bar'`, nullable (기존 데이터 안전)
- 프로젝트 생성 시 선택: 8마디 자유(기본) / 12마디 블루스 / 16마디
- `app/stems/_components/JamRecorder.tsx`의 `const BARS = 8`을 props로 — **여기가 유일한 하드코딩**.
  `lib/metronome.ts`의 `eightBarsDuration(bpm, bars, beatsPerBar)`은 이미 파라미터화됐고
  JamRecorder 카피도 `{bars}마디` 템플릿이라 엔진 변경은 사실상 없음.
- 12마디 모드는 I–IV–V 진행 가이드 + 키 표시가 진짜 훅 (이름표보다 이게 중요)

### 장기 대기 (B2B 계약 후)
- 실결제 PG 연동 (토스페이먼츠 / 아임포트)
- 연습실 업체 대시보드 (`/partner`)

---

## Git 버전 태그
- `v0.5.0` — 업체 등록 신청 (재구축 이전 마지막 안정)
- `v1.0.0` — Figma 디자인 기반 전면 재구축 (목표)

## 2026-09-07 — 초기 이용자 확보를 위한 검색·계측 개선

- 공개 데이터 기준 확인: 공개 연습실 1,008 / 챌린지 5 / 프로필 8 / 게시글 11. 활성 이용자 수와 구분.
- 홈 검색값 전달, 실지원 조건(지역/예산/드럼), 검색 섹션 상향. 기존 디자인 토큰 유지.
- GPS 필터 누락·200개 상한 제거, 실제 결과 수·안정 정렬·검색 응답 경합·더보기 실패 복구 수정.
- 검색 실패 재시도/빈 결과 탈출 경로, 뒤로가기 검색 입력 동기화.
- UTM 탭 세션 유지. 내부 이동 뒤 문의/참여 이벤트 출처 보존.
- 가짜 푸터 링크 정리 및 사용자 확인 Instagram 계정 연결.
- `tests/growth-regressions.cjs` 6개 회귀 테스트 통과, TypeScript 검사 통과. 최종 실제 데이터 포함 프로덕션 빌드 577페이지 생성 확인.
- 로컬 브라우저: 홍대+드럼+2만원 URL 전달/빈 결과, 조건 완화 후 홍대 60개 검색 결과 확인. 모바일 390px 검색 폼 확인.
- 모집 문안 3종·프로필 소개·캠페인 링크·14일 실험 계획: `docs/GROWTH_LAUNCH_2026-09-07.md`. 읽기 전용 전환 SQL: `scripts/growth-funnel.sql`.
- 운영 배포/Instagram 게시/프로필 수정은 미수행. 실제 가입·문의 유입 확보 여부는 아직 확인되지 않음. 로컬 QA 방문은 실이용자 성과에서 제외할 것.

## 2026-09-08 — 외부 사용 기준선 확인·실서비스 배포 준비

- 사용자 확인: 최근 14일 운영자 로그인/점검 없음. Codex QA 제외 기간을 별도 집계.
- 8/25~9/6 UTC: 알려진 봇 75이벤트 제외, 104세션/상세96/문의11(9세션). Google41세션 중 문의3, Bing8세션 중 문의1. 사람 수·예약 성사와 구분. `docs/GROWTH_BASELINE_2026-09-08.md` 참조.
- 실제 작동하지 않는 상세 페이지 인원·룸 선택 제거. 모바일 외부 업체 링크 보강. 카카오 ID/완전한 URL 통합 처리.
- 최신 목록 밖 8마디 공유 프로젝트 직접 조회, 로딩/오류/없는 프로젝트 분리.
- 홍대 검색에 평택 합정동이 섞이는 버그를 배포 검증에서 발견. 도시 범위를 일반 검색·지역 SEO에 동시 적용. 별칭 확장 시 원래 검색어도 유지.
- 회귀 테스트 10개/타입 검사 통과.
- 인스타그램 5장 1080×1350 PNG + SVG + 게시용 캡션: `../growth-kit-2026-09-08/`. 공개 발행은 별도 승인 대기.
- 기존 운영 배포(되돌리기 기준): `dpl_9xDLrVjfP3AvfK92AimjFBQc3XVH`, https://musicspotapp-b6oyndmbm-musicspot-app.vercel.app.

### 운영 반영 완료
- 2026-09-08 최종 배포 `dpl_41tcoGuigD5XwwYzF2gxEypFu8bL`을 Vercel promote로 운영 승격. `vercel inspect https://www.musicspotfest.com`에서 동일 ID/Ready 확인.
- 배포 URL: https://musicspotapp-7o1rvc1bc-musicspot-app.vercel.app. 프로덕션 빌드 577페이지 성공.
- 운영 Instagram UTM 링크에서 1,008개 조회, 홍대 지역 버튼 필터 55개 및 상세 이동 확인. 검색어 홍대(q)는 별칭/이름 확장으로 75개로 지역 버튼과 조건이 다름.
- Instagram 소개와 프로필 캠페인 링크는 반영 확인. 카드뉴스 공개 게시 승인 대기. 신규 유입 성과는 아직 측정하지 않았으며 이번 QA는 성과에서 제외.
- 소스는 로컬 미커밋 상태로 배포됨. Git 원격에 반영한 것으로 오해하지 않도록 주의.

### 2026-09-09 — Instagram 게시 완료 확인
- 사용자가 카드 5장과 문안 공개 게시를 명시적으로 승인. 4:5 이미지 01~05와 승인 캡션으로 공유 실행.
- 로그인 복구 후 실제 게시물 확인: https://www.instagram.com/music_spot_kr/p/DdB-xh8k76v/ . 계정 게시물 수 101→102, 승인된 표지와 전체 캡션 확인. 중복 게시하지 않음.
- 공개 발행 승인 대기는 해소됨. 신규 사이트 방문·문의 성과는 별도 측정 필요.

## 2026-09-29 — 실시간 예약 서비스 연결 (`/booking`)
- 실시간 예약은 별도 저장소(`musicspot-booking`, Express + Vite)다. `next.config.js` rewrites로 `/booking/*`를
  `BOOKING_ORIGIN`에 넘긴다. 같은 출처라 예약 화면이 이 사이트의 Supabase 로그인을 그대로 쓴다(로그인 한 번).
- 옛 목업 `/booking`·`/payment`·`/complete` 삭제(어디서도 링크되지 않았음). `booking_start`·`payment_select`·
  `booking_complete` 이벤트 정의는 이름 변경 금지 규칙에 따라 남김.
- 연습실 상세: 예약 서비스에 이어진 연습실이면 "⚡ 실시간 예약하기"(→ `/booking/s/:id`, `booking_realtime_click`).
- 마이 > 예약: "실시간 예약 내역"(→ `/booking/me`). 파트너: 초대받은 사장님에게 "예약관리"(→ `/booking/owner`).
- 관리자 > 연습실 수정: "사장님 초대 링크 만들기". server action이 예약 서버 관리자 API를 부른다(키는 서버 env만).
- 회귀 테스트 `tests/booking-service.cjs` 7개 추가(`node --test tests/`).
- **운영 반영 전 필요**: Vercel env `BOOKING_ORIGIN`(없으면 production 빌드가 멈춤), `NEXT_PUBLIC_BOOKING_API_URL`,
  `BOOKING_ADMIN_API_TOKEN`(서버 전용). 예약 서버 배포·업체/방 등록 UI는 아직 없음.

## 2026-10-18 — 온라인 잼 (SonoBus로 먼저 맞춰보고 오프라인 합주로) — 운영 반영 완료
PR #4(`e1d9ce6`), PR #5(`85ca2ac`) 머지·운영 배포. 작업 브랜치는 정리(삭제) 완료.
오디오 기능은 만들지 않고, 무료 P2P 합주 앱 SonoBus의 같은 그룹 방으로 보내는 다리 역할만 한다.
원칙: 온라인에서 끝나지 않고 오프라인 합주로 이어지게 한다.

### 사용자 흐름
- **메인 입구 — 밴드찾기 > 🎧 온라인 잼 탭** (`/band-matching?tab=jam`): 누구나 잼 방을 열고 참가.
  카드: 시작 시간(시작 후 "진행 중")·제목·호스트·구하는 악기·인원. 시작 3시간 뒤 목록에서 내림. 호스트 [마감하기], 참가자 [나가기].
  참가하면 방 정보 시트, 멤버끼리 💬 1:1 메시지(ChatModal).
- **보조 입구 — 채팅창 "온라인으로 먼저 맞춰보기"**: 서로 DM을 1통 이상 주고받은 두 사람만(매칭 엔티티가 없어서 이 기준으로 정함).
- **방 정보 시트** (`JamRoomSheet`): 그룹 이름·비밀번호 복사, "SonoBus로 열기", 3단계 가이드, 품질 안내(유선 랜·오디오 인터페이스·이어폰).
- **하단 CTA**: ko는 "오프라인 합주실 예약하기" → `/search`(연습실 찾기 → 상세에서 실시간 예약/연락).
  ja는 `/search`·`/booking`이 차단 경로라 "채팅·멤버 메시지로 오프라인 약속".
  - 처음엔 `/booking`으로 보냈으나 그 첫 화면은 예약 서비스의 "내 예약" 목록(`/booking/me`)이라 PR #5에서 `/search`로 변경.

### 구현
- 방 정보는 저장하지 않는다. `lib/jam-room.ts`가 `SONOBUS_ROOM_SECRET` HMAC으로 매번 같은 값을 만든다.
  키: 1:1 방 = 정렬한 user id 쌍, 공개 방 = `session:<세션 id>`. 그룹 `musicspot-<hex10>`, 비밀번호 base32 12자.
  ⚠️ 비밀값을 바꾸면 모든 방 이름·비밀번호가 바뀐다.
- API (사이트 첫 일반 유저 서버 인증, 공통 `lib/api-auth.ts`: Bearer → `auth.getUser`, 응답 `no-store`):
  - `GET /api/jam-room?peer=` — 서로 DM한 두 사람만(아니면 403)
  - `GET /api/jam-sessions/[id]/room` — 호스트·참가자만(아니면 403)
- DB `supabase/09_jam_sessions.sql` 운영 적용(사용자 승인): 2026-04 옛 `jam_sessions`/`jam_participants`(앱 미사용, 테스트 8건)를
  DROP 후 재생성. `chat_messages_jam_session_id_fkey`도 CASCADE로 제거(컬럼은 남음).
  RLS: 읽기 공개 / 생성은 본인 호스트로만 / 마감은 호스트만 / 나가기는 본인만. 참가는 `join_jam_session()` RPC로만(행 잠금으로 정원 보장).
  실제 유저 권한으로 시나리오 검증(롤백): 사칭 생성·직접 INSERT 거부, 정원 초과 `full`, 마감 후 `closed`.
- "SonoBus로 열기" = `sonobus://aoo.sonobus.net:10998/?g=&p=`. SonoBus 소스 기준 macOS·Windows·Linux·iOS만 스킴 등록 → Android는 버튼 숨김.
  `go.sonobus.net/sblaunch`는 비밀번호가 제3자 URL에 남아 쓰지 않음.
- 이벤트(`lib/analytics/events.ts`): `match_jam_open`·`match_jam_copy`·`match_jam_launch`·`match_jam_booking_click`(`{source: dm|session, target_id}`),
  `match_jam_tab_view`·`match_jam_session_create`·`match_jam_session_join`. 7종 모두 `user_events` 기록 확인.
  `match_jam_booking_click`의 `target: 'booking'`은 목적지가 `/search`로 바뀌었어도 배포된 값이라 유지.
- 테스트 `tests/jam-room.cjs` 7개(같은 입력 같은 결과, 다른 쌍·세션 다른 결과, 비당사자·비참가자 거부). 전체 `node --test tests/*.cjs` 24개 통과.
  (Node 24에서는 `node --test tests/`가 실행되지 않아 glob 사용)

### 설정·운영
- Vercel env `SONOBUS_ROOM_SECRET`: Production·Preview에 서로 다른 무작위 값으로 등록(없으면 API 500 + 로그).
- Supabase Auth Redirect URLs에 Vercel 미리보기 주소 추가(사용자 작업) — 미리보기에서 로그인하면 운영으로 튕기던 문제 해결.
- Preview에는 `BOOKING_ORIGIN`이 없어 미리보기의 `/booking`은 404(운영은 정상). 잼 CTA는 `/search`라 영향 없음.
- 확인된 사실: Claude에 연결된 Amplitude 프로젝트는 비어 있음(사이트 키는 다른 프로젝트). 당분간 GA4 + Supabase `user_events`로 확인.

### 남은 것
- 실기기 "SonoBus로 열기": ✅ **macOS 확인(2026-10-24)** — 운영 잼 방에서 누르면 이름·비밀번호 입력 없이 같은 그룹(`musicspot-<hex10>`)에 바로 접속.
  Windows·iPhone은 미확인. Android는 스킴 미등록이라 버튼 숨김 유지.
- 지켜볼 지표: 잼 탭 방문 → 방 생성 → 참가 → "오프라인 합주실 예약하기" 클릭(온라인이 오프라인으로 이어지는지가 핵심).
- 새 화면은 Figma 디자인이 없어 기존 카드·시트 스타일을 따름 — Figma 반영 시 재검토.

## 2026-10-24 — 연습실 상세·지역 페이지에 온라인 잼 입구 카드
잼 출시 후 6일(10/18~10/24) 데이터: 사이트 세션 166개 중 방문은 `/room/...`·`/region/...`에 몰리고, 밴드찾기는 3세션, 잼 방 생성 0.
기능은 있는데 사람이 오는 곳에 입구가 없어서, 방문이 많은 두 곳에 입구를 둔다.
- `components/JamEntryCard.tsx`: "🎧 같이 칠 사람 찾고 있나요?" 남색 카드 → `/band-matching?tab=jam`. 두 페이지 모두 ja 차단 경로라 한국어만.
- 위치: 연습실 상세는 📍위치(지도) 다음·리뷰 위(예약 흐름 방해 안 하게), 지역 페이지는 연습실 목록 다음.
- 이벤트 `match_jam_entry_click {from: room|region}` — 어느 페이지에서 잼으로 넘어오는지.
- 열린 방 개수는 표시하지 않음(현재 0개라 역효과).

## 2026-10-24 — 일본어 모드 런타임 검증 (운영, `NEXT_LOCALE=ja`)
- 차단 경로: `/search` `/region` `/region/<slug>` `/room/<id>` `/booking` `/booking/me` `/my-bookings` `/partner` `/register` 모두 307 → `/` ✅
  허용 경로(`/` `/band-matching` `?tab=jam` `/stems` `/community` `/feed` `/my-band` `/login`)는 200, `<html lang="ja">`.
- 화면 한글 스캔(비로그인, 390px): UI 문구는 홈·잼 탭·피드·내밴드·로그인 0건. 남은 한글은 이름·소개·게시글·태그 등 사용자 작성 내용.
- 사전 누락 12키 추가(`band-ja.ts`):
  - 밴드찾기 카드 실력 배지 `입문/중급/고급` — `t(musician.level)` 동적 키라 정적 검사로는 안 잡혔고 화면에서 발견
  - 프로필 빈 값 대체 문구 3개(`미정` 등)
  - 8마디 목록 상태 문구 3개
  - 알림 상대 시간 `{m}분 전`/`{h}시간 전`/`{d}일 전` — 피드의 `{mins}분 전`과 변수명이 달라 별도 키
- 정적 검사 결과 남은 1키 `오프라인 합주실 예약하기`는 ko 전용 분기라 정상.
- 범위 밖으로 둔 것: 로그인 후 화면(채팅·잼 방 시트·알림), 사용자 작성 악기·장르 값(`베이스기타` 등 자유 입력)은 번역하지 않음.

## 2026-10-25 — 레이아웃·모바일 UI 개선 (1~4단계) — 운영 반영 완료
외부 지적("레이아웃·모바일 최적화 필요, 아마추어 웹 같다")에 따라 운영 화면을 390px·1440px로 찍어 코드와 대조해 진단하고, 4단계로 나눠 PR별로 반영(#10~#15).

### 진단 (운영 화면 기준)
- 첫 방문에 Welcome 시트와 PWA 설치 배너가 동시에 뜸. 배너는 데스크톱에도 뜨고 모든 페이지 하단을 가림
- 화면에 고정된 별·번개 장식이 모바일에서 제목·버튼을 덮음. 홈 제목은 외곽선+노란 그림자로 한글이 번져 보임
- 글자 크기 체계 없음(홈 한 화면에 17종), 10~11px 글자 다수
- 목록 카드 기울기 → 모바일에서 모서리가 잘려 삐뚤어진 인상
- 모바일 내비가 햄버거뿐
- 연습실 카드 사진이 커서 한 화면에 1개. 연습실 상세는 가격이 아래 카드에만 있고 시설 태그가 중복으로 수십 개
- 밴드찾기 카드: 모두 '중급'으로 고정된 실력 배지, 소개·구인 문구 중복
- 페이지마다 다른 배경·제목 형식 — **사용자 결정으로 유지**(코믹 스타일 유지 + 정돈)

### 사용자 결정
- 방향: 코믹 스타일 유지 + 정돈. 색·테두리·그림자 토큰은 그대로
- 2단계는 "목록 카드 기울기 제거"만. 배경·제목 형식은 기존 유지
- 모바일 하단 탭바 추가, 헤더(로고 크기)는 기존 유지
- 밴드찾기 실력 배지는 숨김(DB에 실력 칸을 새로 만들지 않음). 카드 사진 축소는 휴대폰에서만

### 1단계 — 첫인상 정리 (#10)
- PWA 설치 배너: 터치 기기 + 2번째 방문부터만(`ms_pwa_visits`, 세션당 1회 카운트)
- 고정 장식(`DecorativeElements`)은 lg 이상에서만
- 홈 제목: 외곽선·그림자 제거, `fontWeight: 900` (Bungee엔 한글 글리프가 없어 Pretendard로 떨어짐)
- 사용자 화면 10~11px 글자 148곳 → 12px (`app/admin` 제외). `docs/DESIGN.md`에 최소 12px 규칙 추가

### 2단계 — 목록 카드 기울기 제거 (#11)
- `RoomCard`·`HotRooms`·`MusicianCard`·`PostCard`·`ProjectCard`·`StudioMiniCard` — 평상시·hover 모두. 떠오름·그림자 hover는 유지. `RoomCard`의 `rotationIndex` prop 삭제
- 유지: 홈 히어로·PowerFeatures·FinalCTA·퀴즈·로고·HOT 배지(장식). `docs/DESIGN.md` 규칙 갱신
- 함께 수정: 검색 카드에서 가격 문구가 길면 평점 배지가 두 줄로 접히던 문제(배지 한 줄 고정)

### 3단계 — 모바일 하단 탭바 (#12)
- `components/BottomTabBar.tsx`를 `app/layout.tsx`에 한 번 마운트, md 미만에서만
- 탭: 연습실·밴드찾기·8마디·커뮤니티·마이 / 일본 모드: 밴드찾기·8마디·커뮤니티·피드·마이(공개 프로필, 비로그인은 로그인)
- 보이는 곳: `/` `/search` `/region/*` `/band-matching` `/stems` `/community` `/feed` `/my-band` `/my-bookings`. 상세·로그인은 숨김(연습실 상세는 문의 바 우선)
- 다른 하단 고정 요소는 CSS 변수로 탭바 위로 비켜 섬: `--tabbar-h`(탭 60px + 테두리 3px + safe-area, 탭바 있을 때만) / `--bottom-safe`(탭바 없을 때만 아이폰 홈 바 여백). `:root:has([data-bottom-tab-bar])`로 켜져 JS 없이 첫 화면부터 맞음
  - 대상: 밴드찾기 프로필 바, 잼 방 열기 바, 내 밴드 바, 커뮤니티·8마디 글쓰기 버튼, PWA 배너
- `viewport-fit=cover` 추가(`app/layout.tsx` `viewport`) — 없으면 아이폰 safe-area 값이 0
- 이벤트 `nav_tab_click {tab}` (`docs/ANALYTICS.md` 반영)

### 4단계 — 페이지별 다듬기 (트래픽 순, #13 → #14 → #15)
- **연습실 상세 (#13)**: 상단 정보 카드에 요금 한 줄(💰). 요금 문구는 `lib/studio-price.ts` `studioPriceLabel`로 통일(정보 카드·문의 위젯·연습실 카드). 시설/악기 태그 중복 제거(공백·대소문자 무시, 예시 26개 → 19개) + 처음 8개와 "+N개 더보기". 이름 단어 단위 줄바꿈
- **연습실 카드 — 지역·검색 (#14)**: 휴대폰(1열)에서만 사진 4:3 → 16:9(한 화면 1개 → 약 2개, 홍대 페이지 24,332px → 20,702px). 짧은 요금 덩어리(시간당·패키지)는 통째로 줄바꿈, 업체 원문이 긴 문장이면 일반 줄바꿈
- **밴드찾기 카드 (#15)**: 실력 배지 삭제(`Musician.level` 제거 — 10-24에 추가한 ja 사전 키 입문/중급/고급도 함께 제거). 소개가 비었거나 구인 문구와 같으면 생략. "내 프로필 등록하기" 바 87px → 68px

### 검증
- 매 단계: 로컬 390px·1440px 스크린샷 + 가로 넘침·12px 미만 글자·탭바 겹침 측정, `npx tsc --noEmit`, `node --test tests/*.cjs`(24/24), `npm run build`
- 브라우저 검증 중 분석 요청(`user_events`·`page_views`·GA·Amplitude)은 차단해 운영 데이터에 남기지 않음
- 머지 전 Vercel 미리보기 통과 확인, 머지 후 운영 배포 Ready·운영 HTML 반영 확인

### 남은 것
- 실기기 미확인: 검색 지도 보기 위 탭바(카카오 지도가 localhost에서 안 뜸), 아이폰 홈 바 여백, PWA 배너 2번째 방문 노출
- 지표: `nav_tab_click`으로 탭별 이동 확인, 밴드찾기·8마디 방문 변화
- 보류(사용자 결정): 페이지별 배경·제목 형식 통일, 헤더 로고 축소
- 기타: 오래된 브랜치 정리 완료(로컬·원격 모두 `main`만 남음)

## 2026-10-25 — 지역 페이지 "서울 깊게" ① 역 반경으로 연습실 고르기
- 진단: 서울 음악 연습실 666곳 중 354곳(53%)이 도로명 주소라 '○○동'이 없음 → 주소 글자로 찾던 지역 페이지가 절반을 놓침(혜화 0곳인데 혜화역 1km 안 14곳). 마포·강남은 60곳에서 잘림
- 서울 지역(`lib/regions.ts` `area`): 역 좌표 반경 1km(8곳 미만이면 1.5km) 또는 구 전체(마포·강남·종로·강북·노원). 좌표 보유 662/666. 역 좌표는 OSM Nominatim과 대조(대부분 250m 이내)
  - `lib/region-rooms.ts` `fetchSeoulStudios` — 1,000행 배치로 전부, 조회 실패 시 throw(빈 목록이 ISR에 캐시되지 않게)
  - `lib/region-select.ts` 순수 함수(반경 선택·통계·가까운 동네) + `tests/region-select.cjs`
  - 순서는 품질 점수 순 유지 — 거리순은 사진 깨진 월세 작업실이 맨 위로 옴(홍대 실측). 거리는 카드에 "○○역 도보 약 N분"
- 지역마다 고유 내용: 요약(곳 수·드럼 가능·시간당 보통 요금), 데이터로 만든 FAQ + FAQPage JSON-LD, 가까운 동네 링크
  - 요금은 `price_per_hour`가 서울 전부 비어 있어 원문 '시간당 N원'(84%)을 읽음 — `lib/studio-price.ts` `hourlyPrice`
- 결과(로컬): 연남 2→35, 상수 2→29, 혜화 0→14, 압구정 4→9, 마포 60→94, 사당 59→38(방배 분리 예정). 서울 밖 지역은 기존 방식

## 2026-10-25 — 지역 페이지 "서울 깊게" ② 새 동네·얇은 페이지·구별 목록
- 새 페이지 7곳(역 반경, 각 8곳 이상): 방배 13 · 남성역 15(검색 유입이 404로 끝나던 곳) · 양재 17 · 교대·서초 9 · 목동(오목교역) 9 · 화곡 11 · 당산·영등포 8. 역 좌표 OSM 대조 200m 이내. 검색용 별칭도 추가(`lib/region-alias.ts`)
- 얇은 페이지: 서울 지역 중 8곳 미만은 `noindex, follow` + 사이트맵 제외(`isIndexable`). 현재 이태원 1곳만 해당. 주소는 유지
- `/region/noryangjin`(유입 있었지만 1.5km 안 7곳) → `/region` 임시 리다이렉트. 사당은 4km 이상 떨어져 있어 계획의 '사당으로'에서 목록으로 바꿈
- `/region` 목록: 서울은 구별로 묶고 지역 페이지와 같은 기준의 연습실 수 표시. `RegionMeta.gu` 추가

## 2026-10-25 — 연습실 데이터 품질 정리 (PR #19 + 운영 DB 수정)
- 조사: 공개 1,008곳(spacecloud 877·mule 131, 전부 2026-04-18 수집)
- **mule CDN 리퍼러 차단 발견** — 우리 사이트에서 mule 사진 전부 403(리퍼러 없으면 200). 우회하지 않고 `useWorkingPhotos`로 실패 사진을 빼고 "사진 없음" 칸 표시. 업체 직접 사진·mule 허락은 장기 과제(사용자 결정: 사진 없이 유지)
- 수집 규칙 `scripts/studio_rules.py`: '시간당 N원' → `price_per_hour`, 월세·보증금·월 대여·만원 단위 → M(‘월 대여 불가’ 제외)
- 운영 DB 수정(`scripts/fix_studio_data.py --apply`, 이전 값 백업 943행): `price_per_hour` 869곳 채움(검색 가격순·가격 필터 정상화) · mule room_type 53곳 재분류 · 원본 삭제된 사진 141개(35곳) 제거 · 사진 0장 15곳 비공개 → 공개 993곳
- 후속: 칸이 채워지자 카드 요금이 '₩1,000/h'로 줄어 원문의 '~'·패키지 요금이 사라짐 → 요금 문구는 원문 우선으로(`studioPriceLabel`)
- 발견만: '가격3,400 화정연습실'이 원문부터 '시간당 250,000원'(오타 추정), mule 광고형 이름, 6개월 묵은 데이터(재수집 주기 없음)

## 2026-10-26 — 연습실 데이터 최신화: 사진 여러 장 · 요금 · 폐업 (운영 DB 반영)
- 원인: 수집기(`crawling/spacecloud_scraper.py`) 상세 갤러리 선택자가 지도 타일(`nrbe.pstatic.net`) 8,298개만 긁어 와 공개 877곳 전부 대표 사진 1장뿐이었음
- robots.txt 확인: mule.co.kr은 검색엔진 외 전부 차단, api.spacecloud.kr은 Googlebot 외 차단 → 두 수집기 사용 중지. spacecloud 상세 페이지(`/space/<id>`)는 허용
- `scripts/refresh_spacecloud.py`: 이미 가진 `source_url` 공개 페이지를 1.5초 간격으로 열어 페이지 데이터(Next.js 조각)의 `detail`을 JSON으로 읽음 → 갤러리 사진(최대 10장, 복사 없이 원본 주소) · 상품별 최저 '시간당/패키지' 요금(기존 형식) · 404면 비공개. 링크·주소·좌표·이름은 안 건드림. `--plan` 미리보기 저장 → `--apply --plan --backup`
- 운영 반영(모두 미리보기 → 사용자 승인 → 이전 값 백업):
  1) 사진 1차(갤러리 주소 매칭): 719곳 1장 → 2~10장
  2) 최신화: 사진 107곳 · 요금 문구 109곳 · 페이지 없음(404, 표본 재확인) 78곳 비공개
  3) mule 116곳 비공개(사용자 결정 — 수집 금지라 갱신 불가, 사진도 리퍼러 차단으로 안 보임)
  → **공개 993 → 799곳(전부 spacecloud), 797곳이 사진 2장 이상(평균 7.6장)**. 서울 지역 페이지는 이태원 외 모두 8곳 이상 유지
- 수집 경로 정비: `crawling/run_all.sh`는 최신화 미리보기/`APPLY=1` 반영만(월 1회 권장, crawling/은 git 밖). `import_merged.py`의 `--reset`(studios 전체 삭제) 제거, 이미 있는 `source_url`은 건너뜀
- 하지 않은 것: 사진을 우리 Storage로 복사(저작권·용량, mule은 차단 우회 — 사용자 동의). 새 연습실 찾기(spacecloud 검색·API는 robots 차단 — 사장님 등록·제보 장기 과제). 상세 화면 갤러리는 이미 여러 장 지원해 앱 코드 변경 없음

## 2026-10-26 — 비공개 연습실 주소로 들어오면 근처 연습실 안내
- 배경: 최근 90일 연습실 상세 방문 1,613세션 중 365세션(23%)이 이번에 비공개한 곳(mule 월대여 글·폐업 spacecloud). 들어오면 "연습실을 찾을 수 없어요"만 보이고, 응답은 200이라 빈 페이지가 검색 색인에 남음
- `app/room/[id]/page.tsx`: 공개 목록에 없으면 id로 다시 조회 → 비공개면 `UnavailableRoom`(안내 + 가까운 공개 연습실 6곳 + 가장 가까운 지역 페이지·검색 버튼), 없는 id는 진짜 404, 조회 실패(uuid 아님 등)는 예전처럼 클라이언트 처리(ISR에 404가 굳지 않게). 공개 아닌 경우 메타 `noindex, follow`
- `lib/nearby-rooms.ts`: 같은 쓰임(월 대여 → M·both) 먼저 가까운 순, 모자라면 나머지. 약 3km 상자에서 3곳 미만이면 약 10km. 지역은 기준점 3km 안 가장 가까운 곳. 테스트 `tests/nearby-rooms.cjs`
- 이벤트 `room_unavailable_view` / `room_unavailable_click` (`docs/ANALYTICS.md`)
- 확인: 로컬 비공개(mule·폐업)·공개·없는 id 각각 200+noindex+안내 / 200 그대로 / 404. 390px 화면 가로 넘침 없음. tsc·build·테스트 35/35

## 2026-10-26 — 월 대여 연습실이 없으면 T룸/M룸 칩 숨김
- mule 116곳 비공개 후 공개 799곳이 전부 T라 검색 'M룸' 칩은 0곳, 'T룸'은 눌러도 그대로였음(비공개 결정 때 놓친 부작용)
- `hooks/useHasMonthlyRooms.ts`: 공개 M·both 수를 head count로 확인 → `FilterChips`는 있을 때만 T룸/M룸 표시. 예전 링크(`?room_type=M`)로 켜진 칩은 끌 수 있게 남김. 월 대여 연습실이 다시 생기면 자동으로 보임
- 확인: 로컬 기본 화면 칩 '전체·드럼·가격순·서울 전체…', `?room_type=M` 진입 시 M룸 칩 유지. build·테스트 35/35

## 2026-11-05 — 재방문 측정: 영구 익명 ID(anon_id)
- 문제: `ms_sid`가 sessionStorage라 비로그인 재방문이 전부 신규로 잡힘. 운영 DB 기준 최근 30일 studio_view 봇 UA 제외 366세션(봇 포함 768), 재방문 판정 불가.
- 수정: `lib/analytics/context.ts` `getAnonId()`(localStorage `ms_aid`) → `logEvent`가 `props.anon_id`로 적재. 스키마 변경 없음.
- 집계 쿼리: `docs/ANALYTICS.md` "재방문 측정". 11-05 이후 코호트만 유효.

## 2026-11-06 — 재방문 루프 Phase A: 최근 본·찜한 연습실을 첫 화면에
- 배경: 연습실 상세를 본 세션 366개, 세션당 상세 1.07개. 최근 본·찜은 있었지만 `/my-bookings` 탭 안에만 있어서, 다시 온 사람은 검색부터 다시 해야 했음
- 수정: `components/ReturnStrip.tsx`
  - 홈(히어로 위, 일본 모드 숨김)과 `/search`(목록 보기일 때만, 뷰 토글 바 아래)에 넣음
  - 최근 본·찜한 연습실을 각각 최대 6개, 가로 스크롤로 보여 줌. 둘 다 있으면 칩으로 전환하고 기본은 최근 본
  - 카드는 `StudioMiniCard` 재사용. 공개 연습실만 조회해서 비공개로 바뀐 ID는 빠짐
  - 목록이 0개면 아무것도 그리지 않음. DB 변경 없음
- 이벤트: `return_strip_view {count, kind}`, `return_strip_click {kind, studio_id}` (`docs/ANALYTICS.md`)
- 확인(로컬, GA·Amplitude·page_views 차단 + `utm_campaign=codex_qa`):
  - 첫 방문: 스트립 없음
  - 상세 2곳을 본 뒤 홈: 클릭 없이 스트립이 보임. localStorage에 넣은 비공개 ID 1개는 걸러짐(3 → 2장)
  - 찜 칩 전환, 카드 클릭 → 상세 이동 확인
  - 390px·1440px 홈·검색: `scrollWidth == innerWidth`. 390px 검색에서 스트립 아래 끝 약 600px, 탭바 위 끝 781px로 겹치지 않음
  - 일본 모드 홈: 스트립 없음
  - `user_events`에 view·click이 `props.anon_id`와 함께 적재됨(`event_type` 컬럼)
  - `npx tsc --noEmit` 0, 테스트 35/35, `npm run build` 성공
- 남은 것:
  - 실기기 미확인
  - `npm run lint`는 ESLint 설정이 없어 설정 질문에서 멈춤(이번 변경과 무관, 설정 추가는 보류)
  - 지표: 스트립 클릭률, 세션당 상세 조회 변화

## 2026-11-06 — 재방문 루프 Phase B: 상세에서 비교하고 후보 담기
- 배경: 상세에서 다른 연습실로 가는 길이 없었음(세션당 상세 1.07개). 멤버와 정할 곳을 모아 둘 방법도 없었음
- 수정 (DB 변경 없음):
  - 비교 블록 `app/room/[id]/_components/RoomCompare.tsx`
    - 위치 섹션 아래에 "근처 비슷한 연습실" 3곳: 썸네일·이름·요금(`studioPriceLabel`)·도보 분·드럼 여부
    - 데이터는 서버에서 만듦. `page.tsx` `fetchNearbyRooms`를 공개 연습실에도 쓰고 자기 자신은 뺌. ISR과 같이 캐시됨. `getStudio`에 `room_type` 추가
  - 후보 저장 `lib/candidates.ts`
    - localStorage `ms_candidates`, 최대 5곳, 비로그인 가능
    - 순수 함수 `toggleCandidate`·`parseCandidates`. 테스트 `tests/candidates.cjs`
    - 같은 탭 동기화는 `ms:candidates` 이벤트. 상태는 `hooks/useCandidates.ts`
  - 후보 토글 `CandidateToggle.tsx`: 정보 카드(공유·찜 옆)와 비교 행마다. 가득 차면 "최대 5곳"
  - 후보 바 `CandidateBar.tsx`
    - 1곳 이상이면 "후보 N곳 · 멤버랑 정하기 →"
    - 누르면 후보 시트(목록·빼기)가 열림. 비공개된 후보는 시트를 열 때 자동으로 빠짐
  - 하단 위치는 `--contact-bar-h` 규칙을 따름
    - `globals.css`에서 `:root:has([data-room-contact-bar])`이면 76px
    - 후보 바는 `calc(var(--contact-bar-h) + var(--tabbar-h) + var(--bottom-safe))` 높이에 섬
    - `RoomContactBar`에는 속성만 추가. 위치·동작은 그대로
- 이벤트: `compare_view {studio_id, count}`, `compare_click {studio_id}`, `candidate_toggle {studio_id, on, count}` (`docs/ANALYTICS.md`)
- 확인(로컬, GA·Amplitude·page_views 차단 + `utm_campaign=codex_qa`):
  - 비교 3행 표시, 행 클릭 → 다른 상세로 이동
  - 담기 2곳 → 바 "후보 2곳". 새로고침 후에도 유지
  - 5곳이 찬 상태에서 담기 → "최대 5곳", 목록 그대로
  - 시트에서 빼기 2 → 1, 비공개 ID는 자동 제거
  - 390px: 후보 바 아래 끝 768 = 문의 바 위 끝 768로 겹치지 않음. 맨 아래 "정보가 틀린가요?"(638)가 후보 바(708)에 가리지 않음
  - 390·1440px `scrollWidth == innerWidth`
  - `user_events`에 3개 이벤트가 `anon_id`와 함께 적재됨
  - tsc 0, 테스트 38/38, build 성공
- 남은 것:
  - 실기기(아이폰 홈 바 여백) 미확인
  - 바·시트는 상세에만 있음. 홈·검색 노출은 Phase D에서 판단
  - 투표 링크(Phase C, DB 변경)
  - 빌드 때 상세 프리렌더 500곳마다 근처 조회가 1~2번 늘어남

## 2026-11-06 — 재방문 루프 Phase C: 후보 투표 링크 (운영 DB 반영)
- 배경: 웹은 푸시를 못 보냄 → 밴드 단톡방에 우리 링크(후보 투표)를 심어 단톡방이 알림 역할을 하게 함
- DB `supabase/10_votes.sql` (사용자 승인 후 `apply_migration`, 기존 테이블 변경 없음)
  - 테이블: `votes`(+`parent_vote_id`, Phase D용) · `vote_responses` · `vote_secrets`(만든 사람 토큰의 sha256)
  - 직접 접근 차단: 세 테이블 모두 RLS on, 정책 0개, anon/authenticated 권한 REVOKE
  - 읽기·쓰기는 SECURITY DEFINER RPC 4개(`search_path` 고정)로만: `create_vote` / `get_vote` / `submit_vote_response` / `decide_vote`
  - 제한
    - 생성: 같은 anon 1시간 10개, 전체 1시간 300개
    - 응답: 투표당 50명, 닉네임 1~20자
    - 선택값: 후보·날짜 밖 선택은 버림. 시간대 4종
    - 기간: 만료 14일, 날짜 후보 60일 안 최대 7개. 결정·만료 후 응답 거부
  - 로컬 Postgres 18에서 2회 실행·권한·제한 검증 후 운영 적용
- 수정
  - `lib/votes.ts`: 타입·RPC 래퍼·순수 함수(`tallyVote`·`formatVoteDate`·`upcomingDates`). 테스트 `tests/votes.cjs`
  - 응답자 키는 anon_id가 아니라 기기 전용 `ms_vk`
    - 이유: `user_events`를 authenticated가 전부 읽을 수 있어(기존 정책) anon_id가 남에게 보임
    - 만든 사람 토큰은 `ms_vote_tokens`에 보관
  - 후보 시트에 `VoteCreatePanel`: 날짜 후보(14일 중 최대 7개, 선택) + "투표 링크 만들기" → `/vote/[id]`
  - `/vote/[id]`
    - `page.tsx`: noindex·nofollow, force-dynamic
    - `opengraph-image.tsx`: "다음 합주 어디서? 후보 N곳 투표"
    - `VoteClient.tsx`: 연습실·날짜·시간대 투표와 집계. 닉네임 입력·목록에 `SR_MASK_CLASS`
    - 만든 사람만 결정 → 상세로 이동
    - 결정 화면: "문의·예약하러 가기". `next_vote_id`가 있으면 새 투표 안내
  - `VoteShare.tsx`: 카카오톡 공유(SDK, `#FFD600` 허용 지점에 추가) + 링크 복사. UTM campaign `vote`(`ShareCampaign`에 추가)
  - `/vote`를 `JA_BLOCKED_PREFIXES`에 추가(ko 전용)
- 이벤트: `vote_create` · `vote_share` · `vote_view` · `vote_submit` · `vote_decide` · `vote_to_contact` (`docs/ANALYTICS.md`)
- 확인(로컬 → 운영 DB, GA·Amplitude·page_views 차단 + `utm_campaign=codex_qa`)
  - 만든 사람: 상세 후보 2곳 + 날짜 2개 → 투표 생성 → 공유 카드·결정 버튼 보임
  - 멤버(별도 브라우저 세션, 로그인·토큰 없음): 공유·결정 버튼 없음. 닉네임+연습실·날짜·시간대 투표 → "투표 고치기"로 바뀜, 집계 1표
  - 만든 사람 결정 → 그 상세로 이동. 멤버 화면은 결정 배너·폼 숨김, "문의·예약하러 가기" → 상세
  - 차단
    - anon REST로 세 테이블 GET·POST → 401 `permission denied`
    - 일본어 쿠키 → 307 홈
    - 잘못된 id → "투표를 찾을 수 없어요"
  - 화면·메타: OG 이미지 200(한글 정상), 390·1440px 가로 넘침 없음
  - 이벤트: 5종이 anon_id와 함께 적재
  - tsc 0, 테스트 42/42, build 성공
- 남은 것
  - `vote_share` 미확인: 카카오 SDK는 운영 도메인 등록이 필요하고, 결정 후라 공유 카드가 숨겨짐 → 미리보기 배포에서 확인
  - 운영 `votes`에 QA 투표 1건(`5845fd1a-…`, 응답 1건) 남음. 삭제는 승인 필요
  - Phase D: 밴드로 저장, 다음 합주 투표 잇기(`parent_vote_id` 준비됨), 홈 스트립 "진행 중인 투표"
  - 발견(기존, 이번 범위 밖)
    - `user_events`를 authenticated 누구나 전부 읽음
    - `reset_weekly_challenge_scores`·`award_season_titles` 등 SECURITY DEFINER 함수를 anon이 실행 가능(advisor 경고)

## 2026-11-06 — 재방문 루프 Phase D: 결정을 다음 방문으로 잇기
- 배경: 투표로 정한 뒤 끝나 버리면 다음 합주 때 다시 네이버를 연다. 결정 기록을 밴드 일정에 남기고, 단톡방에 있는 링크와 홈에서 다음 투표로 이어지게 함
- DB 변경 없음
  - `votes.parent_vote_id`와 RPC 인자는 Phase C에 미리 넣어 둠
  - 밴드 저장은 기존 RLS로 가능: bands·본인 band_members·소속 밴드 일정 insert
- 수정
  - `VoteSaveToBand.tsx`: 결정된 투표에 "우리 밴드 합주 일정으로 저장"
    - 비로그인이면 `/login?returnTo=/vote/[id]`
    - 내 밴드 고르기 또는 새 밴드 만들기(`MyBandClient`와 같은 방식, leader 행 추가)
    - 날짜·시간대는 최다 득표로 채움(`topKey`). 시간대 → 시작 시각은 `SLOT_START_TIME`
    - 일정 내용: 제목 `합주 · 연습실명`, 장소, 메모에 투표 링크
  - "다음 합주도 여기서 정하기": 결정·마감된 투표에서 같은 후보로 새 투표(`VoteCreatePanel`에 `parentVoteId`)
    - 옛 링크에는 "다음 합주 투표가 새로 열렸어요 →"(`next_vote_id`)
  - 홈·검색 스트립에 kind `vote` "진행 중인 투표"
    - 대상: 내가 만들었거나 투표한 투표(localStorage `ms_my_votes`, 최근 5개 RPC 조회) 중 마감·결정 전이고 다음 투표로 넘어가지 않은 것
    - 있으면 기본 탭
  - **기존 버그 수정**(사용자 승인): `/my-band/[id]`가 `band_schedules.schedule_date`로 읽고 썼는데 DB 컬럼은 `date`
    - 그래서 일정 추가가 항상 실패했음(운영 일정 0건)
    - 코드를 `date`로 맞춤(`types/database.types.ts`도 `date`). 다른 사용처 없음(전체 검색)
- 이벤트: `vote_band_save {vote_id, is_new_band}`, `vote_create.is_followup`, `return_strip_* kind=vote`(click에 `vote_id`). 재진입 쿼리는 `docs/ANALYTICS.md` "투표 링크 재진입"
- 확인(로컬 → 운영 DB, 분석 차단 + `utm_campaign=codex_qa`)
  - 결정된 투표: 비로그인이면 "로그인하고 저장하기" 링크(returnTo 포함)
  - "다음 합주도 여기서 정하기" → 날짜 1개 → 새 투표(`ad15dff2`, `is_followup=true`)
  - 옛 투표: 새 투표 안내 배너가 뜨고 잇기 버튼은 숨김
  - 멤버 세션: 단톡방 옛 링크(utm kakao) → 배너 → 새 투표 → 투표
    - 홈 스트립 "진행 중인 투표 · 결과 보기 →" → 같은 투표로 재진입
  - 이벤트: 같은 anon_id의 `vote_view` 3회 중 1회가 `return_strip_click(kind=vote)` 직후
  - 390·1440px 가로 넘침 없음. tsc 0, 테스트 44/44, build 성공
    - 첫 빌드에서 `/region` 조회 statement timeout 1회. 재빌드는 정상(이번 변경 무관, 일시적)
- 남은 것
  - **밴드 저장·`/my-band` 일정 수정은 브라우저 미확인**(로그인 필요 — 에이전트는 로그인 불가). 미리보기에서 로그인 후 확인 필요
  - "다른 날" 재진입은 시간이 지나야 집계됨(쿼리 준비)
  - QA 투표 2건(`5845fd1a`, `ad15dff2`)과 응답 2건이 운영에 남음. 삭제는 승인 필요

## 2026-11-06 — 보안 점검 후속: 위험 함수 권한·이벤트 읽기·칭호 발급 버그 (운영 DB 반영)
- 점검(읽기 전용): 비밀값 5개 클라이언트 번들 0건, public 42개 테이블 RLS on, 공개 쓰기는 폼·분석 INSERT만, DM·알림·예약·등록 신청 비공개
- 수정 `supabase/11_security_hardening.sql` (사용자 승인 후 `apply_migration`)
  - `award_season_titles`: anon 키로 `/rest/v1/rpc` 직접 호출하면 누구나 칭호 발급 가능했음 → anon·authenticated 실행 권한 제거(service_role 유지)
  - `reset_weekly_challenge_scores`: 누구나 전체 weekly_score 0으로 만들 수 있었음 → 같은 조치(호출처·크론 없음)
  - `user_events`: 로그인한 누구나 전 사용자 행동 로그를 읽던 정책 `authenticated can read events` 삭제(INSERT 정책 유지, 관리자 KPI는 서비스 키)
- 기존 버그: `app/api/admin/award-titles`가 `p_year`/`p_quarter`로 호출 → 실제 인자는 `p_season_year`/`p_season_quarter`라 PostgREST 404, 칭호 발급이 항상 실패(운영 칭호 0건)
  - 인자 이름 수정. 관리자 화면은 `awarded`를 숫자로 기대해서, 응답도 부여 인원 수로 바꿈
- 확인
  - anon RPC 두 함수 → 401 `permission denied`. service_role 실행 권한 true
  - 예전 인자 이름 → 404(함수 못 찾음), 새 이름 → 함수를 찾음(anon은 권한에서 401)
  - tsc 0, 테스트 44/44, build 성공
- 남은 것
  - ~~운영 `ADMIN_PASSWORD` 교체(로컬 값은 6자): 사용자가 직접~~ → 11-06 완료(세션 시크릿 포함)
  - 관리자 로그인 시도 제한
  - `/api/translate` 호출 제한(로그인 요구 또는 Vercel WAF) — 방식 결정 필요
  - 관리자 화면에서 실제 칭호 발급은 미확인(관리자 로그인 필요)
- 후속(같은 날): 관리자 화면 시즌 시상이 `column reference "title_key" is ambiguous`로 실패
  - 원인: 반환형 `TABLE(awarded_user_id, title_key)`의 `title_key`가 PL/pgSQL 변수가 되어 `RETURNING ... title_key` 컬럼과 충돌. 인자 이름 오류 때문에 그동안 여기까지 실행된 적이 없었음
  - `supabase/12_award_titles_fix.sql`: `#variable_conflict use_column` 한 줄 추가(사용자 승인 후 운영 적용). 본문·`search_path=public`·실행 권한(service_role만) 유지 확인
  - 로컬 Postgres 18: 기존 본문 오류 재현 → 수정본은 KR 상위만 시상, 같은 시즌 재실행 0명

## 2026-11-06 — 투표 관리 링크: 다른 기기에서도 결정 (DB 변경 없음)
- 배경: 만든 사람 토큰(`ms_vote_tokens`)이 만든 기기에만 있어 PC에서 만들고 휴대폰(단톡방)에서 결정할 수 없었음
- 링크 `/vote/<id>#k=<creator_token>` — 토큰은 해시에만(서버·리퍼러로 안 감), 쿼리·경로 금지, UTM 없음
  - `app/vote/[id]/page.tsx`: 하이드레이션 전 인라인 스크립트가 해시 토큰을 꺼내고 `history.replaceState`로 즉시 지움(GA·Amplitude 자동 수집 전)
  - `VoteClient.tsx`: 꺼낸 토큰으로 `get_vote` → `is_creator`면 `saveCreatorToken`, 아니면 저장하지 않고 멤버 화면(오류 표시 없음). 기기에 이미 있던 유효 토큰은 유지
  - `VoteAdminLink.tsx`: 만든 사람에게만 "🔑 내 관리 링크"(결정 전후·다음 투표 모두) — [나에게 카톡 보내기](SDK, 실패 시 복사) · [링크 복사]
  - `lib/votes.ts`: `parseAdminHash` · `buildAdminLink` (테스트 `tests/votes.cjs`)
- 이벤트: `vote_admin_link_copy {vote_id, method}` · `vote_admin_link_open {vote_id, valid}` — 토큰 값은 이벤트·콘솔에 없음
- 확인(로컬 → 운영 DB, `codex_qa`, GA·Amplitude·page_views 차단): QA 투표 `966f9741`
  - 새 프로필에서 관리 링크 → 결정 버튼, 주소창 `#k=` 사라짐, 새로고침 후에도 만든 사람 화면
  - 멤버 링크 → 결정 버튼·관리 블록 없음 / 토큰 1글자 변경 → 멤버 화면, `valid=false`, 오류 없음
  - 운영 `user_events` QA 9행: page·referrer·props에 `k=`·긴 hex 0건
  - tsc 0, 테스트 46/46, build 성공, 390·1440px 가로 넘침 없음
- 남은 것: 실제 휴대폰 카카오톡 "나와의 채팅" 전송은 사용자 확인 필요

## 2026-11-06 — 하루 정리 (PR #25 ~ #34)
| PR | 내용 | DB |
|----|------|----|
| #25 | 재방문 측정용 영구 익명 ID `anon_id`(`ms_aid`) → `user_events.props` | — |
| #26 | Phase A: 홈·검색 "최근 본 / 찜한 연습실" 스트립 | — |
| #27 | Phase B: 상세 "근처 비슷한 연습실" 비교 + 후보 담기(`ms_candidates`, 최대 5) | — |
| #28 | Phase C: `/vote/[id]` 후보 투표(로그인 없이 투표, 만든 사람만 결정, 카카오 공유·OG) | `10_votes.sql` 적용 |
| #29 | Phase D: 밴드 일정 저장·다음 합주 투표 잇기·스트립 "진행 중인 투표" + `/my-band` 일정 컬럼 버그 | — |
| #30 | 보안: 위험 RPC 2개 공개 실행 차단, `user_events` 전체 읽기 제거, 칭호 발급 인자 오류 | `11_security_hardening.sql` 적용 |
| #31 | 시즌 시상 함수 `title_key` 모호성 오류(관리자 화면에서 시상 동작 확인) | `12_award_titles_fix.sql` 적용 |
| #32 | 문서: 하루 정리·TROUBLESHOOTING | — |
| #33 | 투표 관리 링크 `/vote/<id>#k=…`: 다른 기기에서도 결정(토큰은 해시에만, 즉시 제거) | — |
| #34 | 문서: PHASES 수치 정정(봇 제외 366세션)·우선순위 정리(재방문 후속 맨 위, Cron 보류, ADMIN_PASSWORD 즉시) | — |

- 흐름: 연습실 검색자 → 상세에서 비교·후보 → 단톡방 투표 링크 → 결정 → 상세 문의·예약 / 밴드 일정 → 다음 합주 때 옛 링크·홈 스트립으로 재방문. 8마디는 기존 `challenge_nudge`로 연결(새로 만들지 않음)
- 검증 방식: 매 PR tsc·테스트(35 → 46개)·build, 로컬 390/1440px 브라우저 확인, 분석은 `utm_campaign=codex_qa` 표시, DB 변경은 로컬 Postgres 18에서 먼저 검증 → 승인 → 적용 → 권한 재확인
- 운영에 남긴 QA 데이터(사용자 결정: 지우지 않음): 투표 3건(`5845fd1a`·`ad15dff2`·`966f9741`)·응답 2건, `codex_qa` 이벤트
- 운영 배포: #33·#34 Vercel 배포 완료 확인. 운영 `/vote/[id]`에 해시 토큰 제거 스크립트 포함, `noindex, nofollow` 유지
- 알게 된 것
  - 공개 테이블 42개 모두 RLS on(CLAUDE.md의 "RLS 대부분 비활성화"는 옛 정보 → 수정)
  - `fix/db-security-hardening` 이름 브랜치는 GitHub가 `fatal error in commit_refs`로 계속 거부(장애·규칙·이름 충돌 없음). 이름을 바꾸니 해결 → `docs/TROUBLESHOOTING.md`
  - URL 해시는 서버·리퍼러로 가지 않지만 GA·Amplitude(자동 수집·세션 리플레이)는 전체 URL을 읽을 수 있음 → 비밀값은 하이드레이션 전 인라인 스크립트로 꺼내고 바로 지운다
  - 같은 날 PHASES.md를 고치는 PR 2개(#33·#34)가 같은 줄 근처를 건드려 충돌 → rebase로 해결. 푸시 직후 GitHub가 머지 가능 여부를 다시 계산하는 동안 `merge conflicts`로 거부될 수 있으니 잠시 뒤 재시도
- 사용자 확인 필요: 휴대폰에서 [나에게 카톡 보내기] → "나와의 채팅" 링크로 결정 버튼, "우리 밴드로 저장"(로그인), 투표 카카오톡 공유
- 다음: 위 "진행 중 / 다음 작업"의 "재방문 루프 후속"(11-13 지표 + 합주팀 3팀) · ~~`ADMIN_PASSWORD` 교체~~ 완료(세션 시크릿 포함, 재배포 후 사용자 확인)

