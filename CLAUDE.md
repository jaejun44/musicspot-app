# Music Spot — CLAUDE.md

뮤지션을 위한 합주실 + 8마디 챌린지 + 밴드매칭 + 커뮤니티 통합 플랫폼.

> ⚠️ **모든 UI는 Figma 디자인 충실히 구현**. 임의 해석·커스텀 스타일 금지.
> Figma: `https://www.figma.com/make/o5UzsSFzgL8h1ZGO2I5Q8D/musicspotMVP`

---

## 작업 시작 전 필수 확인

1. **응답은 한국어로**
2. **파일 변경 전 반드시 Read 먼저**
3. **컨텍스트 절약**: 큰 파일은 offset/limit 100줄씩, Bash 출력은 head/tail/grep으로 자르기. MCP 호출은 ⬇️ "MCP 응답 다이어트" 규칙 준수
4. **기존 패턴 존중** — MVP, 과도한 추상화 금지
5. **작업 유형별 참조 문서를 그때 Read** (아래 "참조 문서" 인덱스). 본 파일은 항상 필요한 핵심만 담음.

---

## 핵심 제약 (요약 — 위반 시 치명적, 상세는 `docs/RULES.md`)

- ❌ 명예 시스템 타이틀 삭제·회수 기능 금지 (시간 가치 = 신뢰)
- ❌ `challenge_score`/`mutual_responses`/`pass_chain` 필드 삭제 금지
- ❌ 8마디 응답 5단계 중 '패스' 옵션 제거 금지
- ❌ 디자인 토큰 임의 변경 금지 (색상·그림자·라운드 → `docs/DESIGN.md` 절대 준수)
- ❌ 일본 진출 기능 / B2B SaaS·M→T 자동화 (현 단계 범위 밖)
- ✅ 모든 유저 활동에 `user_id + country + created_at(UTC)` 기록
- ✅ 신규 테이블에 `country` / `language` / `created_at` 포함

> UI 작업 → `docs/DESIGN.md` Read / 제품·전략 제약 전체 → `docs/RULES.md` Read

---

## 기술 스택

| 레이어 | 기술 |
|--------|------|
| 프레임워크 | Next.js 14 (App Router) + TypeScript |
| 스타일 | Tailwind CSS / Framer Motion (`^12`) |
| DB/백엔드 | Supabase (PostgreSQL, RLS 대부분 비활성화) |
| 지도/공유 | Kakao Maps + REST(지오코딩) / Kakao JS SDK |
| 분석 | GA4 + Supabase `user_events` (`lib/analytics.ts`) |
| 배포 | Vercel (main 브랜치 자동) |

### 환경변수 (`.env.local`)
```
NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_KAKAO_MAP_KEY / NEXT_PUBLIC_KAKAO_JS_KEY
NEXT_PUBLIC_GA_ID / NEXT_PUBLIC_ADMIN_PASSWORD
SUPABASE_SERVICE_KEY        # 서버사이드만
CRON_SECRET                 # Vercel Cron 인증
```

---

## MCP 응답 다이어트 (컨텍스트 절약 핵심)

**원칙: 기본은 작게, 필요하면 키운다.** "무조건 작게"가 아니라 "목적에 맞는 만큼". 탐색·파악은 가볍게, 분석·디버깅에 진짜 데이터가 필요하면 목적을 밝히고 범위를 넓힌다.

### Supabase MCP
- **스키마 파악**: `list_tables`로 전체 스키마 통째 받지 말 것 (수만 토큰). 특정 테이블 구조만 필요하면 `execute_sql`로 `information_schema.columns` 한정 조회.
- **데이터 조회**: `SELECT *` 금지. 필요한 컬럼만 + `LIMIT` 기본. 샘플은 `LIMIT 5~10`으로 시작.
- **예외**: 디버깅·분석에 더 필요하면 → 목적 한 줄 밝히고 범위 확대 (질에 필요한 데이터는 받는다).
- ⚠️ "데이터 패턴 > 1,000행 우회"는 앱 런타임 코드용. MCP 탐색 조회와 혼동 금지.

### Vercel MCP
- `list_deployments`: 최신 1~3개만 (`limit` 활용). `get_logs`/`get_runtime_logs`: 라인·시간 범위 제한, 전체 덤프 금지. `list_projects`: 식별 후 재호출 금지.

### 공통
- 같은 결과 같은 세션에서 반복 호출 금지 (재사용). 큰 응답 예상 시 count/구조 먼저 → 필요 범위만 본조회.

---

## 데이터 패턴

### Supabase 1,000행 제한 우회 (필수 — 앱 런타임 코드)
```typescript
const all: Studio[] = [];
let offset = 0;
while (true) {
  const { data } = await supabase
    .from('studios').select('*')
    .eq('is_published', true)
    .range(offset, offset + 999);
  if (!data || data.length === 0) break;
  all.push(...data);
  if (data.length < 1000) break;
  offset += 1000;
}
```
- GPS 검색: 전체 fetch → 프론트 거리 정렬 (`lib/sort.ts`)
- 텍스트 검색: `.order('data_quality_score', { ascending: false })`
- ⚠️ `.limit()` 금지, 배치 range 필수

---

## Supabase 주요 테이블

```
studios              연습실 (1,165개)
bookings             예약
user_profiles        밴드매칭 프로필
direct_messages      1:1 채팅 (Realtime)
bands / band_members / band_schedules    밴드 스케줄러
studio_reviews       연습실 리뷰
posts / post_likes / post_comments       커뮤니티 (RLS disabled)
notifications        실시간 알림 (RLS enabled, Realtime)
stem_projects / stem_tracks              8마디 챌린지
user_titles / user_challenge_score / challenge_pass_chain   명예 시스템
user_mutual_responses    밴드 매칭 신호
user_follows / user_events / studio_reports / studio_requests / page_views / feedbacks
Storage: stems       오디오 (30MB, MP3/WAV/OGG/M4A/FLAC)
```

> 신규 테이블 필수 컬럼(country/language/created_at) 상세 → `docs/RULES.md`

---

## 참조 문서 (작업 유형별 그때 Read)

| 작업 유형 | 문서 |
|----------|------|
| UI·디자인·Figma 구현 | `docs/DESIGN.md` — 색상·폰트·그림자·Framer·Figma 변환 |
| 제품·전략 제약 전체 | `docs/RULES.md` — 금지/필수, 한일 설계 컬럼 |
| 에러·빌드 막힘 | `docs/TROUBLESHOOTING.md` — 알려진 이슈, Next.js 패턴 |
| 진행 중/다음 작업 | `docs/PHASES.md` — Phase 로그, 1순위 Cron, 장기 대기 |
| 전략·깔때기·8마디 OS | `docs/STRATEGY.md` |
| 화면 정의 | `docs/SCREENS.md` |
| 이벤트 트래킹 | `docs/ANALYTICS.md` |

전략 원본: `/Users/jaejunlee/Desktop/Music-Spot/music spot/`
백업: `CLAUDE_PRE_SLIM_2026-06-09.md` (슬림화 이전), `CLAUDE_FULL_2026-06-06.md` (구버전 전체)

---

## 작업 방식

1. 이 파일 먼저 읽어 컨텍스트 파악
2. 작업 유형에 맞는 `docs/` 문서만 추가 Read
3. Figma 화면 기준으로 구현
4. 완료 후 `docs/PHASES.md` 진행 로그 업데이트
5. 새 트러블슈팅 → `docs/TROUBLESHOOTING.md`에 추가
