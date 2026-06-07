# Analytics 이벤트 트래킹

`lib/analytics.ts`에서 모든 이벤트를 GA4 + Supabase `user_events` 테이블에 동시 기록.

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

---

## UTM 표준
- `utm_source` / `utm_medium` / `utm_campaign` / `utm_content`
- 인플루언서: `utm_content={influencer_id}`
- 모든 공유 버튼 자동 삽입 (`KakaoShareButton` 참조)
