# Music Spot — CLAUDE.md

프로젝트 컨텍스트 파일. **새 세션 시작 시 이 파일부터 반드시 읽을 것.**

---

## 0. 회사 비전 (개발 의사결정 기준)

> 기능 구현 시 "왜 이 기능을 만드는가"의 기준. 마케팅·재무 상세는 `/Users/jaejunlee/Desktop/Music-Spot/music spot/` 폴더 참조.

### Music Spot 4단계 깔때기

| Stage | 이름 | 핵심 기능 | 진입 조건 |
|-------|------|---------|---------|
| Stage 1 | 플레이어 유입 | 8마디 챌린지 + 합주실 예약 | MAU 1,000+, K-factor 1.0+ |
| Stage 2 | 밴드 활성화 | 밴드 매칭 + 합주실 락인 + 일본 진출 | MAU KR 5,000+ (3개월 유지), K-factor 1.2+ (2개월), MS 결성 밴드 30+, 합주실 수익 운영비 50%+ 커버 |
| Stage 3 | 팬 유입 | 마이크로 공연 + 팬덤 기능 | Stage 2 KPI 달성 |
| Stage 4 | 페스티벌 | Music Spot 커뮤니티 기반 자체 페스티벌 | Stage 3 KPI 달성 |

### UVP
"커뮤니티에서 자란 밴드가 페스티벌 무대까지 가는 한국·일본 음악인의 커리어 인프라"

### 최종 비전
아시아 최대 락 페스티벌 — 라인업 70%+가 Music Spot에서 자란 밴드.
> 외부 메시지는 "뮤지션 놀이터" 톤. 페스티벌 비전은 내부 의사결정 기준으로만 사용.

### 개발 의사결정 원칙
- **대관은 수단, 커뮤니티가 목적** — 합주실 예약은 입구, 커뮤니티 데이터 누적이 진짜 목적
- Stage N 진입 조건 미충족 → Stage N+1 기능 개발 금지
- 기능 추가 시 "이게 4단계 깔때기 중 어디에 해당하는가?" 반드시 확인
- **확정 정체성 (2026-05-12)**: Music Spot은 음악인 커뮤니티 회사다. 8마디 챌린지가 OS, 합주실은 마중물, 페스티벌이 목적지. B2B SaaS 대시보드 / 17개 사업자 필드 입력 폼 / M→T 전환 자동화는 Y2 이후 검토 대상이며 현재 단계 우선순위 아님.

---

## 프로젝트 비전

**Music Spot** — 뮤지션을 위한 합주/연습실 올인원 플랫폼

- **목표**: 연습실 검색 → 예약 → 밴드 매칭 → 커뮤니티까지 아우르는 뮤지션 전용 앱
- **디자인 기준**: Figma Make 파일 (`https://www.figma.com/make/o5UzsSFzgL8h1ZGO2I5Q8D/musicspotMVP`) 의 UI/UX를 100% 충실히 구현
- **현재 단계**: v1.0 — Figma 디자인 기반 전면 재구축 진행 중
- **배포**: Vercel (프로덕션), GitHub main 브랜치 연동
- **데이터**: Supabase `studios` 테이블 약 1,165개 연습실 (국내)

> ⚠️ **핵심 원칙**: 모든 UI는 Figma 디자인을 그대로 구현한다. 임의 해석이나 커스텀 스타일 추가 금지.

---

## 기술 스택

| 레이어 | 기술 |
|--------|------|
| 프레임워크 | Next.js 14 (App Router) + TypeScript |
| 스타일 | Tailwind CSS (Figma 디자인 토큰 기반) |
| 애니메이션 | Framer Motion (이미 설치됨 — `framer-motion: ^12`) |
| DB/백엔드 | Supabase (PostgreSQL, RLS 비활성화) |
| 지도 | Kakao Maps API + Kakao REST API (지오코딩) |
| 공유 | Kakao JS SDK (카카오톡 공유) |
| 분석 | Google Analytics 4 |
| 배포 | Vercel |
| 캐릭터 이미지 | `/public/ms_character/` (5개 치비 캐릭터 이미지) |

### 환경변수 (`.env.local`)
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_KAKAO_MAP_KEY      # Kakao Maps JS SDK
NEXT_PUBLIC_KAKAO_JS_KEY       # Kakao JS SDK (공유용)
NEXT_PUBLIC_GA_ID              # GA4 측정 ID
NEXT_PUBLIC_ADMIN_PASSWORD     # 관리자 페이지 비밀번호
```

---

## 한일 동시 설계 원칙 ⚠️ 지금부터 박아둘 것

> "한국 먼저, 일본 나중에" ❌ → 처음부터 한일 동시 설계 ✅
> 지금 무시하면 나중에 DB 마이그레이션 비용 폭증.
> 상세 계획: `/Users/jaejunlee/Desktop/Music-Spot/music spot/05_일본_진출_계획.txt`

### 신규 테이블 필수 컬럼
**모든 신규 Supabase 테이블에 반드시 추가:**
- `country TEXT NOT NULL DEFAULT 'KR'` — `'KR'` | `'JP'` | `'GLOBAL'`
- `region TEXT` — 지역 (서울/도쿄 등)
- `language TEXT NOT NULL DEFAULT 'ko'` — `'ko'` | `'ja'` | `'en'`
- `created_at TIMESTAMPTZ DEFAULT now()` — 반드시 UTC 저장

**기존 테이블 추가 예정 (Phase 12 이후):**
- `user_profiles`, `stem_projects`, `stem_tracks`, `posts`, `post_comments`, `notifications` → `country` 컬럼 추가

### i18n 구조
- **현재**: Pretendard (한국어)
- **Phase 2 추가**: Noto Sans JP (일본어) — 코드 변경 없이 폰트 전환 가능하도록 CSS 변수 구조 준비
- URL 로케일: `/` (KR default), `/ja/` (JP) — 라우팅 준비
- 해시태그: 한국 `#8마디챌린지` / 일본 `#8小節チャレンジ` / 글로벌 `#MusicSpot8Bar`

### 명예 시스템 3트랙
- 한국: 🇰🇷 [YYYY]년 베스트 8마디 챌린저 (KR)
- 일본: 🇯🇵 [YYYY]年ベスト8小節チャレンジャー (JP)
- 글로벌: 🌏 [YYYY] Music Spot Global Legend

> ❌ 타이틀 삭제·회수 기능 절대 만들지 말 것 — 시간 가치 파괴 = 플랫폼 신뢰 파괴

### 법무·결제
- **저작권**: JASRAC 협의 (Stage 1 종료 전) + KOMCA+JASRAC 이중 자문 (Stage 2 전)
- **개인정보**: 한국 PIPA + 일본 APPI 동시 준수 (Stage 2 전)
- **결제**: KRW 현재 사용 → JPY Stage 2 추가 (Stripe 글로벌 계정)

### 일본 진출 절대 원칙
- 한국 Stage 1 진입 조건 미충족 → 일본 공식 투자·기능 개발 금지
- Phase 0~1: 비공식 준비 (현지 시드 파악, 라이브하우스 리서치)
- 일본 시드 운영자: 일본인 또는 일본 거주 한국인 채용 필수

---

## Figma 디자인 시스템 (반드시 준수)

### 색상 토큰
```
Pink:   #FF3D77   (주요 CTA, 강조)
Yellow: #FFD600   (보조 강조, 뱃지)
Blue:   #4FC3F7   (정보, 태그)
Green:  #00D26A   (완료, 긍정)
Cream:  #FFF8F0   (배경 기본)
Black:  #0A0A0A   (텍스트, 테두리, 그림자)
White:  #FFFFFF   (카드, 입력창)
```

**Tailwind 토큰 매핑** (`tailwind.config.ts`에 이미 설정됨):
- `comic-pink`, `comic-yellow`, `comic-blue`, `comic-green`, `comic-cream`, `comic-black`

### 폰트
- **헤드라인**: `font-bungee` (Bungee) — 숫자, 타이틀, 로고
- **본문**: `font-pretendard` (Pretendard Variable) — 기본 텍스트

### 테두리 & 그림자 (핵심 — 반드시 준수)
```
테두리:   border-[3px] border-[#0A0A0A] (또는 border-[4px])
모서리:   rounded-[12px] ~ rounded-[24px]  ← 반드시 둥글게!
그림자:   4px 4px 0 #0A0A0A (blur 없음, offset만)
큰그림자: 6px 6px 0 / 8px 8px 0 / 12px 12px 0
```

> ❌ `rounded-none` 또는 sharp corner 절대 사용 금지
> ✅ 항상 `rounded-[12px]` 이상 적용

### 애니메이션 패턴 (Framer Motion)
```typescript
// 카드 hover
whileHover={{ y: -8, rotate: 2, boxShadow: '10px 10px 0 #0A0A0A' }}

// 버튼 press
whileTap={{ scale: 0.95, x: 2, y: 2 }}

// 페이지 진입
initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}

// 카드 회전 variance (-2° ~ +2°)
rotate: index % 3 === 0 ? -2 : index % 3 === 1 ? 0 : 2
```

### 캐릭터 이미지 (`/public/ms_character/`)
```
trio.jpg        — 3인 치비 록스타 그룹샷 (HeroSection 메인)
diva.jpg        — 우아한 치비 디바 (개인 캐릭터)
rocker.jpg      — 장난꾸러기 치비 록커 (개인 캐릭터)
girl.jpg        — 강인한 치비 걸 (개인 캐릭터)
guitar.jpg      — 핑크 일렉기타 치비 (포인트용)
```

> 실제 파일명은 Leonardo_Anime_XL_... 형태. `/public/ms_character/` 폴더에서 직접 참조.

---

## 8마디 챌린지 = Music Spot OS (개발 우선순위 최상위)

> 8마디 챌린지는 단순 기능이 아니라 플랫폼 전체의 엔진.
> 상세 설계: `/Users/jaejunlee/Desktop/Music-Spot/music spot/03_8마디_챌린지_설계.txt`

### 4단계 전체에서의 역할

| Stage | 8마디 챌린지 역할 |
|-------|----------------|
| Stage 1 | 신규 유저 온보딩 + K-factor 1.2+ 달성 |
| Stage 2 | 밴드 결성 신호 (mutual_responses ≥ 5 → 밴드 추천) + 일본 챌린지 |
| Stage 3 | 공연 라인업 후보 선별 기준 (challenge_score 누적) |
| Stage 4 | 페스티벌 헤드라이너 후보 데이터 (시즌 기록) |

### 핵심 DB 필드 (stem_tracks / stem_projects 확장 시 참조)
```
challenge_score     — 챌린지 누적 점수 (삭제 불가 필드)
mutual_responses    — 상호 응답 횟수 (밴드 매칭 신호)
pass_chain          — 패스 연결 길이 (바이럴 지표)
country             — 'KR' | 'JP' | 'GLOBAL'
season              — 시즌 구분 (명예 시스템 집계 기준)
```

### 응답 5단계 옵션 (항상 유지)
1. 녹음 응답 (가장 높은 참여)
2. 악보/TAB 응답
3. 텍스트 응답
4. 감상평 응답
5. 패스 (부담 최소화 — 제거 금지)

### 핵심 KPI (매주 모니터링)
- **응답률 30%+ 유지** — 2주 연속 미달 시 즉시 UX 재설계
- **K-factor 1.0+ 유지** — 1개월 미달 시 바이럴 기능 재검토
- **D7 잔존 20%+ 유지** — 미달 시 온보딩 동선 강화

### 바이럴 비대칭 설계 원칙
- 8마디 던지기: 부담 낮음 → 뿌리기 쉬움
- 답마디: 5단계 옵션 → 참여 장벽 최소화
- 공개 기본 → SNS 확산 자동화 (UTM 자동 삽입)

### 이번 주 우선 작업 (2026-05-12 확정)

**A. 8마디 챌린지 데이터 필드 확장**
- `stem_projects`/`stem_tracks`에 컬럼 추가: `country` (default 'KR'), `language` (default 'ko'), `genre_tags JSONB`, `mood_tags JSONB`, `pass_count INT`, `share_count INT`, `featured_flag BOOLEAN`, `difficulty_level INT`

**B. 한일 i18n 구조**
- `user_profiles`/`posts`/`studios`/`stem_projects` 테이블에 `country`, `language` 필드 추가
- next-i18next 도입 (한일 2개 언어만)
- Pretendard + Noto Sans JP 동시 로드 가능 구조

**C. 명예 시스템 DB 스키마 (활성화는 Stage 2, 스키마는 지금)**
- `user_titles` (id, user_id, title_key, season_year, season_quarter, country, awarded_at, metadata JSONB)
- `user_challenge_score` (user_id, total_score, weekly_score, genre_scores JSONB, response_rate, updated_at)
- `challenge_pass_chain` (challenge_id, from_user_id, to_user_id, chain_depth, created_at)

**D. 공유 자산 워터마크 시스템**
- 8마디 챌린지 결과물 영상(9:16, 30초) 우상단 "Music Spot" 워터마크
- OG 이미지 생성 시 워터마크 자동 삽입
- KakaoShareButton, 외부 SNS 공유 흐름 전체 점검

---

## 화면 아키텍처 (9개 메인 스크린)

| Figma 경로 | Next.js 경로 | 화면명 | 상태 |
|-----------|-------------|--------|------|
| `/` | `app/page.tsx` | Landing (홈) | ✅ 완료 |
| `/search` | `app/search/page.tsx` | SearchResult | ✅ 완료 |
| `/room/[id]` | `app/room/[id]/page.tsx` | RoomDetail | ✅ 완료 |
| `/booking` | `app/booking/page.tsx` | BookingForm | ❌ 미구현 |
| `/payment` | `app/payment/page.tsx` | Payment | ❌ 미구현 |
| `/complete` | `app/complete/page.tsx` | BookingComplete | ❌ 미구현 |
| `/my-bookings` | `app/my-bookings/page.tsx` | MyBookings | ✅ 완료 |
| `/login` | `app/login/page.tsx` | Login | ✅ 완료 (카카오 OAuth) |
| `/band-matching` | `app/band-matching/page.tsx` | BandMatching | ✅ 완료 |
| `/community` | `app/community/page.tsx` | CommunityFeed | ✅ 완료 |

> 기존 `/studios`, `/studios/[id]` 경로는 `/search`, `/room/[id]`로 리다이렉트 처리

---

## 화면별 기능 정의

### Navigation (공통 컴포넌트)
- "MUSIC SPOT" 로고 → `/`
- 메뉴: 연습실 → `/search` / 밴드찾기 → `/band-matching` / 내 밴드 → `/my-band` / RIFF → `/stems` / 커뮤니티 → `/community` / 마이 → `/my-bookings`
- 우측: 로그인 → `/login` / 시작하기(핑크 버튼) → `/search`
- 스타일: `bg-[#FFF8F0] border-b-[3px]`, 높이 80px, 로고 Bungee 4xl

### Landing (`/`)
- HeroSection: 트리오 캐릭터 이미지 + "연습실부터 무대까지! 🎸 POW!" 헤드라인
- "🔥 연습실 찾기" → `/search` (GPS/텍스트 검색 연결)
- "🎤 밴드 만들기" → `/band-matching`
- 검색창: 입력 → `/search?q=텍스트`
- HOT 합주실 섹션: Supabase `studios` 상위 8개 (data_quality_score 기준)
- 각 카드 하트 → 즐겨찾기 (`lib/favorites.ts`)
- StatsBar: DB count 표시
- Footer: 등록신청 → `/register`, 피드백 → `/feedback`

### SearchResult (`/search`)
- URL params: `?q=텍스트` 또는 `?lat=...&lng=...` (GPS)
- 검색바: 위치/날짜/시간/인원 입력 (날짜·시간은 UI only, 예약 시스템 연동 전까지)
- "재검색 💥" → 기존 Supabase 검색 로직 실행
- 필터 칩: T룸/M룸/드럼가능/가격 → 기존 필터 로직
- 룸 카드: Supabase `studios` 데이터, 회전 variance (-2/0/+2°)
- 하트 → `lib/favorites.ts`
- "예약 💥" → `/booking?roomId={id}`
- 카드 클릭 → `/room/{id}`
- 내 위치 버튼 → GPS 획득 → 거리 정렬 (`lib/sort.ts`)

### RoomDetail (`/room/[id]`)
- 사진 갤러리: 3단 그리드 (60%+40%), `border-b-[4px]`
- 공유 버튼 → Web Share API / 카카오 공유
- 하트 → 즐겨찾기
- 룸 선택 (T룸/M룸): `room_type` 데이터 기반
- 해시태그: `options`, `instruments` 컬럼
- 시간 슬롯: UI only (예약 시스템 없을 시 스텁)
- 인원 +/- 카운터: local state
- "🔥 지금 예약하기" → `/booking?roomId={id}&time=...`
- 네이버/카카오/전화 → 기존 ContactButtons 로직
- "정보가 틀렸어요" → ReportModal

### BookingForm (`/booking`) — UI 중심, 실제 결제 없음
- URL: `?roomId=...&time=...` 파라미터 수신
- 예약 정보 표시 (룸명, 날짜, 시간)
- 밴드명, 대표자 연락처, 인원, 이용목적 입력
- 이용 규칙 동의 체크
- "다음 단계 💥" → `/payment` (sessionStorage로 데이터 전달)

### Payment (`/payment`) — 시뮬레이션
- 결제수단 선택 UI (카드/계좌이체/카카오페이)
- 쿠폰 입력 UI
- 주문 요약 (이전 페이지 데이터)
- "결제하기 💥" → `/complete`

### BookingComplete (`/complete`)
- 완료 애니메이션 + QR코드 이미지 (정적)
- "내 예약 보기" → `/my-bookings`
- "홈으로" → `/`

### MyBookings (`/my-bookings`)
- 프로필 영역 (미로그인 → 로그인 유도)
- 탭: 예약현황 (스텁) / 즐겨찾기 (`lib/favorites.ts` 연결) / 최근 본 (`lib/recentlyViewed.ts`)

### Login (`/login`)
- 카카오/구글/이메일 로그인 버튼 UI
- Phase 1에서는 UI만, Phase 2에서 Supabase Auth 연동

### BandMatching (`/band-matching`)
- 뮤지션 카드 목록 (초기: 더미 데이터)
- 포지션 필터 칩 (보컬/기타/베이스/드럼/건반)
- "연락하기" → 카카오 채널 또는 stub

### CommunityFeed (`/community`)
- 게시물 카드 목록 (초기: 더미 데이터)
- 좋아요 버튼 (localStorage)
- 글쓰기 버튼 (로그인 필요)

---

## 개발 단계별 계획

### Phase 1 — 핵심 UI 골격 *(현재 진행)*
1. `ms_character/` → `public/ms_character/` 이미지 복사
2. `components/Navigation.tsx` 신규 작성 (Figma 기준)
3. `app/page.tsx` 전면 재작성 (Landing)
4. `app/search/page.tsx` 신규 (SearchResult + 기존 검색 로직 연결)
5. `app/studios` → `app/room` 경로 정리 + 리다이렉트

### Phase 2 — 연습실 상세 & 예약 플로우
6. `app/room/[id]/page.tsx` 신규 (RoomDetail)
7. `app/booking/page.tsx` 신규
8. `app/payment/page.tsx` 신규
9. `app/complete/page.tsx` 신규

### Phase 3 — 마이페이지 & 로그인
10. `app/my-bookings/page.tsx` (즐겨찾기·최근 본 연결)
11. `app/login/page.tsx` UI
12. Supabase Auth 연동 (선택)

### Phase 4 — 신규 기능
13. `app/band-matching/page.tsx`
14. `app/community/page.tsx`
15. 실제 예약 시스템 Supabase 연동

---

## 기존 기능 → 신규 화면 연결 매핑

| 기존 코드/기능 | 연결되는 새 화면 |
|--------------|----------------|
| `lib/sort.ts` (GPS 거리 정렬) | SearchResult — 내 위치 검색 |
| Supabase studios 배치 fetch | SearchResult 카드 목록, Landing HOT 섹션 |
| `lib/favorites.ts` | 모든 하트 버튼, MyBookings 즐겨찾기 탭 |
| `lib/recentlyViewed.ts` | MyBookings 최근 본 탭 |
| `lib/region-alias.ts` | SearchResult 텍스트 검색 |
| `components/ReportModal.tsx` | RoomDetail "정보 틀렸어요" |
| `components/KakaoShareButton.tsx` | RoomDetail 공유 버튼 |
| `components/KakaoMap.tsx` | RoomDetail 지도 영역 |
| `lib/analytics.ts` (GA4) | 모든 주요 버튼 이벤트 유지 |
| `app/admin/` | 변경 없음 (별도 진입) |
| `app/register/` | Landing Footer, Navigation |
| `app/feedback/` | Landing Footer |

---

## 주요 파일 구조 (목표 상태)

```
app/
  page.tsx                    # Landing (Figma 기준 재작성)
  search/
    page.tsx                  # SearchResult (신규)
  room/
    [id]/
      page.tsx                # RoomDetail 서버 컴포넌트 (OG meta)
      RoomDetail.tsx          # 클라이언트 컴포넌트
  booking/page.tsx            # BookingForm (신규)
  payment/page.tsx            # Payment (신규)
  complete/page.tsx           # BookingComplete (신규)
  my-bookings/page.tsx        # MyBookings (신규)
  login/page.tsx              # Login (신규)
  band-matching/page.tsx      # BandMatching (신규)
  community/page.tsx          # CommunityFeed (신규)
  admin/                      # 기존 유지
    page.tsx
    [id]/page.tsx
  register/page.tsx           # 기존 유지
  feedback/page.tsx           # 기존 유지
  studios/                    # → /search 리다이렉트 처리
    page.tsx
    [id]/page.tsx             # → /room/[id] 리다이렉트

components/
  Navigation.tsx              # 신규 (Figma 기준)
  HeroSection.tsx             # 신규
  RoomCard.tsx                # 신규 (Figma 기준 — 회전, 둥근 모서리)
  FilterChips.tsx             # 신규
  TimeSlotPicker.tsx          # 신규
  BookingWidget.tsx           # 신규 (RoomDetail 사이드바)
  StudioCard.tsx              # 기존 (단계적 교체)
  StudioFilter.tsx            # 기존 (단계적 교체)
  ContactButtons.tsx          # 기존 유지
  FavoriteButton.tsx          # 기존 유지
  KakaoShareButton.tsx        # 기존 유지
  ReportModal.tsx             # 기존 유지
  PhotoGallery.tsx            # 기존 (RoomDetail에서 재사용)
  KakaoMap.tsx                # 기존 유지

public/
  ms_character/               # 치비 캐릭터 5종
    trio.jpg                  # (원본명 Leonardo_Anime_XL_three...)
    diva.jpg
    rocker.jpg
    girl.jpg
    guitar.jpg

lib/                          # 기존 모두 유지
  supabase.ts
  favorites.ts
  recentlyViewed.ts
  sort.ts
  region-alias.ts
  analytics.ts
```

---

## Supabase 테이블

### 기존 테이블 (유지)
- `studios` — 주 연습실 데이터 (id, name, address, region, lat, lng, room_type, has_drum, price_per_hour, price_info, hours, phone, naver_place_url, kakao_channel, photos[], instruments[], options, capacity, data_quality_score, is_published)
- `page_views` — 방문자 카운터
- `feedbacks` — 사용자 피드백
- `studio_reports` — 정보 제보
- `studio_requests` — 업체 등록 신청

### 추가된 테이블
- `bookings` — 예약 정보 (Phase 5 완료)
- `user_profiles` — 밴드매칭 뮤지션 프로필 (Phase 5 완료)
- `direct_messages` — 밴드매칭 1:1 채팅 (Phase 5 완료)
- `bands`, `band_members`, `band_schedules` — 내 밴드 스케줄러 (Phase 8 완료)
- `studio_reviews` — 연습실 뮤지션 리뷰 (Phase 8 완료, columns: id/studio_id/user_id/user_name/user_emoji/rating/sub_ratings/tags/body/created_at)
- `posts` — 커뮤니티 게시물 (Phase 8 완료, columns: id/author_id/author_name/author_emoji/author_avatar_url/category/title/body/tags/is_published/created_at, RLS disabled)
- `post_likes` — 커뮤니티 좋아요 (Phase 11 완료, PK: post_id+user_id, RLS disabled)
- `post_comments` — 커뮤니티 댓글 (Phase 11 완료, columns: id/post_id/user_id/user_name/user_emoji/user_avatar_url/body/created_at, RLS disabled)
- `notifications` — 실시간 알림 (Phase 10 완료, columns: id/user_id/type/title/body/payload/read/created_at, RLS enabled, Realtime 구독)
- `stem_projects` — 8마디 프로젝트 (Phase 10 완료, columns: id/title/creator_id/bpm/key/created_at)
- `stem_tracks` — 8마디 트랙 (Phase 10 완료, columns: id/project_id/user_id/file_url/order/created_at)
- Storage: `stems` 버킷 — 오디오 파일 (30MB 제한, MP3/WAV/OGG/M4A/FLAC)

---

## 코딩 규칙

### 일반
- 응답은 **한국어**로
- Figma 디자인 화면을 항상 기준으로 삼을 것
- 변경 전 항상 파일 Read 먼저
- MVP — 필요한 것만, 과도한 추상화 금지

### 데이터 패턴
```typescript
// Supabase 1,000행 제한 우회 — 배치 fetch 필수
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

// GPS 검색: 전체 fetch → 프론트 거리 정렬 (lib/sort.ts)
// 텍스트 검색: Supabase .order('data_quality_score', { ascending: false })
```

### 컴포넌트 패턴
- `useSearchParams` 사용 시 반드시 `<Suspense>` 래핑 (빌드 에러 방지)
- 서버 컴포넌트에서 `generateMetadata` → 클라이언트 컴포넌트로 분리
- Kakao SDK 초기화: `layout.tsx` 인라인 `<Script id="kakao-init">` 블록에서만

### Figma → Next.js 변환 규칙
```typescript
// Figma (React Router) → Next.js 변환
import { Link } from 'react-router-dom'  →  import Link from 'next/link'
<Link to="/search">  →  <Link href="/search">
useNavigate()  →  useRouter() from 'next/navigation'
navigate('/room/1')  →  router.push('/room/1')
```

---

## 전략 원칙 (개발 의사결정 시 적용)

> 기술 구현 중 방향이 흔들릴 때 이 원칙으로 판단.
> 전략 문서 전체: `/Users/jaejunlee/Desktop/Music-Spot/music spot/`

### 개발 금지 사항
- ❌ 명예 시스템 타이틀 삭제·회수 기능 (시간 가치 = 플랫폼 자산)
- ❌ K-POP / 비-밴드 장르 콘텐츠 유도 기능 (타겟 페르소나 훼손)
- ❌ 광고성 팝업·배너 (커뮤니티 톤 훼손)
- ❌ 단일 채널 의존 기능 설계 (뮬/큐오넷 직접 CTA 절대 금지)
- ❌ 고인물 권력 구조 강화 기능 (신입 친화 원칙 위배)
- ❌ 일본 진출 관련 기능 (한국 Stage 1 조건 달성 전)

### 개발 필수 사항
- ✅ 모든 유저 활동에 `timestamp + user_id + country` 기록
- ✅ 8마디 챌린지 관련 기능은 항상 4단계 깔때기 기여도 명시
- ✅ challenge_score / mutual_responses / pass_chain 필드 — 어떤 이유로도 삭제 불가
- ✅ 신규 테이블 생성 시 `country`, `language`, `created_at(UTC)` 컬럼 포함
- ✅ 응답 5단계 옵션 유지 — '패스' 옵션 제거 금지

### 경쟁 방어 원칙
- 뮬·큐오넷·페스티벌 회사를 코드/UI에서 절대 직접 언급 금지
- "신입 친화적" 포지셔닝 — 고인물 검열 구조 모방 금지
- 데이터 누적 속도 > 기능 화려함 (해자 구축 우선)
- 카피 가능 기능(UI)보다 카피 불가 자산(데이터/네트워크) 중심 설계

### 채널·마케팅 코드 원칙
- UTM 파라미터: `utm_source` / `utm_medium` / `utm_campaign` / `utm_content` 표준 준수
- 모든 공유 버튼에 UTM 자동 삽입 (현재 KakaoShareButton 참조)
- 인플루언서 UTM: `utm_content={influencer_id}` 형태 준수

### 조기 경보 → 즉시 코드 대응
| 신호 | 기준 | 개발 대응 |
|------|------|---------|
| 응답률 저하 | 30% 미만 2주 | 패스/감상평 옵션 UI 강조 강화 |
| K-factor 저하 | 1.0 미만 1개월 | 공유 버튼 동선 재설계 |
| D7 잔존 저하 | 15% 미만 | 온보딩 첫 챌린지 강제 동선 강화 |

---

## 주의사항 / 트러블슈팅

### 핵심 원칙 위반 주의
- **절대 금지**: square corner (rounded-none), 블러 그림자 (shadow-lg 등), 어두운 다크 배경
- **필수**: 모든 카드/버튼에 `rounded-[12px]` 이상 + offset 그림자

### 브랜드 컬러 독점 규칙 (2026-04-26 확정)
- **`#FFD600` (카카오 옐로)**: 실제 카카오 SDK 연결 4곳에만 허용
  - `LoginClient.tsx` 카카오 OAuth 버튼
  - `PaymentClient.tsx` 카카오페이 옵션
  - `RoomBookingWidget.tsx` 카카오 채널 문의 버튼
  - `RoomContactBar.tsx` 카카오 채널 연락 버튼
- **`#00D26A` (네이버 그린)**: 코드베이스 전체 사용 금지
- **Music Spot 고유 팔레트**:
  - 라임옐로 `#F5FF4F` — 뱃지, 필터칩, 데코, 보조 버튼
  - 그린 `#41C66B` — 완료/긍정 상태, 아이콘
  - 블루 `#4FC3F7` — CTA 보조 버튼 (돌아가기 등)
  - 핑크 `#FF3D77` — 주요 CTA, 강조
  - 네이비 `#242447` — 다크 배경, 강조 텍스트

### 알려진 이슈
- **Supabase 1,000행 제한**: `.limit()` 대신 배치 range 패턴 필수
- **useSearchParams**: 반드시 Suspense 래핑, 없으면 빌드 에러
- **Kakao SDK onLoad**: layout.tsx에서 인라인 Script로 초기화
- **kakao 타입 충돌**: `types/kakao.d.ts`에 통합
- **빌드 캐시 오염**: `rm -rf .next` 후 재빌드
- **Vercel 캐시**: 배포 후 변경 안 보이면 Redeploy (clear cache)

### 경로 변경 주의
- 기존 `/studios` → 새 경로 `/search`로 변경됨
- 기존 `/studios/[id]` → 새 경로 `/room/[id]`로 변경됨
- 기존 경로에서 리다이렉트 처리 필요 (`next.config.js` redirects)

### 전략 정합성 체크리스트

새 기능 추가 시 반드시 확인:

- [ ] 이 기능이 4단계 깔때기 중 어느 Stage에 해당하는가?
- [ ] 현재 Stage 진입 조건이 충족된 상태인가?
- [ ] 8마디 챌린지 OS와 연결 고리가 있는가?
- [ ] 신규 테이블에 `country` / `language` / `created_at(UTC)` 포함했는가?
- [ ] 명예 시스템 타이틀 삭제·회수 로직이 없는가?
- [ ] 뮬·큐오넷·경쟁사 직접 언급 없는가?
- [ ] 공유 기능에 UTM 자동 삽입이 포함됐는가?
- [ ] 모든 유저 활동에 `user_id + country + created_at` 기록되는가?
- [ ] "신입 친화적" 톤을 해치는 요소가 없는가?
- [ ] K-POP·비-밴드 장르 유입 유도 요소가 없는가?

---

## 개발 진행 상황

### ✅ Phase 0 — 기존 기능 (보존)
- [x] GPS + 텍스트 기반 연습실 검색 로직
- [x] Supabase studios 데이터 (1,165개)
- [x] 즐겨찾기 / 최근 본 연습실 (localStorage)
- [x] 정보 제보 (ReportModal)
- [x] 관리자 페이지 (/admin)
- [x] 업체 등록 신청 (/register)
- [x] 피드백 (/feedback)
- [x] GA4 + Supabase 듀얼 트래킹
- [x] Kakao 공유

### ✅ Phase 1 — 핵심 UI 재구축 (완료)
- [x] 캐릭터 이미지 `public/ms_character/` 복사
- [x] Navigation 컴포넌트 (Figma 기준)
- [x] Landing 페이지 전면 재작성
- [x] SearchResult 페이지 (`/search`) + 기존 검색 로직 연결
- [x] 경로 리다이렉트 (`/studios` → `/search`, `/studios/[id]` → `/room/[id]`)

### ✅ Phase 2 — 연습실 상세 (완료)
- [x] RoomDetail 페이지 (`/room/[id]`) — 갤러리·위치·태그·공유·ContactBar
- [x] BookingForm (`/booking`) — Phase 4에서 구현 완료
- [x] Payment (`/payment`) — Phase 4에서 구현 완료
- [x] BookingComplete (`/complete`) — Phase 4에서 구현 완료

### ✅ Phase 3 — 마이페이지 & 로그인 (완료)
- [x] MyBookings (`/my-bookings`) — 프로필·탭·즐겨찾기·최근 본 연결
- [x] 온보딩 모달 (첫 로그인 시 프로필 설정)
- [x] ProfileEditModal — 프로필 수정 (이미지 업로드 버그 2026-04-22 수정 완료)
- [x] `hooks/useAuth.ts` — 전역 auth 상태 훅
- [x] `app/auth/callback/page.tsx` — OAuth 리다이렉트 처리
- [x] `app/login/page.tsx` — 카카오 OAuth + 구글 OAuth + 이메일 매직링크 구현 완료
- [x] Navigation.tsx — 로그인 상태 반영 (아바타 아이콘 + `/my-bookings` 링크)

### ✅ Phase 4 — 신규 기능 & 예약 플로우 (완료)
- [x] BandMatching (`/band-matching`) — 실데이터 연결
- [x] CommunityFeed (`/community`) — auth 연동
- [x] GA4 + Supabase 전체 버튼 이벤트 트래킹 추가 (2026-04-23)
- [x] BookingForm (`/booking`) — Framer Motion, 날짜/시간/인원/목적 입력, sessionStorage 전달
- [x] Payment (`/payment`) — 결제수단 선택, 쿠폰(MUSIC10), 주문 요약, 1.2s 시뮬레이션
- [x] BookingComplete (`/complete`) — 체크 애니메이션, QR 플레이스홀더, 예약 요약 카드

### ✅ Phase 5 — 예약 DB 연동 & 밴드매칭 채팅 (완료)
- [x] `bookings` Supabase 테이블 연동 — PaymentClient insert + MyBookings 탭 read (2026-04-25)
- [x] Analytics: `booking_start`, `payment_select`, `booking_complete` 이벤트 추가 (2026-04-25)
- [x] 밴드매칭 1:1 웹 채팅 — `direct_messages` 테이블 + Realtime (2026-04-25)
- [x] 자기 자신에게 채팅 방지 (isSelf 체크)
- [x] OnboardingModal 닫기 버튼 + 밴드찾기 취소 버튼 추가 (2026-04-25)
- [ ] B2B 계약 후 실결제 오픈 (준비 완료, 대기 중)

### ✅ Phase 6 — 모바일 버그 수정 (완료, 2026-04-26)
- [x] HeroSection CTA 버튼 텍스트 줄바꿈 수정 (fontSize 고정 18px + whiteSpace nowrap)
- [x] SearchBar iOS 날짜 입력 너비 불일치 수정 (appearance-none으로 네이티브 렌더링 해제)

### ✅ Phase 7 — 브랜드 컬러 감사 (완료, 2026-04-26)
- [x] 전체 코드베이스 #FFD600/#00D26A 완전 감사 (33개 파일)
- [x] #FFD600 → #F5FF4F (라임옐로) 교체 — 뱃지, 필터칩, 데코 요소, 버튼 등 비 카카오 사용처
- [x] #FFD600 → #4FC3F7 (블루) 교체 — 주요 CTA 버튼 (돌아가기, 카카오맵 이동 등)
- [x] #00D26A → #41C66B (그린) 교체 — 전 영역 (상태 뱃지, 아이콘, 칩 등)
- [x] 카카오 SDK 연결 4곳은 #FFD600 유지 (LoginClient 카카오 OAuth, PaymentClient 카카오페이, RoomBookingWidget/RoomContactBar 채널 버튼)

### ✅ Phase 8 — 커뮤니티 · 리뷰 · 밴드 스케줄러 (완료, 2026-05-06)
- [x] 커뮤니티 글쓰기 — `posts` Supabase 테이블 생성 + WritePostModal/EditPostModal/PostCard 완성
- [x] 연습실 뮤지션 리뷰 — `studio_reviews` 테이블 + ReviewSection 컴포넌트 (별점/서브평점/뮤지션태그)
- [x] 내 밴드 스케줄러 — `bands`/`band_members`/`band_schedules` 테이블 + `/my-band` 페이지

### ✅ Phase 9 — 뮤지션 활동 피드 (완료, 2026-05-06)
- [x] `app/feed/page.tsx` — 서버 컴포넌트 + OG 메타태그
- [x] `app/feed/_components/FeedClient.tsx` — 팔로우 기반 타임라인 (posts + stem_tracks 통합)
- [x] `user_follows` 테이블 쿼리 → following_ids → 병렬 posts/tracks/profiles fetch
- [x] FeedPost / FeedTrack 유니온 타입 + created_at 내림차순 정렬
- [x] PostCard: 카테고리 뱃지, 제목, 본문, 태그
- [x] TrackCard: 8마디 뱃지, 오디오 플레이어, 프로젝트 정보
- [x] 비로그인 / 팔로우 없음 / 피드 비어있음 빈 상태 처리
- [x] Navigation에 '피드' 메뉴 추가 (`/feed`)

### ✅ Phase 10 — SEO 강화 + 8마디 백엔드 + 알림 시스템 (완료, 2026-05-06)
- [x] SEO: `app/sitemap.ts` Next.js 방식 (studios 동적 라우트 포함)
- [x] SEO: `app/my-band/page.tsx` OG 메타태그 추가
- [x] 8마디 주고받기: `stem_projects`/`stem_tracks` 테이블 + `stems` Storage 버킷 확인 및 설정 (file_size_limit 30MB, mime types)
- [x] 8마디 주고받기: `StemsClient.tsx` 프론트엔드 완성 (CreateProjectModal, ProjectDetailModal, 오디오 플레이어)
- [x] 알림 시스템: `notifications` 테이블 + RLS + Realtime 구독 (`useNotifications` 훅)
- [x] 알림 시스템: `NotificationDropdown.tsx` UI + Navigation Bell 뱃지 연결
- [x] 알림 시스템: `trg_notify_user_follow` 트리거 (`user_follows` INSERT → follow 알림, title/body 포함)
- [x] 알림 시스템: `trg_notify_direct_message` 트리거 (`direct_messages` INSERT → match 알림, 첫 메시지만)

### ✅ Phase 11 — 커뮤니티 인터랙션 + 뮤지션 프로필 페이지 (완료, 2026-05-06)
- [x] `post_likes` 테이블 — PK(post_id, user_id), Supabase 좋아요 저장
- [x] `post_comments` 테이블 — id/post_id/user_id/user_name/user_emoji/user_avatar_url/body/created_at
- [x] DB 트리거 `trg_notify_post_like` — `post_likes` INSERT → 원글 작성자에게 `like` 알림
- [x] DB 트리거 `trg_notify_post_comment` — `post_comments` INSERT → 원글 작성자에게 `comment` 알림
- [x] `CommentSection.tsx` 신규 — 댓글 목록 fetch + 댓글 입력창 (Enter 전송, Shift+Enter 줄바꿈)
- [x] `PostCard.tsx` 전면 재작성 — localStorage 제거, Supabase post_likes 연동, CommentSection 인라인 토글
- [x] `CommunityClient.tsx` 전면 재작성 — likedPostIds Set, myDisplayName/myAvatarUrl, SELECT_FIELDS에 post_likes/post_comments 집계 포함
- [x] `app/u/[id]/page.tsx` — 뮤지션 공개 프로필 서버 컴포넌트 (generateMetadata OG 태그)
- [x] `app/u/[id]/UserProfileClient.tsx` — 팔로우/언팔로우(낙관적 UI), 8마디 트랙 탭, 커뮤니티 게시물 탭, 오디오 플레이어

---

## Analytics 이벤트 트래킹 (GA4 + Supabase)

> `lib/analytics.ts`에서 모든 이벤트를 GA4 + Supabase `user_events` 테이블에 동시 기록

| GA4 Event Name | 트리거 | 파일 |
|---------------|--------|------|
| `page_view` | 모든 페이지 진입 (자동) | `app/layout.tsx` GA4 script |
| `studio_view` | 연습실 상세 페이지 열기 | `app/room/[id]/RoomDetail.tsx` |
| `contact_click` | 전화/네이버/카카오 버튼 클릭 | `components/ContactButtons.tsx` |
| `search` | 검색어 입력 GO 버튼 / 엔터 | `app/search/_components/SearchHeader.tsx` |
| `search` (gps) | 내 위치 버튼 클릭 | `app/search/_components/SearchHeader.tsx` |
| `filter_apply` | 필터 칩 토글 (T룸/M룸/드럼 등) | `components/FilterChips.tsx` |
| `view_toggle` | 목록↔지도 뷰 전환 | `app/search/_components/ViewToggle.tsx` |
| `load_more` | 더 보기 버튼 클릭 | `app/search/_components/RoomList.tsx` |
| `favorite_toggle` | 하트 즐겨찾기 추가/해제 | `components/RoomCard.tsx` |
| `map_marker_click` | 지도 마커 클릭 | `app/search/_components/SearchClient.tsx` |
| `hot_room_click` | 랜딩 HOT 연습실 카드 클릭 | `components/HotRooms.tsx` |
| `coming_soon_click` | 미구현 기능 버튼 클릭 | 각 stub 버튼 |
| `band_contact` | 밴드매칭 연락하기 클릭 | `app/band-matching/` |
| `booking_start` | `/booking` 페이지 로드 시 (연습실 확정) | `app/booking/_components/BookingClient.tsx` |
| `payment_select` | 결제 수단 선택 클릭 | `app/payment/_components/PaymentClient.tsx` |
| `booking_complete` | 결제하기 버튼 → Supabase insert 완료 | `app/payment/_components/PaymentClient.tsx` |

---

## 다음 세션 즉시 시작할 작업

> **최종 업데이트: 2026-05-06 (Phase 11 완료 — 커뮤니티 인터랙션 + 뮤지션 프로필)**

### 1순위: 커뮤니티 PostCard → 프로필 링크 연결

현재 PostCard에서 작성자 이름/아바타 클릭 시 `/u/[author_id]`로 이동하지 않음.
- `PostCard.tsx`: 작성자 영역을 `<Link href={/u/${post.author_id}}>` 로 감싸기
- `post.author_id`가 없는 더미 데이터 게시물은 링크 비활성화 (조건부)
- `FeedClient.tsx` PostCard 아이템도 동일하게 적용

---

### 2순위: 뮤지션 프로필 → 팔로우 알림 버그 확인

`UserProfileClient.tsx`에서 팔로우 시 `notifications` 트리거가 정상 발화하는지 확인.
- `user_follows` INSERT → `trg_notify_user_follow` → 팔로우 대상 알림 수신 여부 테스트
- 알림 미수신 시 트리거 SECURITY DEFINER 권한 확인

---

### 3순위: 검색 페이지 연습실 카드 → 리뷰 카운트 표시

`studio_reviews` 테이블에 데이터가 쌓이고 있으므로:
- RoomCard에 별점 평균 + 리뷰 수 배지 추가 (`⭐ 4.5 (12)` 형태)
- `/room/[id]` RoomDetail에 리뷰 섹션 스크롤 앵커 추가

---

### 전략 차원 우선순위 (위 개발 작업 완료 후 순서대로)

**A. 8마디 챌린지 KPI 대시보드 (내부용)**
- `/admin` 또는 별도 내부 페이지에 핵심 지표 표시
- 응답률, K-factor, D7 잔존, challenge_score 분포
- 이 지표가 없으면 전략 의사결정 불가

**B. 명예 시스템 시즌 1 설계 (DB + UI)**
- `season` 컬럼 + 시즌별 집계 뷰 생성
- 한국 트랙 타이틀 자동 부여 로직
- 타이틀 공개 프로필 표시 (`/u/[id]` 연동)

**C. 합주실 → 챌린지 온보딩 연결 강화**
- 합주실 예약 완료 후 → 8마디 챌린지 CTA 노출
- `bookings` INSERT 후 → 챌린지 유도 알림 (notifications 트리거)

**D. 밴드 자동 추천 로직 (Stage 2 준비)**
- `mutual_responses ≥ 5` → 밴드 매칭 추천 트리거
- `BandMatching` 페이지에 "함께 자주 호흡 맞춘 뮤지션" 섹션 추가

---

### 장기 대기 (B2B 계약 후)
- 실결제 PG 연동 (토스페이먼츠 / 아임포트) — Payment 시뮬레이션 교체
- 연습실 업체 대시보드 (`/partner`)

---

## Git 버전 태그

- `v0.5.0` — 업체 등록 신청 기능 추가 (Figma 재구축 이전 마지막 안정 버전)
- `v1.0.0` — Figma 디자인 기반 전면 재구축 완료 (목표)

---

## 작업 방식

1. 이 파일을 먼저 읽어 현재 단계 파악
2. Figma 화면 정의를 기준으로 구현
3. 작업 완료 후 **개발 진행 상황** 체크박스 업데이트
4. 새 파일/패턴 추가 시 **주요 파일 구조** 갱신
5. 트러블슈팅 시 **주의사항** 섹션에 추가
