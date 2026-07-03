# DESIGN — 디자인 토큰 (절대 준수)

> UI/디자인 작업 시 이 문서를 Read. Figma 디자인 충실히 구현, 임의 해석·커스텀 스타일 금지.
> Figma: `https://www.figma.com/make/o5UzsSFzgL8h1ZGO2I5Q8D/musicspotMVP`

## 색상

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
