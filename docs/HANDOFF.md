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

### 2026-11-22 — Claude Code — 뉴스 이미지 깨짐 수정 (PR #56 머지·배포)
- 한 일: 뉴스 카드·상세 `next/image`에 `unoptimized`(Vercel 이미지 최적화 우회, Storage WebP 원본 그대로) → 사용자 "머지해줘" → #56 squash 머지(`2a69a1d`), Vercel 운영 배포 success
- 바뀐 파일: `components/NewsCard.tsx`·`app/news/_components/NewsDetailClient.tsx`(각 1줄) — PR #56
- 확인한 것: tsc 0 · 사용자가 운영 /news에서 사진 정상 표시 확인(11-22)
- 받는 쪽: 없음
- 상태: 처리됨 (11-22, Claude Code)

### 2026-11-20 — Claude Code — 카드뉴스 웹 자동 반영: 원인 찾고 맥에서 자동으로
- 한 일: 원인 = 카드뉴스 Cowork 세션에 `musicspot_app` 폴더가 연결돼 있지 않아 반영 명령이 돌 수 없었음. 맥 launchd 30분마다 `--new-only --apply`(전용 앱 `MusicSpotNewsImport.app`에 바탕화면 접근만 허용). 카드뉴스 지침 마지막 섹션을 "자동 반영"으로 교체
- 바뀐 파일: `scripts/import_cardnews.py`(`--new-only`)·`scripts/news_autoimport.sh`·`scripts/launchd/` 새 파일 · `docs/NEWS_PUBLISH.md`·PHASES · 레포 밖 `~/Desktop/musicSpot_cardnews/CLAUDE.md`·`~/Library/LaunchAgents/com.musicspot.news-import.plist`·`~/Applications/MusicSpotNewsImport.app` — 브랜치 `feat/news-autoimport`(11-22 takevideo에서 분리)
- 확인한 것: launchd 실행 exit 0·로그 "새 글 없음". 새 게시물 자동 반영은 다음 게시 때 확인
- 받는 쪽: Cowork · 사용자
- 요청: (Cowork) 게시 후 명령을 돌리지 말고 슬롯(`published`·`post_url`·표기 줄·이미지)만 갖추고 보고에 "웹 반영: 30분 안에 자동" (사용자) 다음 게시 30분 뒤 맥 알림 "웹 반영 완료" 확인
- 상태: 열림

### 2026-11-18 — Claude Code — 카드뉴스 4개 웹 /news 반영 (11-16·11-17) (+11-20 2개)
- 한 일: (11-20 추가) 11-20 a·b 반영(`psychogod`·`gta-the-chamber`, 총 88, 200 확인 — 이번에도 자동 반영 안 됨, 11-18·19 폴더는 없음). 미리보기로 운영과 비교(폴더 86 · DB 82 · DB에만 있음 0) → 사용자 승인 → `--only`로 11-16 a·b, 11-17 a·b 반영(각 5장, 출처 official). 11-18은 아직 게시 전이라 제외. HANDOFF 처리됨 2개 정리
- 바뀐 파일: `docs/HANDOFF.md`만 — 운영 `news_posts` +4행(총 86), Storage `news` 20장
- 확인한 것: 4행 is_published true, `/news/<slug>` 4개 200. ⚠️ 카드뉴스 세션의 자동 반영(11-12 Cowork 항목)은 이번 4개에서 안 돌았음 — 원인 미확인
- 받는 쪽: 사용자
- 요청: 카드뉴스 세션 게시 보고에 "웹 반영" 줄이 나왔는지 확인(11-12 Cowork 항목 요청과 같음)
- 상태: 열림

### 2026-11-17 — Cowork — 테이크 영상: 다음 세션이 이어받을 지점 (사용자 휴대폰 확인 대기)
- 한 일: 1단계(가능 여부)·2단계(화면 시안) 검토·승인 의견 전달. 수정 시안 2장 직접 확인(워터마크·주소가 코드 카드 아래, 화면 아래 20% 비어 있음). 결정: 영상 상한 45초·8마디는 자르지 않음, 반주 없는 프로젝트 엔드 카드 "이 8마디에 나도 이어 치기" + `/stems`
- 바뀐 파일: `docs/HANDOFF.md`(이 항목) — 커밋 안 함
- 확인한 것: 시안 PNG만 봄. 영상 파일·휴대폰 동작은 확인 안 함. Draft PR #55, 미리보기 주소는 11-18 04:37에 만료(만료되면 Claude Code에 새 주소 요청)
- 받는 쪽: 사용자
- 요청: ① 휴대폰에서 영상 만들기 → 저장 → 인스타 릴스 업로드 → 워터마크 가려짐 확인(Claude Code 보고의 1)~8)) ② 통과하면 Claude Code에 나머지(공유·복사 문구·입구·이벤트) 진행 지시 ③ 별도 과제: 운영에서 사이트 글꼴(Bungee·Pretendard) 미로딩 — 영상 작업 뒤 전후 캡처와 함께 별도 PR
- 상태: 열림

### 2026-11-17 — Cowork — 제안: 테이크 → 9:16 공유 영상 자동 생성 (릴스·쇼츠용)
- 한 일: 올린 8마디(반주+테이크)를 브라우저에서 9:16 영상으로 만들어 저장·공유하는 기능 제안. 근거: 설계 문서 `03_8마디_챌린지_설계.txt`의 "30초 영상 자동 생성(워터마크 포함)"이 Stage 1 항목인데 아직 없음(코드 검색으로 확인), 채널 1순위가 인스타 릴스·쇼츠(`01_린캔버스.txt`)
- 바뀐 파일: `docs/HANDOFF.md`(이 항목) — 커밋 안 함
- 확인한 것: 영상 생성 코드 없음(`captureStream`·`video/mp4` 검색 0건). 브라우저별 MP4 녹화 가능 여부는 미확인 — 프롬프트 1단계에서 확인 후 멈춤
- 받는 쪽: 사용자
- 요청: 프롬프트를 Claude Code에 전달할지 결정
- 상태: 열림

### 2026-11-17 — Claude Code — 8마디 "올린 뒤의 고리": 점수 10점 · 이어 치기 알림(앱+푸시) · 최근 테이크
- 한 일: 업로드 3곳 10점(`lib/challenge-score.ts`, DB CHECK 0/10) + Amplitude 점수 `total_score` · 트리거 `trg_notify_track_reply`(만든 사람·앞선 참여자, 본인 제외, 10분 1번) · 웹 푸시 `stem`(올린 직후·참여자 상세 "누가 이어 치면 알림 받기") · 홈 3개·`/jam` 5개 최근 테이크 · 이벤트 4종. DB `22_stem_loop.sql` 승인 후 운영 적용(11-17). 팔로우 알림 중복(브라우저 직접 insert) 제거. HANDOFF는 8개로 정리(11-08 항목 6개 등 — 남은 요청은 PHASES 다음 할 일로 옮김)
- 바뀐 파일: `supabase/22_stem_loop.sql`·`23_notifications_insert_close.sql`·`lib/challenge-score.ts`·`components/RecentTakes.tsx`·`tests/challenge-score.cjs` 새 파일 + TrackUploadPanel·TakePanel·ProjectDetailModal·StemsClient·MusicianCard·BandMatchingClient·HomeClient·JamHubClient·PushOptIn·NotificationDropdown·useNotifications·push(-server·-messages)·api/push/notify·share-utm·analytics(context·events)·jam-ja·tests/push-messages · docs — 브랜치 `feat/stem-loop` PR
- 확인한 것: 로컬 Postgres 22 = 26/26·23 = 15/15 각 2회, 운영 제약·트리거 적용 확인, 홈·`/jam` 최근 테이크(390/1440 넘침 없음·버튼 44px·0개면 숨김), 이벤트 anon_id 적재, 122/122·tsc 0·build. 로그인 2계정 실제 알림·푸시는 미확인. ⚠️ 유튜브 링크 업로드는 원래부터 실패(`file_url` NOT NULL)
- 받는 쪽: 사용자
- 요청: ① PR 머지 — 처리됨(11-17 #52) ② 23 적용 — 처리됨(11-17 배포 확인 뒤 승인·적용, 남 앞 insert 거부·팔로우 알림 1개 확인) ③ 계정 2개 실기기 확인(사용자, 아래 순서) ④ QA 이벤트 — 지우지 않음(8829·8830은 PHASES QA 데이터 줄) ⑤ 유튜브 링크 숨김 — 응답 5단계 해당 여부 답 대기
- 실기기 확인 순서: 1) A로 로그인 → 내가 만든 8마디 상세(오디오 트랙 있는 것)에서 "🔔 누가 이어 치면 알림 받기" → 허용(아이폰은 홈 화면에 추가한 앱에서만 카드가 보임) 2) B(다른 폰·브라우저)로 로그인 → 홈 "방금 올라온 8마디"에서 A의 8마디 [이어 치기] → 상세가 "함께"로 열리는지 3) B가 녹음해서 올리기 4) A 폰에 푸시 1개("🎸 누가 내 8마디에 이어 쳤어요", 이름 없음) → 누르면 그 8마디 상세 5) A 벨에 알림 1개("B님이 내 8마디에 이어 쳤어요") → 누르면 상세, B 벨에는 없음 6) B가 10분 안에 한 번 더 올리기 → A에게 벨·푸시 추가 없음 7) 끝나면 QA로 만든 프로젝트·트랙을 알려 주기(점수 B +10씩·알림 행 확인 후 정리 여부 결정)
- 상태: 열림

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
