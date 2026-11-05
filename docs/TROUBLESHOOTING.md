# TROUBLESHOOTING — 알려진 이슈

> 막히면 여기 먼저 확인. 새 트러블슈팅 발견 시 이 파일에 추가.

- **Supabase 1,000행 제한**: `.limit()` 금지, 배치 range 필수 (`docs/DATA_ACCESS.md` 참조)
- **useSearchParams**: Suspense 래핑 없으면 빌드 에러
- **Kakao SDK onLoad**: layout.tsx 인라인 Script로만 초기화
- **kakao 타입 충돌**: `types/kakao.d.ts` 통합
- **빌드 캐시 오염**: `rm -rf .next` 후 재빌드
- **Vercel 캐시**: 배포 후 변경 안 보이면 Redeploy (clear cache)
- **경로 변경**: `/studios` → `/search`, `/studios/[id]` → `/room/[id]` (`next.config.js` redirects)
- **git push가 `remote: fatal error in commit_refs`로 계속 거부** (2026-11-06): GitHub 장애·ruleset·브랜치 이름 충돌이 모두 없었는데도 `fix/db-security-hardening`만 반복 실패. 같은 커밋을 다른 이름(`security-hardening-1106`)으로 올리니 바로 성공 → **원인 미확인, 우회만 함**: 브랜치 이름을 바꿔서 푸시. 원격에 숨은 ref·규칙·보호 설정 없음(gh api로 확인). 재발하면 GitHub 지원 문의 대상
- **Supabase RPC 404 `Could not find the function ... in the schema cache`**: 넘긴 인자 **이름**이 함수 정의와 다르면 PostgREST가 함수를 못 찾는다(타입이 아니라 이름 기준). 호출부 키를 `pg_get_function_arguments`와 맞출 것
- **PL/pgSQL `column reference "x" is ambiguous`**: `RETURNS TABLE(..., x ...)`의 x가 함수 안에서 변수가 되어 같은 이름의 컬럼과 충돌. 본문 맨 앞에 `#variable_conflict use_column` 또는 컬럼에 테이블 별칭
- **`CREATE OR REPLACE FUNCTION`은 `SET search_path` 등 설정을 덮어씀**: 원래 `proconfig`를 확인해 같이 적을 것(실행 권한 ACL은 유지됨)
- **`gh pr merge`가 rebase·푸시 직후 `Pull Request has merge conflicts`** (2026-11-06): 충돌을 해결해 푸시해도 GitHub가 머지 가능 여부를 다시 계산하는 몇 초 동안은 예전 상태로 거부. `gh pr view <n> --json mergeable`이 `MERGEABLE`인지 보고 재시도

## Next.js 패턴 (재발 방지)
- `useSearchParams` 사용 시 반드시 `<Suspense>` 래핑 (빌드 에러 방지)
- 서버 컴포넌트에서 `generateMetadata` → 클라이언트 컴포넌트 분리
- Kakao SDK 초기화: `layout.tsx` 인라인 `<Script id="kakao-init">` 에서만
- URL 해시에 비밀값(예: 투표 관리 토큰 `#k=`)을 받을 때: 해시는 서버·리퍼러로 안 가지만 GA·Amplitude(자동 수집·세션 리플레이)는 전체 URL을 읽을 수 있음 → 서버 컴포넌트의 인라인 `<script>`로 하이드레이션 전에 꺼내고 `history.replaceState`로 즉시 지운다(`app/vote/[id]/page.tsx`)
