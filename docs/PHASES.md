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
- 일본어 페이지 + ja hreflang 활성화 (일본 진출 시점)

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

---

## 진행 중 / 다음 작업

### 1순위: 주간 점수 리셋 Cron
- `app/api/cron/reset-weekly-scores/route.ts` — Vercel Cron
- 매주 월요일 00:00 KST `reset_weekly_challenge_scores()` 호출
- `Authorization: Bearer {CRON_SECRET}` 헤더 검증
- `CRON_SECRET` 환경변수 Vercel 추가
- `vercel.json`: `"0 15 * * 0"` (일요일 15:00 UTC = 월요일 00:00 KST)

### 장기 대기 (B2B 계약 후)
- 실결제 PG 연동 (토스페이먼츠 / 아임포트)
- 연습실 업체 대시보드 (`/partner`)

---

## Git 버전 태그
- `v0.5.0` — 업체 등록 신청 (재구축 이전 마지막 안정)
- `v1.0.0` — Figma 디자인 기반 전면 재구축 (목표)
