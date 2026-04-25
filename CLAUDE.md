# Music Spot — CLAUDE.md

프로젝트 컨텍스트 파일. **새 세션 시작 시 이 파일부터 반드시 읽을 것.**

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
- 메뉴: 연습실 → `/search` / 밴드찾기 → `/band-matching` / 커뮤니티 → `/community` / 마이 → `/my-bookings`
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

### 향후 추가 예정
- `bookings` — 예약 정보 (Phase 4)
- `musicians` — 밴드매칭 뮤지션 프로필 (Phase 4)
- `posts` — 커뮤니티 게시물 (Phase 4)

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

## 주의사항 / 트러블슈팅

### 핵심 원칙 위반 주의
- **절대 금지**: square corner (rounded-none), 블러 그림자 (shadow-lg 등), 어두운 다크 배경
- **필수**: 모든 카드/버튼에 `rounded-[12px]` 이상 + offset 그림자

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

> **최종 업데이트: 2026-04-26**

### ✅ 바로 시작 — 1순위: 커뮤니티 글쓰기 기능

**현재 상태**: `app/community/page.tsx` 읽기 전용 (더미 데이터 + localStorage 좋아요)

**할 일**:
1. Supabase에서 아래 SQL 실행 (posts 테이블 생성)
2. `app/community/page.tsx`에서 더미 데이터 → Supabase `posts` 테이블 read로 교체
3. "글쓰기" 버튼 클릭 → WritePostModal 컴포넌트 (로그인 필요)
4. 글 작성 완료 → Supabase insert → 목록 자동 갱신

```sql
create table if not exists public.posts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  author text not null,
  author_avatar_url text,
  category text not null check (category in ('후기','구인','자유','질문')),
  title text not null,
  body text not null,
  tags text[] default '{}',
  likes integer default 0,
  created_at timestamptz default now() not null
);
alter table public.posts enable row level security;
create policy "Anyone can read posts" on public.posts for select using (true);
create policy "Users can insert own posts" on public.posts for insert with check (auth.uid() = user_id);
create policy "Users can delete own posts" on public.posts for delete using (auth.uid() = user_id);
```

---

### 2순위: 모바일 UI 전체 점검

2026-04-26에 iOS 버그 2건 수정 완료 (HeroSection 버튼 텍스트 줄바꿈, SearchBar 날짜 너비). 나머지 페이지들도 iPhone Safari에서 확인 필요:
- `app/search/page.tsx` — 필터 칩, 카드 레이아웃
- `app/room/[id]` — 갤러리, ContactBar 버튼
- `app/band-matching/page.tsx` — 뮤지션 카드
- `app/booking/page.tsx`, `app/payment/page.tsx` — 폼 입력 요소

---

### 3순위: SEO 강화

현재 `app/room/[id]/page.tsx`만 `generateMetadata` 있음. 나머지 추가:
- `app/page.tsx` — Landing OG 태그
- `app/search/page.tsx` — Search OG 태그
- `public/sitemap.xml` 생성 또는 `app/sitemap.ts` Next.js 방식 추가

---

### 장기 대기 (B2B 계약 후)
- 실결제 PG 연동 (토스페이먼츠 / 아임포트) — Payment 시뮬레이션 교체
- 연습실 업체 대시보드 (`/partner`)
- bookings 테이블 SQL (아직 Supabase에 안 만들었다면 아래 실행):

```sql
create table if not exists public.bookings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  studio_id text not null, studio_name text not null, studio_address text,
  room_type text, date text not null, time text not null,
  duration integer not null default 2, persons integer not null default 2,
  band_name text, contact text, purpose text,
  total_price integer, price_info text, payment_method text,
  status text not null default 'confirmed',
  created_at timestamptz default now() not null
);
alter table public.bookings enable row level security;
create policy "Users can read own bookings" on public.bookings for select using (auth.uid() = user_id);
create policy "Users can insert own bookings" on public.bookings for insert with check (auth.uid() = user_id);
```

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
