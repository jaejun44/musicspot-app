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

### 2026-11-17 — Claude Code — 8마디 "올린 뒤의 고리": 점수 10점 · 이어 치기 알림(앱+푸시) · 최근 테이크
- 한 일: 업로드 3곳 10점(`lib/challenge-score.ts`, DB CHECK 0/10) + Amplitude 점수 `total_score` · 트리거 `trg_notify_track_reply`(만든 사람·앞선 참여자, 본인 제외, 10분 1번) · 웹 푸시 `stem`(올린 직후·참여자 상세 "누가 이어 치면 알림 받기") · 홈 3개·`/jam` 5개 최근 테이크 · 이벤트 4종. DB `22_stem_loop.sql` 승인 후 운영 적용(11-17). 팔로우 알림 중복(브라우저 직접 insert) 제거. HANDOFF는 8개로 정리(11-08 항목 6개 등 — 남은 요청은 PHASES 다음 할 일로 옮김)
- 바뀐 파일: `supabase/22_stem_loop.sql`·`23_notifications_insert_close.sql`·`lib/challenge-score.ts`·`components/RecentTakes.tsx`·`tests/challenge-score.cjs` 새 파일 + TrackUploadPanel·TakePanel·ProjectDetailModal·StemsClient·MusicianCard·BandMatchingClient·HomeClient·JamHubClient·PushOptIn·NotificationDropdown·useNotifications·push(-server·-messages)·api/push/notify·share-utm·analytics(context·events)·jam-ja·tests/push-messages · docs — 브랜치 `feat/stem-loop` PR
- 확인한 것: 로컬 Postgres 22 = 26/26·23 = 15/15 각 2회, 운영 제약·트리거 적용 확인, 홈·`/jam` 최근 테이크(390/1440 넘침 없음·버튼 44px·0개면 숨김), 이벤트 anon_id 적재, 122/122·tsc 0·build. 로그인 2계정 실제 알림·푸시는 미확인. ⚠️ 유튜브 링크 업로드는 원래부터 실패(`file_url` NOT NULL)
- 받는 쪽: 사용자
- 요청: ① PR 머지(사용자) ② **머지·운영 배포 확인 뒤에** `23_notifications_insert_close.sql` 적용 승인(먼저 닫으면 옛 코드 브라우저에서 팔로우 알림 insert 오류) ③ 계정 2개로 실기기 확인(B 업로드 → A 벨 1개·푸시 1개, B 없음, 10분 안 재업로드 중복 없음) ④ QA 이벤트 삭제 여부(아래 보고의 id) ⑤ 유튜브 링크 업로드 고칠지
- 상태: 열림

### 2026-11-16 — Cowork — HANDOFF 확인 + 다음 작업 프롬프트: 테이크 이후 고리(점수·응답 알림·최근 테이크)
- 한 일: 기록 확인(백킹 잼 2단계 아이폰 확인 완료, PR #51 머지 대기). 다음 작업 제안: ① 업로드 점수 복구(업로드 1건 10점 — Cowork 제안값, 설계 문서 03에 점수 기준 없음) + `context.ts` 컬럼명 ② 내 8마디에 누가 이어 치면 알림(앱 알림 + 웹 푸시) ③ 홈·`/jam`에 최근 테이크
- 바뀐 파일: `docs/HANDOFF.md`(이 항목) — 커밋 안 함
- 확인한 것: HANDOFF·PHASES 현재 상태·프로젝트 문서 03 검색만. 구현·검증 안 함
- 받는 쪽: 사용자
- 요청: PR #51 머지 → 점수 값(10점) 확정 → 프롬프트를 Claude Code에 전달
- 상태: 처리됨 (11-17, Claude Code — 사용자 10점 확정·#51 머지 후 프롬프트 받아 8마디 고리 PR)

### 2026-11-15 — Claude Code — 후속 과제: 8마디 업로드 점수가 오르지 않음 (백킹 잼 2단계 조사 중 발견)
- 한 일: 운영 DB 읽기만. 트리거 `trg_update_challenge_score` → `update_challenge_score_on_track()`는 `NEW.challenge_score > 0`일 때만 `user_challenge_score`(total·weekly)를 올림. `stem_tracks.challenge_score` 기본값 0이고 `TrackUploadPanel` insert가 값을 안 넣음 → 모든 업로드 0점
- 바뀐 파일: `docs/PHASES.md` 다음 할 일 · 이 항목 — 코드·트리거는 안 건드림(사용자 결정 11-15: 백킹 잼 2단계는 (A) 그대로)
- 확인한 것: 값을 쓰는 곳 = Amplitude 유저 속성 `challenge_score`(`lib/analytics/context.ts`가 없는 컬럼 `score`를 읽어 항상 0 — 실제 컬럼 `total_score`), 관리자 점수 분포(`app/admin/actions.ts`가 `stem_tracks.challenge_score`)
- 받는 쪽: 사용자
- 요청: 업로드 때 점수를 줄지·몇 점인지 정책 결정 → 정하면 별도 PR(업로드 insert + context.ts 컬럼명)
- 상태: 처리됨 (11-17, Claude Code — 사용자 결정 10점·유튜브 포함·소급 없음, 8마디 고리 PR에서 업로드 3곳 + `context.ts` `total_score`)

### 2026-11-15 — Claude Code — 백킹 잼 `/jam` 1단계 (Cowork 11-15 제안 처리)
- 한 일: Web Audio 반주 엔진(6스타일, 소리 시안 사용자 합격) + 키×스타일 조합 132페이지(정적·사이트맵) + 오늘의 잼(음감 5번과 같은 진행·조) + 입구 4곳(메뉴 "백킹 잼"·홈 카드·음감 결과·스트립) + 이벤트 5종·판정 쿼리. DB·의존성 변경 없음. Cowork 11-15 제안과 처리됨 2개(카드뉴스 11-13~15, 내용은 PHASES 날짜 로그)는 정리함
- 바뀐 파일: `lib/jam/`·`app/jam/`·`components/JamTodayCard.tsx`·`lib/i18n/dict/jam-ja.ts`·`tests/jam-*.cjs` 새 파일 + Navigation·HomeClient·EarClient·ReturnStrip·sitemap·events·i18n·`lib/ensemble-audio.ts`(export만) · docs — 브랜치 `jam-backing` PR
- 확인한 것: 110초 재생 루프 5회+ 끊김·코드 불일치 0, BPM 다음 마디 반영, 백그라운드 30초 후 박자 유지, 이벤트 anon_id 적재, 390/1440 넘침 없음, tsc 0·테스트 104/104·build 93초. 실기기·실제 기타·메탈/발라드/팝펑크 음색은 미확인
- 받는 쪽: 사용자
- 요청: ① PR 머지 — 처리됨(11-15 #50, 운영 /jam 200) ② 실제 기타로 아이폰·PC에서 1분 이상 같이 쳐 보기(무음 스위치 포함) ③ 2단계(반주 위에 녹음해 8마디로 올리기) 진행 여부 — 머지 2주 뒤 `docs/ANALYTICS.md` "백킹 잼 판정"과 함께
- 상태: 열림

### 2026-11-13 — Claude Code — 연습실 종류 구분: 밴드용 우선, 댄스 전용은 뒤로 (Cowork 11-12 사전 점검 처리)
- 한 일: 공개 799곳을 밴드 합주 170 · 그 외 449 · 댄스 전용 180으로 분류(승인) → `studios.kinds·band_rank`(18_studio_kinds.sql, 861행 반영, 백업 `backups/2026-11_studios/2026-11-12_studio_kinds_backup.json`). 모든 목록 밴드용 먼저·댄스 전용 맨 뒤, "🎸 밴드 합주" 칩·배지·구분선, 댄스 전용 상세 noindex·사이트맵 제외, 조합 페이지 3개(`/rooms/seoul-band·seoul-drum·mapo-band`, 피아노는 머지 전 제외), /region/mapo 제목 "마포 연습실"로. Cowork 사전 점검 항목은 처리돼 정리함
- 바뀐 파일: `scripts/studio_rules.py`·`update_studio_kinds.py`·`refresh_spacecloud.py`·`import_merged.py` · `lib/studio-kinds.ts`·`room-collections.ts`·`region-select.ts`·`nearby-rooms.ts` · `hooks/useStudios.ts` · `app/rooms/`·지역·상세·검색·HOT·사이트맵 · 테스트 3개 — 브랜치 `studio-kinds` PR
- 확인한 것: 운영 분포 = 미리보기, 검색 구분선 171번째·가격순 댄스 끝·칩 동작, noindex·사이트맵, 390/1440 넘침 없음, tsc 0·테스트·build 성공. 배지에서 보컬은 표시 안 함(kinds 그대로). 지역 색인 기준은 사용자 결정으로 그대로(빼면 9개 빠짐)
- 받는 쪽: 사용자
- 요청: ① PR 머지 — 처리됨(#48) ② 머지 2주 뒤 `docs/ANALYTICS.md` "밴드용 상세 조회 비율 · 세션당 상세 조회" 전후 비교(배포일 기준) — 그때 지역 색인 기준을 바꿀지도
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
