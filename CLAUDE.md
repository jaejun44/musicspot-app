# Music Spot — CLAUDE.md

뮤지션을 위한 합주실 + 8마디 챌린지 + 밴드매칭 + 커뮤니티 통합 플랫폼.

> ⚠️ **모든 UI는 Figma 디자인 충실히 구현**. 임의 해석·커스텀 스타일 금지.
> Figma: `https://www.figma.com/make/o5UzsSFzgL8h1ZGO2I5Q8D/musicspotMVP`

---

## 작업 시작 전 필수 확인

1. **응답은 한국어로**
2. **파일 변경 전 반드시 Read 먼저**
3. **컨텍스트 절약**: 큰 파일은 offset/limit 100줄씩, Bash 출력은 head/tail/grep으로 자르기. MCP 호출은 ⬇️ "데이터 접근 철칙" 준수
4. **기존 패턴 존중** — MVP, 과도한 추상화 금지
5. **작업 유형별 참조 문서를 그때 Read** (아래 "참조 문서" 인덱스). 본 파일은 항상 필요한 핵심만 담음.

---

## 핵심 제약 (요약 — 위반 시 치명적, 상세는 `docs/RULES.md`)

- ❌ 명예 시스템 타이틀 삭제·회수 기능 금지 (시간 가치 = 신뢰)
- ❌ `challenge_score`/`mutual_responses`/`pass_chain` 필드 삭제 금지
- ❌ 8마디 응답 5단계 중 '패스' 옵션 제거 금지
- ❌ 디자인 토큰 임의 변경 금지 (색상·그림자·라운드 → `docs/DESIGN.md` 절대 준수)
- ❌ B2B SaaS 대시보드 / 17개 사업자 필드 폼 / M→T 자동화 (Y2 이후)
- ✅ 모든 유저 활동에 `user_id + country + created_at(UTC)` 기록
- ✅ 신규 테이블에 `country` / `language` / `created_at` 포함
- ✅ 일본 **웹 기능**(i18n·JA 로케일·X/LINE 공유 등)은 범위 내 — 2026-10까지 웹개발 집중.
  일본 **비즈니스 진출**(공식 투자·현지 운영·JASRAC 계약·결제)은 2026-10 이후.

> UI 작업 → `docs/DESIGN.md` Read / 제품·전략 제약 전체 → `docs/RULES.md` Read

---

## 기술 스택

| 레이어 | 기술 |
|--------|------|
| 프레임워크 | Next.js 14 (App Router) + TypeScript |
| 스타일 | Tailwind CSS / Framer Motion (`^12`) |
| DB/백엔드 | Supabase (PostgreSQL, 공개 테이블 전부 RLS on — 2026-11-06 확인) |
| 지도/공유 | Kakao Maps + REST(지오코딩) / Kakao JS SDK |
| 분석 | GA4 + Amplitude(Analytics·Session Replay) + Supabase `user_events` (`lib/analytics.ts`) |
| 배포 | Vercel (main 브랜치 자동) |

### 환경변수 (`.env.local`)
```
NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_KAKAO_MAP_KEY / NEXT_PUBLIC_KAKAO_JS_KEY
NEXT_PUBLIC_GA_ID / NEXT_PUBLIC_ADMIN_PASSWORD
NEXT_PUBLIC_AMPLITUDE_API_KEY   # Amplitude 클라이언트 write key (미설정 시 트래킹만 비활성)
SUPABASE_SERVICE_KEY        # 서버사이드만
CRON_SECRET                 # Vercel Cron 인증
BOOKING_ORIGIN              # 실시간 예약 프론트 배포 주소. /booking/* rewrite 대상 (production 빌드 필수)
NEXT_PUBLIC_BOOKING_API_URL # 실시간 예약 API (예: https://api.musicspotfest.com)
BOOKING_ADMIN_API_TOKEN     # 예약 서버 관리자 키(사장님 초대 링크). 서버 전용, NEXT_PUBLIC 금지
```

---

## 데이터 접근 철칙 (위반 시 조용히 틀림 — 상세·예시 `docs/DATA_ACCESS.md`)

- **앱 코드 Supabase 조회**: `.limit()` 금지 → `range` 1,000행 배치 + 정렬 끝에 `.order('id')` + `error`는 throw (예: `lib/region-rooms.ts`). 1,000행 넘으면 오류 없이 잘림
- **Supabase MCP**: `list_tables` 통째·`SELECT *` 금지 → 필요한 컬럼 + `LIMIT`, 스키마는 `information_schema.columns`로 한정
- **Vercel MCP**: `list_deployments`는 1~3개, 로그는 범위 제한, 같은 호출 반복 금지
- ⏩ **Supabase 조회 코드를 쓰거나 MCP로 조회·분석하기 전에 `docs/DATA_ACCESS.md` Read**

---

## Supabase 주요 테이블

```
studios              연습실 (공개 799곳, 전부 spacecloud · 2026-10-26. 최신화: scripts/refresh_spacecloud.py)
bookings             예약
user_profiles        밴드매칭 프로필
direct_messages      1:1 채팅 (Realtime)
bands / band_members / band_schedules    밴드 스케줄러
studio_reviews       연습실 리뷰
posts / post_likes / post_comments       커뮤니티
notifications        실시간 알림 (RLS enabled, Realtime)
stem_projects / stem_tracks              8마디 챌린지
user_titles / user_challenge_score / challenge_pass_chain   명예 시스템
user_mutual_responses    밴드 매칭 신호
user_follows / user_events / studio_reports / studio_requests / page_views / feedbacks
votes / vote_responses / vote_secrets    합주 후보 투표 /vote/[id] (정책 0개 — RPC 4개로만 접근, supabase/10_votes.sql)
Storage: stems       오디오 (30MB, MP3/WAV/OGG/M4A/FLAC)
```

> 신규 테이블 필수 컬럼(country/language/created_at) 상세 → `docs/RULES.md`

---

## 참조 문서 (작업 유형별 그때 Read)

| 작업 유형 | 문서 |
|----------|------|
| UI·디자인·Figma 구현 | `docs/DESIGN.md` — 색상·폰트·그림자·Framer·Figma 변환 |
| 제품·전략 제약 전체 | `docs/RULES.md` — 금지/필수, 한일 설계 컬럼 |
| Supabase 조회 코드·MCP 조회 | `docs/DATA_ACCESS.md` — 1,000행 배치 예시, MCP 응답 다이어트 상세 |
| 에러·빌드 막힘 | `docs/TROUBLESHOOTING.md` — 알려진 이슈, Next.js 패턴 |
| 진행 중/다음 작업 | `docs/PHASES.md` — 맨 위 "현재 상태" 요약 → 진행 중 / 다음 작업·보류 → 날짜별 작업 로그 |
| 에이전트 인수인계 | `docs/HANDOFF.md` — Claude Code ↔ Claude Cowork 작업 기록·요청 (시작·마무리 때 필수) |
| 전략·깔때기·8마디 OS | `docs/STRATEGY.md` |
| 화면 정의 | `docs/SCREENS.md` |
| 이벤트 트래킹 | `docs/ANALYTICS.md` |
| 유입·리텐션 개선 | `docs/PLAN_user_growth.md` — ROI 순 우선순위, 바이럴 루프 버그 |

전략 원본: `/Users/jaejunlee/Desktop/Music-Spot/music spot/`
CLAUDE.md 과거 버전: `git log --follow -- CLAUDE.md` → `git show <커밋>:CLAUDE.md`

---

## 작업 방식

1. 이 파일 먼저 읽어 컨텍스트 파악
2. **`docs/HANDOFF.md`(짧음, 통째로) + `docs/PHASES.md` 첫 `---`까지("현재 상태", ~30줄 — PHASES 전체 Read 금지)** — Cowork가 남긴 요청(`상태: 열림`)이 있으면 먼저 이어받는다. `git status`로 커밋 안 된 변경도 확인(지우지 말고 HANDOFF와 대조)
3. 작업 유형에 맞는 `docs/` 문서만 추가 Read
4. Figma 화면 기준으로 구현
5. 완료 후 `docs/PHASES.md` 날짜 로그 + "현재 상태" 업데이트, `docs/HANDOFF.md`에 항목 추가(규칙은 HANDOFF 안)
6. 새 트러블슈팅 → `docs/TROUBLESHOOTING.md`에 추가
