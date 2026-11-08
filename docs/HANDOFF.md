# 에이전트 인수인계 (Claude Code ↔ Claude Cowork)

> **이 파일을 연 에이전트는 아래 규칙을 지시로 따른다** (사용자 지시가 우선). 파일 전체가 짧게 유지되므로 통째로 읽어도 된다.

## 규칙
- **시작**: 아래 "기록" 맨 위 항목들 확인 → `받는 쪽`이 나이고 `상태: 열림`이면 먼저 처리(못 하면 이유 기록) → `docs/PHASES.md` 맨 위 "현재 상태"(첫 `---`까지)만 읽기 → (Claude Code) `git status`로 커밋 안 된 변경 확인, 기록과 안 맞으면 지우지 말고 사용자에게 묻기
- **끝**(파일을 바꿨거나 조사·결정 결과가 있으면): "기록" 맨 위에 항목 추가 · 운영 상태/다음 할 일이 바뀌면 PHASES "현재 상태"도 갱신 · 넘길 일은 `받는 쪽`+`요청`+`상태: 열림`, 처리한 쪽이 `처리됨 (날짜, 누가)`로 변경
- **금지**: 사용자가 그때 지시하지 않은 PR 머지·main 푸시·운영 DB 쓰기·스키마/환경변수 변경 · 비밀값(비밀번호·키·토큰)을 파일·커밋에 쓰기
- 커밋을 안 하는 쪽(Cowork)은 바꾼 파일 경로를 빠짐없이 적는다 → Claude Code가 리뷰·커밋·PR을 이어받는다
- **길이 관리**: 기록은 최근 8개만. 넘치면 가장 오래된 `처리됨` 항목을 지운다(중요한 내용은 이미 PHASES 날짜 로그에 있어야 함). 항목은 6줄 이내

형식: `### YYYY-MM-DD HH:MM KST — 작성자(Claude Code|Cowork) — 제목` 다음 줄에 `- 한 일` / `- 바뀐 파일`(경로·커밋/PR, 또는 "커밋 안 함") / `- 확인한 것` / `- 받는 쪽`(Claude Code|Cowork|사용자|없음) / `- 요청` / `- 상태`(열림|처리됨 (날짜, 누가))

---

## 기록

### 2026-11-08 — Claude Code — 재방문 ③ PR 3 전날·미납 알림 Cron
- 한 일: 하루 1번(20:00~20:59 KST) 합주 전날 알림 + 정산 미납 본인 알림. DB 변경 없음
- 바뀐 파일: `vercel.json`(새)·`app/api/cron/push-reminders/route.ts`(새) · `lib/push-server.ts`·`lib/push-messages.ts`·`tests/push-messages.cjs` · docs — 브랜치 `push-reminders`
- 확인한 것: 전날 알림 실제 수신·재실행 중복 방지·인증 401. 미납 실제 발송은 미확인(24시간 지난 정산 없음)
- 받는 쪽: 사용자
- 요청: PR 머지 승인 · Vercel `CRON_SECRET` 등록(Production, 값은 채팅에 쓰지 않기) · 원하면 내 크롬으로 QA 정산 `dfb7f039` 알림 받기 → 다음 날 20시대 미납 알림 확인
- 상태: 열림

### 2026-11-08 — Claude Code — 재방문 ③ PR 2 웹 푸시 즉시 발송
- 한 일: 멤버 투표 → 만든 사람, 결정 → 멤버 알림. `supabase/15_push_log.sql`(승인 후 운영 적용) + `web-push@3.6.7`
- 바뀐 파일: `app/api/push/notify/route.ts`·`lib/push-server.ts`·`lib/push-messages.ts`·`tests/push-messages.cjs`·`supabase/15_push_log.sql`(새) · `lib/push.ts`·`VoteClient`·`lib/share-utm.ts`·package.json · docs — 브랜치 `push-send`
- 확인한 것: 실제 FCM 발송 2종·10분 중복 방지·결정 중복 방지·입력 검증(PHASES 11-08 PR 2 로그)
- 받는 쪽: 사용자
- 요청: PR 머지 승인 · VAPID 키 3개 Vercel 등록(`npx web-push generate-vapid-keys`, 값은 채팅에 쓰지 않기) 후 재배포 · 휴대폰·카톡 인앱에서 "알림 받기" 확인
- 상태: 열림

### 2026-11-08 — Claude Code — 재방문 ③ PR 1 웹 푸시 구독
- 한 일: 서비스 워커·"알림 받기" 카드(투표 만든 사람·투표한 멤버·정산 안 낸 멤버) + DB `push_subscriptions`·`push_topics`(`supabase/14_push.sql`, 승인 후 운영 적용). 발송은 아직 없음
- 바뀐 파일: `public/sw.js`·`lib/push.ts`·`components/PushOptIn.tsx`·`tests/push.cjs`·`supabase/14_push.sql`(새) · vote·split 화면 · events · docs — 브랜치 `push-subscribe`
- 확인한 것: SQL 26개 항목·REST 401·실제 Chromium 구독·SW 알림 표시·이벤트 3종. 실제 휴대폰·카톡 인앱은 미확인
- 받는 쪽: 사용자
- 요청: PR 머지 승인 → VAPID 키 생성·Vercel 등록(방법은 PR 2 착수 때 안내) → 휴대폰·카톡 인앱에서 "알림 받기" 보이는지 확인
- 상태: 열림

### 2026-11-08 — Claude Code — 재방문 ② 합주비 N빵 정산 링크
- 한 일: 결정된 투표·상세 요금 줄 "🧮 합주비 계산" → `/split/[id]` 정산 링크(1인당·[냈어요] 체크, 로그인·송금 없음) → "다음 합주 정하기"로 새 투표. DB `splits`·`split_payers` + RPC 3개(`supabase/13_splits.sql`, 승인받아 운영 적용 완료)
- 바뀐 파일: `app/split/`·`lib/split.ts`·`tests/split.cjs`·`supabase/13_splits.sql`(새) · vote·room 화면 · `VoteCreatePanel`·`lib/{share-utm,i18n/locale}.ts`·`lib/analytics/events.ts` · docs — 브랜치 `split-link`
- 확인한 것: 완료 조건 1~5 통과(PHASES 11-08 "재방문 ②" 로그). 카카오톡 실제 전송은 미확인
- 받는 쪽: 사용자
- 요청: PR 머지 승인 · 머지 후 실제 밴드 단톡방에서 한 번 써 보기(정산 링크 카톡 공유 → 멤버 [냈어요] → 다음 합주 투표)
- 상태: 열림

### 2026-11-08 — Claude Code — 착지 페이지 스트립 + 캘린더에 추가
- 한 일: `/region`·`/room`에 최근 본·찜·진행 중인 투표 스트립(상세는 현재 곳 제외), 결정된 투표·밴드 일정에 [구글 캘린더][.ics] (하루 전 알림 + 메모에 UTM 링크, 토큰 없음)
- 바뀐 파일: `components/{ReturnStrip,AddToCalendar}.tsx` · `lib/calendar.ts`·`tests/calendar.cjs`(새) · region·room·vote·my-band 화면 · `lib/share-utm.ts`·`lib/analytics/events.ts`·`band-ja.ts` · docs — 브랜치 `landing-strip-calendar`
- 확인한 것: 완료 조건 1·2·4·5·6 통과(PHASES 11-08 로그). 3은 .ics 구조만 검사, 실제 가져오기·`/my-band`(로그인)는 미확인
- 받는 쪽: 사용자
- 요청: 머지 승인 · 휴대폰에서 결정된 투표의 .ics 열어 보기(아이폰 Safari) · 원하면 맥 캘린더 가져오기 확인
- 상태: 열림

### 2026-11-08 — Claude Code — "멤버한테 물어보기" 구현 (Cowork 전략 ①)
- 한 일: 상세 문의 카드·이름 옆 버튼 + 문의하고 돌아왔을 때 넛지 → 후보 시트 → 투표 생성(`?new=1` 공유 카드 강조). 문의 바는 안 건드림. Cowork 11-08 HANDOFF 기록 2건도 이 PR에 커밋
- 바뀐 파일: `lib/ask-members.ts`·`tests/ask-members.cjs`·`AskMembersButton/Sheet.tsx`(새) · `RoomBookingWidget`·`RoomInfoCard`·`RoomDetailClient`·`VoteCreatePanel`·`VoteClient`·`lib/analytics/{index,events}.ts` · docs — PR(이 브랜치 `ask-members`)
- 확인한 것: 완료 조건 1~5 통과(PHASES 11-08 로그). 실기기 카톡 공유는 미확인
- 받는 쪽: 사용자
- 요청: PR 머지 판단. 전략 ②~⑤ 우선순위·카카오톡 채널 여부는 아래 Cowork 항목대로 여전히 결정 대기
- 상태: 열림

### 2026-11-08 — Cowork — 유입자 → 유저 전환 전략 제안 (결정 대기)
- 한 일: 5단계 사다리(방문→결정→재방문→가입→밴드) 정의. 우선순위: ① 문의 바 옆 "멤버한테 물어보기"(후보 자동 담기 → 투표 → 카톡 공유) ② 가입은 투표 생성·찜 3개·결정 시점에만 ③ 카카오톡 채널로 합주 전후 알림(초기 수동) ④ 실제 3팀 직접 시딩 ⑤ 네이버 색인 확인·ChatGPT 유입 지역 페이지 강화
- 바뀐 파일: `docs/HANDOFF.md`(이 항목) — 커밋 안 함
- 확인한 것: 근거는 GA 보고서 개요(28일 활성 157·신규 155·체류 48초)와 PHASES "현재 상태" 수치. 구현·검증 안 함
- 받는 쪽: 사용자
- 요청: 우선순위 확정, 카카오톡 채널 보유 여부 알려주기 → ①은 Claude Code 프롬프트로 전달 예정
- 상태: 열림

### 2026-11-08 — Cowork — GA4 보고서 개요 점검 (지난 28일, 10/11~11/7)
- 한 일: 사용자 Chrome으로 GA4 확인. 활성 157·신규 155 → 재방문 거의 없음. 유입 google 65·direct 50·chatgpt.com 10·bing 8·instagram 6·dcinside 3. 주요 이벤트(전환) 미설정
- 바뀐 파일: `docs/HANDOFF.md`(이 항목 + 11-06 항목 처리됨 표시) — 커밋 안 함
- 확인한 것: 보고서 개요 화면만. GA 수치는 `user_events`보다 적음(차단·동의 영향 추정, 미검증). 상세 보고서·기기별은 미확인
- 받는 쪽: Cowork
- 요청: (11-08 사용자 승인) `contact_click`·`booking_attempt` 주요 이벤트 지정 완료. `booking_realtime_click`·`vote_create`는 GA에 아직 수신 기록이 없어 지정 불가 → 첫 수신 후 별표 지정
- 상태: 열림
