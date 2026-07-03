# RULES — 절대 금지 / 필수 사항 (상세)

> 제품·전략 제약의 전체 목록. CLAUDE.md 본체엔 핵심만 요약, 상세는 여기.

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

## 신규 테이블 필수 컬럼 (한일 동시 설계)
```sql
country TEXT NOT NULL DEFAULT 'KR'   -- 'KR' | 'JP' | 'GLOBAL'
region TEXT
language TEXT NOT NULL DEFAULT 'ko'  -- 'ko' | 'ja' | 'en'
created_at TIMESTAMPTZ DEFAULT now() -- UTC 필수
```
