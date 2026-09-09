# 개발 진행 로그

> Phase별 완료 항목 기록. 새 Phase 시작 시 여기에 추가.

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

### 1순위: 주간 점수 리셋 Cron
- `app/api/cron/reset-weekly-scores/route.ts` — Vercel Cron
- 매주 월요일 00:00 KST `reset_weekly_challenge_scores()` 호출
- `Authorization: Bearer {CRON_SECRET}` 헤더 검증
- `CRON_SECRET` 환경변수 Vercel 추가
- `vercel.json`: `"0 15 * * 0"` (일요일 15:00 UTC = 월요일 00:00 KST)

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
