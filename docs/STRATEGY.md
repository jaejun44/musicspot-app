# Music Spot 전략 문서

> 코딩 의사결정 시 방향 흔들릴 때 참조. 자세한 비전·재무는 `/Users/jaejunlee/Desktop/Music-Spot/music spot/` 폴더.

---

## 회사 정체성 (2026-05-12 확정)

Music Spot은 음악인 커뮤니티 회사다.
- **8마디 챌린지가 OS**
- **합주실은 마중물**
- **페스티벌이 목적지**

B2B SaaS 대시보드 / 17개 사업자 필드 입력 폼 / M→T 전환 자동화는 **Y2 이후 검토 대상**.

---

## 4단계 깔때기

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
> 외부 메시지는 "뮤지션 놀이터" 톤. 페스티벌 비전은 내부 의사결정 기준으로만.

### 개발 의사결정 원칙
- 대관은 수단, 커뮤니티가 목적
- Stage N 진입 조건 미충족 → Stage N+1 기능 개발 금지
- 기능 추가 시 "4단계 깔때기 중 어디?" 반드시 확인

---

## 8마디 챌린지 = OS

> 상세 설계: `/Users/jaejunlee/Desktop/Music-Spot/music spot/03_8마디_챌린지_설계.txt`

### 4단계에서의 역할

| Stage | 역할 |
|-------|------|
| Stage 1 | 신규 유저 온보딩 + K-factor 1.2+ 달성 |
| Stage 2 | 밴드 결성 신호 (mutual_responses ≥ 5 → 추천) + 일본 챌린지 |
| Stage 3 | 공연 라인업 후보 선별 (challenge_score 누적) |
| Stage 4 | 페스티벌 헤드라이너 후보 데이터 |

### 핵심 DB 필드 (삭제 불가)
- `challenge_score` — 챌린지 누적 점수
- `mutual_responses` — 상호 응답 횟수 (밴드 매칭 신호)
- `pass_chain` — 패스 연결 길이 (바이럴 지표)
- `country` — 'KR' | 'JP' | 'GLOBAL'
- `season` — 시즌 구분

### 응답 5단계 옵션 (제거 금지)
1. 녹음 응답
2. 악보/TAB 응답
3. 텍스트 응답
4. 감상평 응답
5. 패스

### 핵심 KPI (주간 모니터링)
- 응답률 30%+ (미달 2주 → UX 재설계)
- K-factor 1.0+ (미달 1개월 → 바이럴 재검토)
- D7 잔존 20%+ (미달 → 온보딩 강화)

---

## 한일 동시 설계 원칙

> 처음부터 한일 동시 설계. 나중에 마이그레이션 비용 폭증 방지.
> 상세: `/Users/jaejunlee/Desktop/Music-Spot/music spot/05_일본_진출_계획.txt`

### 신규 테이블 필수 컬럼
```sql
country TEXT NOT NULL DEFAULT 'KR'  -- 'KR' | 'JP' | 'GLOBAL'
region TEXT                          -- 서울/도쿄 등
language TEXT NOT NULL DEFAULT 'ko'  -- 'ko' | 'ja' | 'en'
created_at TIMESTAMPTZ DEFAULT now() -- UTC 필수
```

### i18n 구조
- 현재: Pretendard (한국어)
- Phase 2 추가: Noto Sans JP (일본어) — CSS 변수로 전환
- URL 로케일: `/` (KR), `/ja/` (JP)
- 해시태그: `#8마디챌린지` / `#8小節チャレンジ` / `#MusicSpot8Bar`

### 명예 시스템 3트랙
- 🇰🇷 [YYYY]년 베스트 8마디 챌린저 (KR)
- 🇯🇵 [YYYY]年ベスト8小節チャレンジャー (JP)
- 🌏 [YYYY] Music Spot Global Legend

> ❌ **타이틀 삭제·회수 기능 절대 금지** — 시간 가치 파괴 = 신뢰 파괴

### 일본 진출 절대 원칙
- 한국 Stage 1 미충족 → 일본 공식 투자·기능 개발 금지
- Phase 0~1: 비공식 준비만 (시드 파악, 라이브하우스 리서치)
- 일본 시드 운영자: 일본인 또는 일본 거주 한국인 필수

### 법무·결제
- 저작권: JASRAC 협의 (Stage 1 종료 전) + KOMCA+JASRAC 이중 자문 (Stage 2 전)
- 개인정보: 한국 PIPA + 일본 APPI 동시 준수 (Stage 2 전)
- 결제: KRW → JPY (Stage 2, Stripe 글로벌)

---

## 개발 금지/필수 사항

### ❌ 절대 금지
- 명예 시스템 타이틀 삭제·회수 기능
- K-POP / 비-밴드 장르 콘텐츠 유도
- 광고성 팝업·배너
- 단일 채널 의존 설계 (뮬/큐오넷 직접 CTA 금지)
- 고인물 권력 구조 강화 기능
- 일본 진출 관련 기능 (한국 Stage 1 미달성 시)
- 뮬·큐오넷·페스티벌 회사 코드/UI 직접 언급

### ✅ 필수
- 모든 유저 활동에 `timestamp + user_id + country` 기록
- 8마디 관련 기능은 4단계 깔때기 기여도 명시
- `challenge_score`/`mutual_responses`/`pass_chain` 필드 — 삭제 불가
- 신규 테이블에 `country`/`language`/`created_at(UTC)` 포함
- 응답 5단계 유지 — '패스' 옵션 제거 금지
- 공유 버튼 UTM 자동 삽입

### UTM 파라미터 표준
`utm_source` / `utm_medium` / `utm_campaign` / `utm_content`
- 인플루언서: `utm_content={influencer_id}`

### 조기 경보 → 코드 대응
| 신호 | 기준 | 대응 |
|------|------|------|
| 응답률 저하 | 30% 미만 2주 | 패스/감상평 UI 강조 |
| K-factor 저하 | 1.0 미만 1개월 | 공유 동선 재설계 |
| D7 잔존 저하 | 15% 미만 | 온보딩 첫 챌린지 강제 |

---

## 전략 정합성 체크리스트 (새 기능 추가 시)

- [ ] 4단계 깔때기 중 어느 Stage인가?
- [ ] 현재 Stage 진입 조건 충족인가?
- [ ] 8마디 챌린지 OS와 연결 고리?
- [ ] 신규 테이블에 `country`/`language`/`created_at(UTC)` 포함?
- [ ] 명예 시스템 타이틀 삭제·회수 로직 없는가?
- [ ] 뮬·큐오넷·경쟁사 직접 언급 없는가?
- [ ] 공유 기능에 UTM 자동 삽입?
- [ ] 유저 활동에 `user_id + country + created_at` 기록?
- [ ] "신입 친화적" 톤 유지?
- [ ] K-POP·비-밴드 유입 유도 요소 없는가?
