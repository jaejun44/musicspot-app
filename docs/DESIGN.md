# DESIGN — 디자인 토큰 (절대 준수)

> UI/디자인 작업 시 이 문서를 Read. Figma 디자인 충실히 구현, 임의 해석·커스텀 스타일 금지.
> Figma: `https://www.figma.com/make/o5UzsSFzgL8h1ZGO2I5Q8D/musicspotMVP`

## 색상

```
Pink:       #FF3D77   주요 CTA, 강조
LimeYellow: #F5FF4F   뱃지, 필터칩, 데코 (Music Spot 고유, 카카오 #FFD600 대체)
Blue:       #4FC3F7   CTA 보조, 정보 태그
Green:      #41C66B   완료, 긍정 (일반 그린은 항상 이것. 브랜드 그린을 끌어다 쓰지 말 것)
Cream:      #FFF8F0   배경 기본
Navy:       #242447   다크 배경, 강조 텍스트
Black:      #0A0A0A   텍스트, 테두리, 그림자
White:      #FFFFFF   카드, 입력창
```

### 브랜드 컬러 원칙

**그 브랜드의 버튼에는 그 브랜드의 공식 색을 쓴다. 대신 그 색을 다른 곳에 남발하지 않는다.**
브랜드 색이 장식·일반 UI로 번지면 Music Spot 고유 팔레트와 혼재된다. 그린이 필요하면 언제나 `#41C66B`.

| 브랜드 색 | 허용 지점 |
|-----------|-----------|
| `#FFD600` 카카오 | `LoginClient.tsx` OAuth · `PaymentClient.tsx` 카카오페이 · `RoomBookingWidget.tsx` 채널 · `RoomContactBar.tsx` 채널 |
| `#06C755` LINE | `ProjectDetailModal.tsx` LINE 공유 버튼 2곳 (일본 모드) |
| `#00D26A` 네이버 | 현재 네이버 버튼 없음. 생기면 그때 허용 |

Tailwind 토큰: `comic-pink`, `comic-yellow`, `comic-blue`, `comic-green`, `comic-cream`, `comic-black`

## 폰트
- 헤드라인: `font-bungee` (Bungee) — 숫자, 타이틀, 로고
- 본문: `font-pretendard` (Pretendard Variable)

## 테두리 & 그림자 (핵심)
```
테두리: border-[3px] border-[#0A0A0A]  (또는 4px)
모서리: rounded-[12px] ~ rounded-[24px]  ← 반드시 둥글게
그림자: 4px 4px 0 #0A0A0A  (blur 없음, offset만)
큰그림자: 6px / 8px / 12px 12px 0
```

❌ **금지**: `rounded-none`, 블러 그림자(`shadow-lg` 등), 어두운 다크 배경
✅ **필수**: 모든 카드/버튼 `rounded-[12px]` 이상 + offset 그림자

## Framer Motion 패턴
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

## Figma → Next.js 변환
```
import { Link } from 'react-router-dom'  →  import Link from 'next/link'
<Link to="/search">                       →  <Link href="/search">
useNavigate()                             →  useRouter() from 'next/navigation'
navigate('/room/1')                       →  router.push('/room/1')
```
