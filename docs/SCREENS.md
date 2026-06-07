# 화면 아키텍처 & 기능 정의

## 9개 메인 스크린

| Figma 경로 | Next.js 경로 | 화면명 | 상태 |
|-----------|-------------|--------|------|
| `/` | `app/page.tsx` | Landing | ✅ |
| `/search` | `app/search/page.tsx` | SearchResult | ✅ |
| `/room/[id]` | `app/room/[id]/page.tsx` | RoomDetail | ✅ |
| `/booking` | `app/booking/page.tsx` | BookingForm | ✅ |
| `/payment` | `app/payment/page.tsx` | Payment | ✅ |
| `/complete` | `app/complete/page.tsx` | BookingComplete | ✅ |
| `/my-bookings` | `app/my-bookings/page.tsx` | MyBookings | ✅ |
| `/login` | `app/login/page.tsx` | Login | ✅ |
| `/band-matching` | `app/band-matching/page.tsx` | BandMatching | ✅ |
| `/community` | `app/community/page.tsx` | CommunityFeed | ✅ |

> 기존 `/studios`, `/studios/[id]` 경로는 `/search`, `/room/[id]`로 리다이렉트

---

## 화면별 기능 정의

### Navigation (공통)
- "MUSIC SPOT" 로고 → `/`
- 메뉴: 연습실 `/search` / 밴드찾기 `/band-matching` / 내 밴드 `/my-band` / RIFF `/stems` / 커뮤니티 `/community` / 마이 `/my-bookings`
- 우측: 로그인 `/login` / 시작하기 핑크 버튼 `/search`
- 스타일: `bg-[#FFF8F0] border-b-[3px]`, 높이 80px, 로고 Bungee 4xl

### Landing (`/`)
- HeroSection: 트리오 캐릭터 + "연습실부터 무대까지! 🎸 POW!"
- "🔥 연습실 찾기" → `/search`
- "🎤 밴드 만들기" → `/band-matching`
- 검색창: 입력 → `/search?q=텍스트`
- HOT 합주실: Supabase `studios` 상위 8개 (data_quality_score 기준)
- 카드 하트 → 즐겨찾기 (`lib/favorites.ts`)
- StatsBar, Footer (등록신청 `/register`, 피드백 `/feedback`)

### SearchResult (`/search`)
- URL params: `?q=텍스트` 또는 `?lat=...&lng=...` (GPS)
- 검색바: 위치/날짜/시간/인원
- 필터 칩: T룸/M룸/드럼가능/가격
- 룸 카드: Supabase `studios`, 회전 variance (-2/0/+2°)
- "예약 💥" → `/booking?roomId={id}`
- 카드 클릭 → `/room/{id}`
- 내 위치 버튼 → GPS → 거리 정렬 (`lib/sort.ts`)

### RoomDetail (`/room/[id]`)
- 사진 갤러리: 3단 그리드 (60%+40%), `border-b-[4px]`
- 공유 버튼 → Web Share API / 카카오 공유
- 하트 → 즐겨찾기
- 룸 선택 (T룸/M룸): `room_type` 기반
- 해시태그: `options`, `instruments`
- 시간 슬롯: UI only
- "🔥 지금 예약하기" → `/booking?roomId={id}&time=...`
- 네이버/카카오/전화 → ContactButtons
- "정보가 틀렸어요" → ReportModal

### BookingForm (`/booking`) — UI 중심, 실결제 없음
- URL: `?roomId=...&time=...`
- 예약 정보 표시
- 밴드명, 대표자 연락처, 인원, 이용목적 입력
- 이용 규칙 동의
- "다음 단계 💥" → `/payment` (sessionStorage 전달)

### Payment (`/payment`) — 시뮬레이션
- 결제수단: 카드/계좌이체/카카오페이
- 쿠폰 입력 (MUSIC10)
- 주문 요약
- "결제하기 💥" → 1.2s 시뮬레이션 → `/complete`

### BookingComplete (`/complete`)
- 완료 애니메이션 + QR 이미지 (정적)
- "내 예약 보기" → `/my-bookings`
- "홈으로" → `/`

### MyBookings (`/my-bookings`)
- 프로필 영역 (미로그인 → 로그인 유도)
- 탭: 예약현황 (스텁) / 즐겨찾기 / 최근 본

### Login (`/login`)
- 카카오/구글/이메일 매직링크 (Phase 3에서 완료)

### BandMatching (`/band-matching`)
- 뮤지션 카드 + 포지션 필터 (보컬/기타/베이스/드럼/건반)
- "함께 자주 호흡 맞춘 뮤지션" — `user_mutual_responses` 기반

### CommunityFeed (`/community`)
- 게시물 카드 (Supabase `posts`)
- 좋아요 (`post_likes`) + 댓글 (`post_comments`)
- 글쓰기 (로그인 필요)

---

## 기존 기능 → 화면 매핑

| 기존 코드 | 연결되는 화면 |
|----------|--------------|
| `lib/sort.ts` (GPS 거리 정렬) | SearchResult — 내 위치 검색 |
| Supabase studios 배치 fetch | SearchResult, Landing HOT |
| `lib/favorites.ts` | 모든 하트, MyBookings 즐겨찾기 |
| `lib/recentlyViewed.ts` | MyBookings 최근 본 |
| `lib/region-alias.ts` | SearchResult 텍스트 검색 |
| `components/ReportModal.tsx` | RoomDetail 정보 제보 |
| `components/KakaoShareButton.tsx` | RoomDetail 공유 |
| `components/KakaoMap.tsx` | RoomDetail 지도 |
| `lib/analytics.ts` (GA4) | 모든 주요 버튼 |

---

## 파일 구조 (목표)

```
app/
  page.tsx                    # Landing
  search/page.tsx             # SearchResult
  room/[id]/
    page.tsx                  # 서버 컴포넌트 (OG meta)
    RoomDetail.tsx            # 클라이언트
  booking/page.tsx
  payment/page.tsx
  complete/page.tsx
  my-bookings/page.tsx
  login/page.tsx
  band-matching/page.tsx
  community/page.tsx
  feed/page.tsx               # 팔로우 타임라인
  stems/page.tsx              # 8마디 챌린지
  my-band/page.tsx            # 밴드 스케줄러
  u/[id]/page.tsx             # 뮤지션 공개 프로필
  admin/                      # 관리자
  register/page.tsx
  feedback/page.tsx

components/
  Navigation.tsx
  HeroSection.tsx
  RoomCard.tsx
  FilterChips.tsx
  TimeSlotPicker.tsx
  BookingWidget.tsx
  ContactButtons.tsx
  FavoriteButton.tsx
  KakaoShareButton.tsx
  ReportModal.tsx
  PhotoGallery.tsx
  KakaoMap.tsx
  NotificationDropdown.tsx
  PostCard.tsx
  CommentSection.tsx
  ReviewSection.tsx

public/ms_character/          # 치비 캐릭터 5종

lib/
  supabase.ts
  favorites.ts
  recentlyViewed.ts
  sort.ts
  region-alias.ts
  analytics.ts
```
