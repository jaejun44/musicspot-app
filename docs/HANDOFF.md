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

### 2026-11-13 — Claude Code — 연습실 종류 구분: 밴드용 우선, 댄스 전용은 뒤로 (Cowork 11-12 사전 점검 처리)
- 한 일: 공개 799곳을 밴드 합주 170 · 그 외 449 · 댄스 전용 180으로 분류(승인) → `studios.kinds·band_rank`(18_studio_kinds.sql, 861행 반영, 백업 `backups/2026-11_studios/2026-11-12_studio_kinds_backup.json`). 모든 목록 밴드용 먼저·댄스 전용 맨 뒤, "🎸 밴드 합주" 칩·배지·구분선, 댄스 전용 상세 noindex·사이트맵 제외, 조합 페이지 3개(`/rooms/seoul-band·seoul-drum·mapo-band`, 피아노는 머지 전 제외), /region/mapo 제목 "마포 연습실"로. Cowork 사전 점검 항목은 처리돼 정리함
- 바뀐 파일: `scripts/studio_rules.py`·`update_studio_kinds.py`·`refresh_spacecloud.py`·`import_merged.py` · `lib/studio-kinds.ts`·`room-collections.ts`·`region-select.ts`·`nearby-rooms.ts` · `hooks/useStudios.ts` · `app/rooms/`·지역·상세·검색·HOT·사이트맵 · 테스트 3개 — 브랜치 `studio-kinds` PR
- 확인한 것: 운영 분포 = 미리보기, 검색 구분선 171번째·가격순 댄스 끝·칩 동작, noindex·사이트맵, 390/1440 넘침 없음, tsc 0·테스트·build 성공. 배지에서 보컬은 표시 안 함(kinds 그대로). 지역 색인 기준은 사용자 결정으로 그대로(빼면 9개 빠짐)
- 받는 쪽: 사용자
- 요청: ① PR 머지 승인 ② 머지 2주 뒤 `docs/ANALYTICS.md` "밴드용 상세 조회 비율 · 세션당 상세 조회" 전후 비교(배포일 기준) — 그때 지역 색인 기준을 바꿀지도
- 상태: 열림

### 2026-11-12 — Cowork — 카드뉴스 지침에 "게시 후 웹 뉴스 반영" 단계 추가
- 한 일: 사용자 승인으로 `~/Desktop/musicSpot_cardnews/CLAUDE.md` 맨 아래에 섹션 추가(인스타 게시 뒤 `import_cardnews.py --only <날짜>/<슬롯> --apply`, 못 돌리면 보고에 "웹 반영 안 됨"). 막힘(blocked) 49개 슬롯 확인: 47개는 맥 잠금·크롬 미연결로 생긴 빈 기록, 카드가 있던 2개 중 1개(10-10 Fit For A King)만 미게시
- 바뀐 파일: 레포 밖 `musicSpot_cardnews/CLAUDE.md`(git 아님) · `docs/HANDOFF.md`(이 항목) — 커밋 안 함
- 확인한 것: 섹션이 1번만 들어감. 카드뉴스 프로젝트 세션에서 실제로 명령이 도는지는 미확인
- 받는 쪽: 사용자
- 요청: 다음 카드뉴스 업로드 때 게시 보고에 "웹 반영 완료"가 나오는지 확인. 안 되면 사유를 Cowork에 전달
- 상태: 열림

### 2026-11-12 — Claude Code — 밴드씬 뉴스 `/news` (인스타 카드뉴스 웹 보관, Cowork 11-12 제안 ④)
- 한 일: 카드뉴스 76개를 `news_posts`·Storage `news`로 가져와 `/news` 목록·상세(JSON-LD·OG·저작자 표기 항상 표시) + 입구(홈·지역·음감 결과·상단 메뉴). DB `supabase/17_news.sql`(+ `image_source_kind`) 승인 후 운영 적용. Cowork 11-12 항목은 ①·④ 모두 처리돼 정리함
- 바뀐 파일: `app/news/`·`lib/news.ts`·`components/NewsCard.tsx`·`NewsLatest.tsx`·`scripts/import_cardnews.py`·`cardnews_parse.py`·`test_cardnews_parse.py`·`tests/cardnews-parse.cjs`·`lib/i18n/dict/news-ja.ts`·`docs/NEWS_PUBLISH.md` 새 파일 + 홈·지역·음감·메뉴·사이트맵·이벤트 — 브랜치 `news-archive` PR
- 확인한 것: `--apply` 2번 76개 그대로(30.74MB), anon 쓰기 거부, 이벤트 4종 적재, 390/1440 넘침 없음, tsc 0·테스트 88/88·build 성공. 건너뜀 56(blocked 49·표기 없음 2 등)
- 받는 쪽: 사용자
- 요청: ① 머지 — 처리됨(11-12 #47, 운영 /news·상세·사이트맵 76개 확인) ② 인스타 프로필 링크 → `https://www.musicspotfest.com/news?utm_source=instagram&utm_medium=bio&utm_campaign=news`(11-12 결정, 바꾸는 건 사용자) ③ 매일 반영 = 카드뉴스 게시 작업 마지막 단계에 `--only … --apply` 1줄(11-12 방향 결정, 매일 운영 DB 쓰기 — 카드뉴스 폴더 지침 수정은 사용자 허용 후, 이 레포 밖) ④ official 39개 공개 유지, 권리자 요청 시 `docs/NEWS_PUBLISH.md` SQL로 즉시 비공개
- 상태: 열림(② 링크 교체·③ 지침 반영 대기)

### 2026-11-12 — Claude Code — 오늘의 음감 `/ear` 매일 5문제 (+ 아이폰 무음 모드 대응)
- 한 일: 날짜 시드 5문제(높낮이·음정·장단조·코드·4마디 진행) + Web Audio 합성 + 연속 기록(localStorage `ms_ear`) + 공유 + 입구(하단 탭 커뮤니티→음감 A안·상단 메뉴·스트립·상세 카드) + 매일 20시대 "아직 안 풀었어요" 푸시. DB `supabase/16_push_ear.sql` 운영 적용(승인·백업 후)
- 바뀐 파일: `app/ear/`·`lib/ear/`·`components/EarEntryCard.tsx`·`lib/i18n/dict/ear-ja.ts`·`tests/ear-*.cjs` 새 파일 + 탭바·메뉴·ReturnStrip·PushOptIn·push-server 등 — 브랜치 `ear-daily` PR
- 확인한 것: 로컬→운영 DB 풀이·잠금·공유·스트립·이벤트 5종·Cron 2회(sent 1 → skipped 1). 후속(브랜치 `ear-ios-silent` PR): 사용자 실기기에서 무음 스위치면 소리 안 남 → `lib/ear/synth.ts` 듣기 탭에서 `navigator.audioSession.type='playback'`(iOS 17+), 없으면 무음 `<audio>` 1회 + iOS만 "무음 모드와 볼륨 확인" 안내. 데스크톱 크롬 소리 그대로·아이폰 UA 안내 확인, tsc 0·테스트 87/87·build 성공, 실기기 무음 스위치 미확인
- 받는 쪽: 사용자
- 요청: ① PR 머지 — 처리됨(11-12, 사용자 승인 → #45 머지, 운영 /ear 200 확인) ② 아이폰 무음 모드 소리 — 처리됨(11-12, #46 머지 후 사용자 실기기 확인) ③ 2주 뒤(11-26 무렵) `docs/ANALYTICS.md` "오늘의 음감 재방문" 쿼리의 3일 연속 완주자 수로 유지·중단 결정
- 상태: 열림

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
