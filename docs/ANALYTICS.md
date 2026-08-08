# Analytics 이벤트 트래킹

`lib/analytics.ts`에서 모든 이벤트를 **GA4 + Amplitude + Supabase `user_events`** 세 곳에 동시 기록.
(`trackClient()` = GA4 + Amplitude, `logEvent()` = Supabase)

| GA4 Event | 트리거 | 파일 |
|-----------|--------|------|
| `page_view` | 모든 페이지 진입 (자동) | `app/layout.tsx` GA4 script |
| `studio_view` | 연습실 상세 진입 | `app/room/[id]/RoomDetail.tsx` |
| `contact_click` | 전화/네이버/카카오 클릭 | `components/ContactButtons.tsx` |
| `search` | 검색어 GO/엔터 | `app/search/_components/SearchHeader.tsx` |
| `search` (gps) | 내 위치 버튼 | `app/search/_components/SearchHeader.tsx` |
| `filter_apply` | 필터 칩 토글 | `components/FilterChips.tsx` |
| `view_toggle` | 목록↔지도 전환 | `app/search/_components/ViewToggle.tsx` |
| `load_more` | 더 보기 클릭 | `app/search/_components/RoomList.tsx` |
| `favorite_toggle` | 하트 추가/해제 | `components/RoomCard.tsx` |
| `map_marker_click` | 지도 마커 | `app/search/_components/SearchClient.tsx` |
| `hot_room_click` | 랜딩 HOT 카드 | `components/HotRooms.tsx` |
| `coming_soon_click` | 미구현 stub | 각 stub 버튼 |
| `band_contact` | 밴드매칭 연락하기 | `app/band-matching/` |
| `booking_start` | `/booking` 로드 (연습실 확정) | `app/booking/_components/BookingClient.tsx` |
| `payment_select` | 결제 수단 선택 | `app/payment/_components/PaymentClient.tsx` |
| `booking_complete` | 결제 → Supabase insert 완료 | `app/payment/_components/PaymentClient.tsx` |
| `share_challenge` | 8마디 프로젝트 공유 (모든 경로 공통) | `app/stems/_components/ProjectDetailModal.tsx` |
| `share_challenge_x` | 일본 모드 X(트위터) 인텐트 | `app/stems/_components/ProjectDetailModal.tsx` |
| `share_challenge_line` | 일본 모드 LINE 공유 | `app/stems/_components/ProjectDetailModal.tsx` |

---

## Amplitude (Analytics + Session Replay)

`@amplitude/unified` 단일 패키지. 초기화는 `components/AmplitudeProvider.tsx`(루트 레이아웃에 1회 마운트),
설정 상수는 `lib/amplitude.ts`에 모아둠.

| 항목 | 값 |
|------|-----|
| 환경변수 | `NEXT_PUBLIC_AMPLITUDE_API_KEY` (클라이언트 write key — 브라우저 노출 정상) |
| autocapture | `true` — 페이지뷰·클릭·폼 자동 수집 |
| Session Replay | `sampleRate: 1` (**100% 녹화**) |
| user_id | Supabase 세션의 `user.id`. `onAuthStateChange`로 갱신, 로그아웃 시 `amplitude.reset()` |
| user property | `language`(`getClientLocale()`) / `country`(`getClientCountry()`, IP 쿠키 `ms_country`) |

### 주의사항

- **키 미설정 시 전체 비활성.** `AMPLITUDE_ENABLED`가 false면 `track()`을 아예 호출하지 않는다.
  init 없이 `track()`을 부르면 이벤트가 SDK 내부 `dispatchQ`에 무한 적립되기 때문
  (`@amplitude/analytics-core/lib/cjs/core-client.js`). GA4·`user_events`는 영향 없이 계속 동작.
- **init 순서는 걱정 안 해도 된다.** `initAll()`은 async지만 그 전에 호출된 `track()`은
  `dispatchQ`가 버퍼링해 init 후 flush한다. 별도 가드 불필요.
- **Session Replay 프라이버시.** `<input>` 값은 기본 마스킹 레벨(medium)이 가리지만
  **div로 렌더되는 텍스트는 가려지지 않는다.** 개인정보가 화면에 뜨는 영역에는
  `lib/amplitude.ts`의 `SR_MASK_CLASS`를 붙일 것 (`privacyConfig.maskSelector`에 등록돼 있음).
  현재 적용: 1:1 DM 말풍선 (`app/band-matching/_components/ChatModal.tsx`).
  ⚠️ 개인정보가 노출되는 화면을 새로 만들 때마다 이 클래스 적용을 검토해야 한다.
- **sampleRate 1은 초기 단계 의도.** 트래픽이 늘면 비용·용량 때문에 낮춰야 한다.

---

## UTM 표준
- `utm_source` / `utm_medium` / `utm_campaign` / `utm_content`
- 인플루언서: `utm_content={influencer_id}`
- 모든 공유 버튼 자동 삽입 (`KakaoShareButton` 참조)
