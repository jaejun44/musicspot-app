# Music Spot — CLAUDE.md

프로젝트 컨텍스트 파일. 새 세션 시작 시 이 파일부터 읽을 것.

---

## 프로젝트 개요

**Music Spot** — 뮤지션을 위한 합주/연습실 검색 플랫폼 (MVP)

- **핵심 기능**: GPS 위치 기반 + 텍스트 검색으로 근처 연습실 찾기 → 상세 정보 보기 → 연락
- **타겟 사용자**: 밴드, 드러머, 보컬리스트 등 연습실이 필요한 뮤지션
- **데이터**: Supabase `studios` 테이블에 약 1,165개 연습실 데이터 (국내)
- **배포**: Vercel (프로덕션), GitHub main 브랜치 연동
- **현재 상태**: MVP 완성, 프로덕션 운영 중

---

## 기술 스택

| 레이어 | 기술 |
|--------|------|
| 프레임워크 | Next.js 14 (App Router) + TypeScript |
| 스타일 | Tailwind CSS (커스텀 토큰: brand-bg, brand-card, brand-red, brand-border, brand-muted) |
| DB/백엔드 | Supabase (PostgreSQL, RLS 비활성화) |
| 지도 | Kakao Maps API (지도 표시) + Kakao REST API (지오코딩) |
| 공유 | Kakao JS SDK (카카오톡 공유) |
| 분석 | Google Analytics 4 (trackEvent, trackSearch, trackStudioView, trackContactClick) |
| 배포 | Vercel |
| 데이터 수집 | Python 스크립트 (scripts/) — Playwright 크롤링, Google Places API, Naver API |

### 주요 환경변수 (`.env.local`)
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_KAKAO_MAP_KEY      # Kakao Maps JS SDK 키
NEXT_PUBLIC_KAKAO_JS_KEY       # Kakao JS SDK 키 (공유용)
NEXT_PUBLIC_GA_ID              # GA4 측정 ID
NEXT_PUBLIC_ADMIN_PASSWORD     # 관리자 페이지 비밀번호
```

---

## 현재 진행 상황

### ✅ 완료된 기능
- [x] GPS 위치 기반 연습실 검색 (반경 3km 기본)
- [x] 텍스트 검색 (지역명, 상호명) + 지역 별칭 매핑 (lib/region-alias.ts)
- [x] 연습실 목록 페이지 (그리드, 페이지네이션, 필터)
- [x] 연습실 상세 페이지 (사진, 지도, 가격, 옵션, 연락처 버튼)
- [x] 스튜디오 필터 (룸타입 T/M, 드럼 가능, 최대 가격)
- [x] 즐겨찾기 (localStorage, 홈 섹션 표시)
- [x] 최근 본 연습실 (localStorage, 최대 10개)
- [x] 퀵 프리셋 (홍대합주룸, 드럼가능, 내근처 등)
- [x] 카카오톡 공유 버튼 (Web Share API 폴백)
- [x] 정보 제보 (ReportModal → studio_reports 테이블)
- [x] 방문자 카운터 (page_views 테이블)
- [x] 피드백 페이지 (/feedback → feedbacks 테이블)
- [x] 관리자 페이지 (/admin — 비밀번호 보호, 연습실/피드백/제보 관리)
- [x] OG 메타데이터 (스튜디오 상세 페이지 카카오/SNS 미리보기)
- [x] data_quality_score 기반 정렬 (완성도 높은 데이터 우선 노출)
- [x] Supabase 1,000행 제한 우회 (배치 range 쿼리)
- [x] 히어로 배경 이미지 레이아웃 (배경과 콘텐츠 영역 분리)
- [x] GA4 이벤트 트래킹
- [x] 업체 등록 신청 (/register → studio_requests 테이블 → 관리자 승인)
- [x] 관리자 "등록신청" 탭 (승인/거절, 노란 뱃지로 대기 건수 표시)

### 🔲 미완료 / 향후 고려
- [ ] 사용자 리뷰/평점 시스템
- [ ] 로그인/즐겨찾기 서버 동기화
- [ ] 지도 뷰 (목록 대신 지도에서 핀 표시)
- [ ] 모바일 앱 (React Native)
- [ ] 연습실 직접 예약 연동

---

## 코딩 규칙

### 일반
- 응답은 한국어로
- 코드 우선, 설명은 필요할 때만
- MVP 단계 — 과도한 추상화 금지
- 변경 전 항상 파일 Read 먼저

### 데이터 패턴
- **GPS 검색**: 전체 DB 배치 fetch → 프론트에서 거리 버킷 + data_quality_score 정렬 (`lib/sort.ts`)
- **텍스트 검색**: Supabase `.order('data_quality_score', { ascending: false })` 서버 정렬
- **1,000행 제한 우회**: while 루프 + `.range(offset, offset + BATCH - 1)` 패턴 사용

```typescript
// 올바른 배치 fetch 패턴
const all: Studio[] = [];
let offset = 0;
while (true) {
  const { data } = await supabase.from('studios').select('*').range(offset, offset + 999);
  if (!data || data.length === 0) break;
  all.push(...data);
  if (data.length < 1000) break;
  offset += 1000;
}
```

### 컴포넌트 구조
- 서버 컴포넌트에서 generateMetadata → 클라이언트 컴포넌트(`StudioDetail.tsx`)로 분리
- `useSearchParams` 사용 시 반드시 `<Suspense>` 래핑
- Kakao SDK 초기화: `layout.tsx`의 인라인 `<Script id="kakao-init">` 블록에서 처리

### 스타일
- Tailwind 커스텀 토큰: `brand-bg`, `brand-card`, `brand-red`, `brand-border`, `brand-muted`
- 다크 테마 기본
- 모바일 퍼스트, max-w-md 중심 레이아웃

---

## 주요 파일 구조

```
app/
  page.tsx                    # 홈 (GPS/텍스트 검색, 즐겨찾기, 최근 본 연습실)
  studios/
    page.tsx                  # 목록 페이지 (필터, 페이지네이션)
    [id]/
      page.tsx                # OG 메타데이터 서버 컴포넌트
      StudioDetail.tsx        # 상세 클라이언트 컴포넌트
  admin/
    page.tsx                  # 관리자 (연습실/피드백/제보/등록신청)
    [id]/page.tsx             # 연습실 수정
  register/page.tsx           # 업체 등록 신청 폼 (비로그인)
  feedback/page.tsx           # 피드백 폼

components/
  StudioCard.tsx              # 목록 카드
  StudioFilter.tsx            # 필터 UI
  ContactButtons.tsx          # 하단 고정 CTA (네이버플레이스/카카오/전화)
  QuickPresets.tsx            # 빠른 검색 프리셋
  FavoriteButton.tsx          # 하트 토글
  FavoriteSection.tsx         # 홈 즐겨찾기 섹션
  RecentlyViewedSection.tsx   # 홈 최근 본 섹션
  KakaoShareButton.tsx        # 카카오톡 공유
  ReportModal.tsx             # 정보 제보 모달
  PhotoGallery.tsx            # 사진 갤러리 (스와이프)
  KakaoMap.tsx                # 지도 컴포넌트

lib/
  supabase.ts                 # Supabase 클라이언트
  favorites.ts                # 즐겨찾기 (localStorage)
  recentlyViewed.ts           # 최근 본 (localStorage, 최대 10개)
  sort.ts                     # sortByDistanceAndQuality
  region-alias.ts             # 지역 별칭 26개 매핑
  analytics.ts                # GA4 이벤트 헬퍼

types/
  studio.ts                   # Studio 인터페이스
  report.ts                   # StudioReport 인터페이스
  kakao.d.ts                  # Kakao SDK 타입 선언

scripts/                      # Python 데이터 수집/관리 스크립트
  import_studios.py
  update_quality_score.py
  enrich_from_spacecloud.py
  update_google_images.py
  crawl_naver_images.py
  (기타 enrichment 스크립트)
```

---

## Supabase 테이블

### studios (주 테이블)
주요 컬럼: `id`, `name`, `address`, `region`, `lat`, `lng`, `room_type` (T/M/both), `has_drum`, `price_per_hour`, `price_info`, `hours`, `phone`, `naver_place_url`, `kakao_channel`, `photos` (text[]), `instruments` (text[]), `options`, `capacity`, `soundproof_grade`, `amp_info`, `rating`, `data_quality_score`, `is_published`

### 기타 테이블
- `page_views` — 방문자 카운터
- `feedbacks` — 사용자 피드백
- `studio_reports` — 정보 제보 (report_type: correction/new_studio/closed, status: pending/resolved)
- `studio_requests` — 업체 등록 신청 (status: pending/approved/rejected, data_quality_score: 30 on approve)

---

## 주의사항

### 알려진 이슈 / 과거 트러블
- **Supabase 1,000행 제한**: `.limit()` 대신 배치 range 패턴 필수
- **useSearchParams**: 반드시 Suspense 래핑, 없으면 빌드 에러
- **Kakao SDK onLoad**: layout.tsx에서 인라인 Script로 초기화 (서버 컴포넌트에서 onLoad 불가)
- **Window 타입 충돌**: kakao map 타입과 Kakao SDK 타입을 `types/kakao.d.ts`에 통합
- **빌드 캐시 오염**: 이상한 모듈 에러 시 `rm -rf .next` 후 재빌드
- **Vercel 캐시**: 배포 후 변경 안 보이면 Vercel 대시보드에서 Redeploy (clear cache)

### Git 태그 (안정 버전)
- `v0.2.0-stable` — 기본 검색 + 상세 페이지
- `v0.3.0-stable` — 즐겨찾기, 최근 본, 퀵프리셋
- `v0.4.0-stable` — 관리자 페이지, 제보, 방문자 카운터

---

## 작업 방식

1. 이 파일을 먼저 읽어 현재 상태 파악
2. 작업 후 이 파일의 **현재 진행 상황** 체크박스 업데이트
3. 새로운 주요 파일/패턴 추가 시 **주요 파일 구조** 섹션 갱신
4. 트러블슈팅 해결 시 **주의사항** 섹션에 추가
