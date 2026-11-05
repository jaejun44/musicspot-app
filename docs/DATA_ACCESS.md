# 데이터 접근 규칙 — 앱 코드의 Supabase 조회 · MCP 호출

> `CLAUDE.md` "데이터 접근 철칙"의 상세. **Supabase/Vercel MCP를 부르기 전, 또는 Supabase 조회 코드를 쓰기 전에 Read.**

## 1. 앱 런타임 코드 — Supabase 1,000행 제한 우회 (필수)

PostgREST는 한 번에 최대 1,000행만 준다. `.limit()`로 늘릴 수 없고, 넘는 행은 **오류 없이 잘린다**.

실제 구현 예: `lib/region-rooms.ts` `fetchSeoulStudios` (그 밖에 `app/sitemap.ts`, `app/admin/actions.ts`)
```typescript
const all: Studio[] = [];
let offset = 0;
while (true) {
  const { data, error } = await supabase
    .from('studios').select('*')
    .eq('is_published', true)
    .order('data_quality_score', { ascending: false })
    .order('id')                       // 순서 고정 — 없으면 배치 사이에 행이 빠지거나 겹칠 수 있다
    .range(offset, offset + 999);
  if (error) throw new Error(`[모듈] 조회 실패 (offset ${offset}): ${error.message}`); // 빈 목록이 ISR에 캐시되지 않게
  if (!data || data.length === 0) break;
  all.push(...data);
  if (data.length < 1000) break;
  offset += 1000;
}
```
- `.limit()` 금지, 배치 `range` 필수. 정렬에 유일 키(`id`)를 마지막에 넣는다
- GPS 검색: 전체 fetch → 프론트 거리 정렬 (`lib/sort.ts`)
- 텍스트 검색: `.order('data_quality_score', { ascending: false })`

## 2. MCP 응답 다이어트 (컨텍스트 절약)

**원칙: 기본은 작게, 필요하면 키운다.** 탐색·파악은 가볍게, 분석·디버깅에 진짜 데이터가 필요하면 목적을 한 줄 밝히고 범위를 넓힌다.

### Supabase MCP (project `mwllqreadynmaoorymkn`)
- **스키마**: `list_tables` 통째 금지(수만 토큰). 특정 테이블은 `execute_sql`로 `information_schema.columns` 한정 조회
- **데이터**: `SELECT *` 금지. 필요한 컬럼만 + `LIMIT` 기본, 샘플은 `LIMIT 5~10`부터
- **예외**: 디버깅·분석에 더 필요하면 목적을 밝히고 범위 확대
- ⚠️ 1번의 "1,000행 우회"는 앱 코드용. MCP 탐색 조회와 혼동 금지
- 운영 DB 쓰기·스키마 변경은 건수/SQL 보고 → 사용자 승인 → 백업 후 (`docs/HANDOFF.md` 규칙)

### Vercel MCP
- `list_deployments`: 최신 1~3개만(`limit`). `get_logs`/`get_runtime_logs`: 줄·시간 범위 제한, 전체 덤프 금지. `list_projects`: 식별 후 재호출 금지

### 공통
- 같은 결과를 같은 세션에서 반복 호출하지 않는다(재사용). 큰 응답이 예상되면 count/구조 먼저 → 필요한 범위만 본조회
