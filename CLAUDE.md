# Music Spot — CLAUDE.md

뮤지션을 위한 합주실 + 8마디 챌린지 + 밴드매칭 + 커뮤니티 통합 플랫폼.

> ⚠️ **모든 UI는 Figma 디자인 충실히 구현**. 임의 해석·커스텀 스타일 금지.
> Figma: `https://www.figma.com/make/o5UzsSFzgL8h1ZGO2I5Q8D/musicspotMVP`

---

## 작업 시작 전 필수 확인

1. **응답은 한국어로**
2. **파일 변경 전 반드시 Read 먼저**
3. **컨텍스트 절약**: 큰 파일은 offset/limit 100줄씩, Bash 출력은 head/tail/grep으로 자르기
4. **기존 패턴 존중** — MVP, 과도한 추상화 금지

---

## 기술 스택

| 레이어 | 기술 |
|--------|------|
| 프레임워크 | Next.js 14 (App Router) + TypeScript |
| 스타일 | Tailwind CSS |
| 애니메이션 | Framer Motion (`framer-motion: ^12`) |
| DB/백엔드 | Supabase (PostgreSQL, RLS 대부분 비활성화) |
| 지도 | Kakao Maps API + Kakao REST (지오코딩) |
| 공유 | Kakao JS SDK |
| 분석 | GA4 + Supabase `user_events` (`lib/analytics.ts`) |
| 배포 | Vercel (main 브랜치 자동) |

### 환경변수 (`.env.local`)
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_KAKAO_MAP_KEY
NEXT_PUBLIC_KAKAO_JS_KEY
NEXT_PUBLIC_GA_ID
NEXT_PUBLIC_ADMIN_PASSWORD
SUPABASE_SERVICE_KEY        # 서버사이드만
CRON_SECRET                 # Vercel Cron 인증
```

---

## 디자인 토큰 (절대 준수)

### 색상
```
Pink:       #FF3D77   주요 CTA, 강조
LimeYellow: #F5FF4F   뱃지, 필터칩, 데코 (Music Spot 고유, 카카오 #FFD600 대체)
Blue:       #4FC3F7   CTA 보조, 정보 태그
Green:      #41C66B   완료, 긍정 (네이버 #00D26A 절대 사용 금지)
Cream:      #FFF8F0   배경 기본
Navy:       #242447   다크 배경, 강조 텍스트
Black:      #0A0A0A   텍스트, 테두리, 그림자
White:      #FFFFFF   카드, 입력창
```

**카카오 옐로 `#FFD600` 독점 사용처 4곳만 허용**:
- `LoginClient.tsx` 카카오 OAuth
- `PaymentClient.tsx` 카카오페이
- `RoomBookingWidget.tsx` 카카오 채널
- `RoomContactBar.tsx` 카카오 채널

Tailwind 토큰: `comic-pink`, `comic-yellow`, `comic-blue`, `comic-green`, `comic-cream`, `comic-black`

### 폰트
- 헤드라인: `font-bungee` (Bungee) — 숫자, 타이틀, 로고
- 본문: `font-pretendard` (Pretendard Variable)

### 테두리 & 그림자 (핵심)
```
테두리: border-[3px] border-[#0A0A0A]  (또는 4px)
모서리: rounded-[12px] ~ rounded-[24px]  ← 반드시 둥글게
그림자: 4px 4px 0 #0A0A0A  (blur 없음, offset만)
큰그림자: 6px / 8px / 12px 12px 0
```

❌ **금지**: `rounded-none`, 블러 그림자(`shadow-lg` 등), 어두운 다크 배경
✅ **필수**: 모든 카드/버튼 `rounded-[12px]` 이상 + offset 그림자

### Framer Motion 패턴
```typescript
// 카드 hover
whileHover={{ y: -8, rotate: 2, boxShadow: '10px 10px 0 #0A0A0A' }}
// 버튼 press
whileTap={{ scale: 0.95, x: 2, y: 2 }}
// 페이지 진입
initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
// 카드 회전 variance
rotate: index % 3 === 0 ? -2 : index % 3 === 1 ? 0 : 2
```

---

## 데이터 패턴

### Supabase 1,000행 제한 우회 (필수)
```typescript
const all: Studio[] = [];
let offset = 0;
while (true) {
  const { data } = await supabase
    .from('studios')
    .select('*')
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

### Next.js 패턴
- `useSearchParams` 사용 시 반드시 `<Suspense>` 래핑 (빌드 에러 방지)
- 서버 컴포넌트에서 `generateMetadata` → 클라이언트 컴포넌트 분리
- Kakao SDK 초기화: `layout.tsx` 인라인 `<Script id="kakao-init">` 에서만

### Figma → Next.js 변환
```
import { Link } from 'react-router-dom'  →  import Link from 'next/link'
<Link to="/search">                       →  <Link href="/search">
useNavigate()                             →  useRouter() from 'next/navigation'
navigate('/room/1')                       →  router.push('/room/1')
```

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

### 신규 테이블 필수 컬럼 (한일 동시 설계)
```sql
country TEXT NOT NULL DEFAULT 'KR'   -- 'KR' | 'JP' | 'GLOBAL'
region TEXT
language TEXT NOT NULL DEFAULT 'ko'  -- 'ko' | 'ja' | 'en'
created_at TIMESTAMPTZ DEFAULT now() -- UTC 필수
```

---

## 절대 금지 사항

- ❌ 명예 시스템 타이틀 삭제·회수 기능 (시간 가치 파괴 = 신뢰 파괴)
- ❌ K-POP / 비-밴드 장르 콘텐츠 유도
- ❌ 광고성 팝업·배너
- ❌ 뮬·큐오넷·경쟁 페스티벌 회사 코드/UI 직접 언급
- ❌ 단일 채널 의존 설계
- ❌ 8마디 응답 5단계 중 '패스' 옵션 제거
- ❌ `challenge_score`/`mutual_responses`/`pass_chain` 필드 삭제
- ❌ 일본 진출 관련 기능 (한국 Stage 1 미달성 시)
- ❌ B2B SaaS 대시보드 / 17개 사업자 필드 폼 / M→T 자동화 (Y2 이후)

## 절대 필수 사항

- ✅ 모든 유저 활동에 `user_id + country + created_at(UTC)` 기록
- ✅ 신규 테이블에 `country` / `language` / `created_at` 포함
- ✅ 공유 버튼 UTM 자동 삽입 (`utm_source`/`medium`/`campaign`/`content`)
- ✅ 8마디 관련 기능은 4단계 깔때기 기여도 명시

---

## 알려진 이슈

- **Supabase 1,000행 제한**: `.limit()` 금지, 배치 range 필수
- **useSearchParams**: Suspense 래핑 없으면 빌드 에러
- **Kakao SDK onLoad**: layout.tsx 인라인 Script로만 초기화
- **kakao 타입 충돌**: `types/kakao.d.ts` 통합
- **빌드 캐시 오염**: `rm -rf .next` 후 재빌드
- **Vercel 캐시**: 배포 후 변경 안 보이면 Redeploy (clear cache)
- **경로 변경**: `/studios` → `/search`, `/studios/[id]` → `/room/[id]` (`next.config.js` redirects)

---

## 진행 중 작업

### 1순위: 주간 점수 리셋 Cron
- `app/api/cron/reset-weekly-scores/route.ts`
- 매주 월요일 00:00 KST `reset_weekly_challenge_scores()` 호출
- `Authorization: Bearer {CRON_SECRET}` 검증
- `vercel.json`: `"0 15 * * 0"` (UTC)

### 장기 대기 (B2B 계약 후)
- 실결제 PG 연동 (토스페이먼츠 / 아임포트)
- 연습실 업체 대시보드 (`/partner`)

---

## 참조 문서

상세 정보는 `docs/` 폴더 참조:

- **`docs/STRATEGY.md`** — 4단계 깔때기, UVP, 8마디 OS, 한일 동시 설계, 명예 시스템, 전략 체크리스트
- **`docs/SCREENS.md`** — 9개 메인 스크린 정의, 화면별 기능, 파일 구조
- **`docs/PHASES.md`** — Phase 0~12 완료 로그, 다음 작업
- **`docs/ANALYTICS.md`** — GA4 + Supabase 이벤트 트래킹 표

전략 원본 문서: `/Users/jaejunlee/Desktop/Music-Spot/music spot/`
원본 백업: `CLAUDE_FULL_2026-06-06.md` (슬림화 이전)

---

## 작업 방식

1. 이 파일 먼저 읽어 컨텍스트 파악
2. 필요 시 `docs/` 참조 문서 추가 Read
3. Figma 화면 기준으로 구현
4. 완료 후 `docs/PHASES.md` 진행 로그 업데이트
5. 새 트러블슈팅 → 이 파일 "알려진 이슈"에 추가
