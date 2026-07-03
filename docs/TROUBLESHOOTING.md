# TROUBLESHOOTING — 알려진 이슈

> 막히면 여기 먼저 확인. 새 트러블슈팅 발견 시 이 파일에 추가.

- **Supabase 1,000행 제한**: `.limit()` 금지, 배치 range 필수 (CLAUDE.md "데이터 패턴" 참조)
- **useSearchParams**: Suspense 래핑 없으면 빌드 에러
- **Kakao SDK onLoad**: layout.tsx 인라인 Script로만 초기화
- **kakao 타입 충돌**: `types/kakao.d.ts` 통합
- **빌드 캐시 오염**: `rm -rf .next` 후 재빌드
- **Vercel 캐시**: 배포 후 변경 안 보이면 Redeploy (clear cache)
- **경로 변경**: `/studios` → `/search`, `/studios/[id]` → `/room/[id]` (`next.config.js` redirects)

## Next.js 패턴 (재발 방지)
- `useSearchParams` 사용 시 반드시 `<Suspense>` 래핑 (빌드 에러 방지)
- 서버 컴포넌트에서 `generateMetadata` → 클라이언트 컴포넌트 분리
- Kakao SDK 초기화: `layout.tsx` 인라인 `<Script id="kakao-init">` 에서만
