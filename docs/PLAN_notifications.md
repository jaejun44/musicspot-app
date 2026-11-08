# 재방문 ③ — 알림 채널 비교·설계안 (조사만, 2026-11-08)

> 상태: **A(웹 푸시)로 결정 (2026-11-08, 사용자)** — Vercel Hobby · `web-push` 의존성 승인 · ④ 미납 알림 포함. 구현은 5절 PR 1부터, 각 PR의 SQL은 초안 승인 후 적용. **PR 1(구독) 완료 — 14_push.sql 운영 적용(11-08)** · **PR 2(즉시 발송) — 15_push_log.sql 운영 적용(11-08)** · **PR 3(전날·미납 Cron) — DB 변경 없음** 이 문서는 코드·DB·외부 콘솔을 바꾸지 않고 공식 문서와 현재 코드만 읽어 만들었다.
> 표기: 공식 문서로 확인하지 못한 것은 **[미확인]**, 문서를 해석한 것은 **[해석]**.

## 1. 알림을 보낼 상황

| # | 상황 | 받는 사람 | 지금 받는 사람의 상태 |
|---|---|---|---|
| ① | 멤버가 투표함 | 투표를 만든 사람 | 로그인 없음 (`creator_token`, 기기 키 `ms_vk`) |
| ② | 투표가 결정됨 | 투표한 멤버 | 로그인 없음 (기기 키) |
| ③ | 합주 전날 | 결정된 투표의 멤버·만든 사람 (+ `band_schedules`) | 대부분 로그인 없음. 지금은 캘린더(.ics·구글)가 대신함 |
| ④ | 정산 미납 | **본인에게만** — 정산 화면을 열었는데 [냈어요]를 안 누른 사람 | 로그인 없음. 체크하기 전에는 `split_payers` 행이 없음 |

**핵심 제약**: 받을 사람 대부분이 **로그인하지 않은 단톡방 멤버**다(투표·정산 모두 로그인 없이 쓰도록 만들었다). 그래서 로그인을 전제로 하는 안은 받는 사람이 크게 줄어든다.

## 2. 현재 코드 상태 (읽은 것)

- **PWA**
  - `app/manifest.ts`: `display: 'standalone'`, 아이콘 192·512.
  - `components/PWAInstallBanner.tsx`: 안드로이드는 `beforeinstallprompt`, iOS는 수동 안내. 이벤트 `pwa_install_prompt`.
  - **서비스 워커는 없다**(`public/sw*`, `navigator.serviceWorker` 0건). `web-push` 같은 의존성도 없다.
- **분석**: `lib/analytics/context.ts`가 이미 `is_pwa`(standalone 여부)를 기록한다 → 홈 화면 설치 비율을 측정할 수 있다.
- **카카오 로그인**
  - `app/login/_components/LoginClient.tsx`: `supabase.auth.signInWithOAuth({ provider: 'kakao', options: { redirectTo } })`. **추가 scope가 없다.**
  - `app/auth/callback/page.tsx`: 클라이언트에서 `getSession()`을 한 뒤 이동한다. `provider_token`을 쓰는 곳은 0건이다.
- **카카오 JS SDK**: `app/layout.tsx`에서 2.7.4를 로드한다. 투표 "나에게 카톡 보내기"(`VoteAdminLink.tsx`)는 **카카오톡 공유(사용자가 직접 보냄)**라서 메시지 API가 아니다.
- **스케줄**: `vercel.json`이 없어 Cron이 0개다. `app/api/cron/reset-weekly-scores`는 보류 상태다(PHASES).
- **헤더**: `next.config.js`에 CSP가 없다 → 서비스 워커 등록을 막는 헤더는 없다.

## 3. 비교표

| | **A. 웹 푸시** (Service Worker + Push API + VAPID) | **B. 카카오 "나에게 보내기"** (카카오톡 메시지 API) |
|---|---|---|
| **정책 적합성** | 표준 기능이다. 사이트가 사용자에게 보내는 용도 그대로다. | ❌ **카카오 문서가 "두 제품 모두 사용자간 메시지 전송만 지원하며, 서비스가 사용자에게 메시지를 발송할 수 없습니다"라고 명시한다.** 서비스가 직접 보내야 하면 "브랜드 메시지 또는 알림톡"을 쓰라고 안내한다. → 서버가 ①~④를 자동으로 보내는 것은 정책 밖이다 **[해석 — 카카오 데브톡 문의로 확정 가능]** |
| **받을 수 있는 사람** | 알림을 허용한 기기. **로그인이 필요 없어서** 기기 키로 투표·정산과 묶을 수 있다. | 카카오로 로그인하고 `talk_message`에 동의한 사람만. 투표·정산 멤버 대부분(비로그인)은 제외된다. |
| **데스크톱** | 크롬·엣지·파이어폭스·사파리 모두 Push API를 지원한다(MDN Baseline, 2023-03~). macOS 사파리는 16.1(Ventura)부터 지원한다. 브라우저를 완전히 닫았을 때 받는지는 **[미확인]** — 브라우저별 백그라운드 실행 설정에 달려 있다. | 카톡 PC·모바일 "나와의 채팅"으로 받는다. 기기 제약은 없다. |
| **안드로이드** | 크롬·삼성 인터넷이 지원한다(MDN). 홈 화면 추가가 필요 없다. | 위와 같다. |
| **iOS** | 16.4 이상, **홈 화면에 추가한 웹 앱에서만** 된다. manifest `display`가 `standalone`이어야 하고(우리는 충족), 권한 요청은 사용자 탭에서만 할 수 있다(WebKit). | 위와 같다. |
| **카톡 인앱 브라우저** | 단톡방 링크를 누르면 카톡 인앱 브라우저로 열린다. 여기서 푸시가 되는지는 **[미확인]**(공식 문서 없음) — 1단계 PR에서 실제 기기로 확인해야 한다. | 해당 없음. |
| **필요한 것** | VAPID 키 한 쌍(공개키는 클라이언트, 비밀키는 서버 전용 env), `public/sw.js`, 구독 저장 테이블, 발송 서버(Next 라우트 + Vercel Cron). 발송 라이브러리 `web-push`는 의존성 추가라서 승인이 필요하다. | 카카오 디벨로퍼스에서 동의항목 "카카오톡 메시지 전송(`talk_message`)"을 켜야 한다(콘솔 변경). Supabase OAuth에 scope를 추가하고, **사용자 액세스 토큰**으로 `POST kapi.kakao.com/v2/api/talk/memo/default/send`를 호출한다. |
| **토큰·키 보관** | 구독 1개 = `endpoint` + `p256dh` + `auth`. MDN에 따르면 endpoint는 "아는 사람은 누구나 보낼 수 있는 URL"이라 비밀로 다뤄야 한다 → RLS 정책 0개, RPC로만 저장하고 읽기는 서버(service key)만 한다. | **Supabase는 provider 토큰을 DB에 저장하지 않고 갱신도 하지 않는다**(Supabase 문서). → 로그인 직후 클라이언트가 `provider_refresh_token`을 우리 서버로 보내 **암호화 저장**하고 직접 갱신해야 한다. 액세스 토큰은 REST 6시간·JS 2시간이다. 리프레시 토큰은 2달이고 남은 기간이 1달일 때부터 갱신할 수 있으며, **갱신할 때마다 새 토큰이 나오고 이전 토큰은 폐기된다**. 2달 동안 접속하지 않으면 보낼 수 없다. |
| **심사** | 없다. | "나에게"는 쿼터 표상 심사 전에도 **발송 건수 제한이 없다**. 친구에게 보내기는 비즈 앱 전환과 심사가 필요하다(일 30건 테스트 쿼터). |
| **발송 제한** | 크롬은 제한이 없다. 파이어폭스는 알림이 없는 push에만 사이트별 쿼터가 있다(MDN). 조용한 push는 허용되지 않는다. | "나에게"는 제한이 없다(카카오 쿼터 표). |
| **비용** | 푸시 서비스는 무료(브라우저 회사가 운영)다. 함수 실행 비용만 든다. Vercel Cron은 모든 플랜에 포함되지만 **Hobby는 하루 1번·±59분**이다(③ 전날 알림에는 충분하고 ①②는 Cron이 아니라 즉시 발송이라 상관없다). | API 비용은 문서에 없다 **[미확인]**. 토큰 저장·갱신 작업이 계속 든다. |
| **개인정보** | 저장: 구독(endpoint·키), 기기 키, 연결한 투표·정산 ID, 국가·언어, 생성 시각. 이름·전화번호는 저장하지 않는다. 철회: 브라우저 알림 끄기, 또는 화면의 "알림 끄기" → RPC 삭제. 410 응답이 오면 자동으로 지운다. | 저장: 카카오 리프레시 토큰(**카톡 메시지를 보낼 수 있는 권한**) — 유출되면 피해가 A보다 크다. 철회: 카카오 계정의 "연결된 서비스 관리"와 우리 쪽 토큰 삭제. |
| **공수** | 4개 PR, 약 3~4일(5절) | 정책 문제를 빼도 2~3일. scope·토큰 서버 저장·암호화·갱신 Cron·로그인 사용자만 받을 수 있는 UI가 필요하다. |
| **리스크** | 권한 거절과 피로(→ 행동 직후에 우리 화면으로 먼저 물어봄), iOS는 홈 화면 설치가 필요, 카톡 인앱 브라우저 **[미확인]**, 서비스 워커 배포 실수(→ fetch 핸들러 없이 push만 처리) | **정책 위반으로 앱이 제재될 수 있음**, 받을 수 있는 사람이 적음(가입자 12명), 토큰 유출 피해가 큼 |

**참고 — C. 알림톡**: 카카오가 "서비스→사용자 정보성 메시지" 용도로 안내하는 제품이다. 하지만 카카오톡 채널, 비즈니스 인증, 발송 대행사, **받는 사람 전화번호**가 필요하다. 비용은 **[미확인]**이다. 전화번호를 수집해야 해서 지금의 "로그인 없음" 구조와 맞지 않는다 → 비즈니스 단계(2026-10 이후 재결정 항목)로 미룬다.

## 4. 추천: **A. 웹 푸시**

1. **정책**: B는 카카오 문서가 서비스→사용자 발송을 명시적으로 막는다. ①~④는 전부 서버가 자동으로 보내는 알림이다.
2. **받는 사람**: ①~④를 받을 사람 대부분이 비로그인 단톡방 멤버다. A는 지금 쓰는 기기 키(`ms_vk`)에 구독을 붙이면 된다. B는 로그인한 사람만 받는다(가입자 12명).
3. **유입 구조**: 유입 대부분이 PC다. PC 크롬·엣지·사파리는 설치 없이 바로 된다. 약점인 iOS는 기존 `PWAInstallBanner` 안내로 보완하고 `is_pwa`로 측정할 수 있다.
4. **보안**: A가 저장하는 구독은 "이 브라우저에 알림을 띄울 권한"에 그친다. B의 리프레시 토큰은 카톡 메시지를 보낼 권한이라 보관 부담이 크다.

**A를 해도 남는 것**: 카톡 인앱 브라우저와 iOS 비설치 사용자는 못 받는다. 그래서 **캘린더(③의 대안)와 단톡방 링크를 계속 기본 수단으로 둔다.** 푸시는 그 위에 얹는다.

## 5. 단계별 구현 계획 (A안, PR 단위)

각 PR 착수 전에 SQL 초안 승인, 의존성(`web-push`) 승인, 환경변수 등록(사용자)이 필요하다.

### PR 1 — 구독만 (보내기 없음) · 약 1~1.5일
- **새 파일**
  - `public/sw.js`: `push` 이벤트 → `showNotification`, `notificationclick` → 해당 링크 열기. **fetch 핸들러와 캐시 없음.**
  - `lib/push.ts`: 지원 여부 판별(`'serviceWorker' in navigator && 'PushManager' in window`), 등록, `subscribe({ applicationServerKey })`.
  - `components/PushOptIn.tsx`: 우리 화면으로 먼저 묻고, 누르면 그때 `Notification.requestPermission()`을 호출한다(사용자 탭 필수 — WebKit).
- **넣을 곳**: 사용자가 행동한 직후에만 띄운다.
  - 투표에 응답한 직후 "결정되면 알려 드릴까요?"
  - 투표를 만든 직후 "멤버가 투표하면 알려 드릴까요?"
  - 정산 화면에서 "[냈어요] 잊지 않게 알려 드릴까요?"
  - 지원하지 않는 환경(카톡 인앱 등)에서는 아예 숨긴다.
- **DB** `supabase/14_push.sql`(투표·정산과 같은 방식: RLS on, 정책 0개, anon/authenticated REVOKE, SECURITY DEFINER RPC만)
  - `push_subscriptions`: `id`, `device_key`(8~64자), `user_id`(nullable), `endpoint`(unique), `p256dh`, `auth`, `failed_count`, `last_sent_at`, `revoked_at`, `country`, `language`, `created_at`
  - `push_topics`: `subscription_id`, `kind`(`vote`|`split`), `target_id`, `role`(`creator`|`member`), `country`, `language`, `created_at` — PK `(subscription_id, kind, target_id)`
  - RPC
    - `subscribe_push(p_device_key, p_endpoint, p_p256dh, p_auth, p_kind, p_target_id, p_role, …)`: endpoint는 https만 받는다. 기기 키당 구독 수에 상한을 둔다. 만든 사람 role은 `creator_token`으로 확인한다.
    - `unsubscribe_push(p_endpoint)`
  - **읽는 RPC는 만들지 않는다**(서버가 service key로만 읽는다).
- **환경변수**: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`(서버 전용, `NEXT_PUBLIC` 금지), `VAPID_SUBJECT`(mailto)
- **확인**: 실제 기기(PC 크롬·엣지·맥 사파리, 안드로이드 크롬, 아이폰 홈 화면 앱, **카톡 인앱 브라우저**)에서 구독이 되는지
- **이벤트**: `push_prompt_view {where}`, `push_permission {result}`, `push_subscribe {kind, role}`

### PR 2 — ①·② 즉시 발송 · 약 1일
- `app/api/push/notify/route.ts`
  - 클라이언트가 RPC에 성공한 뒤 `{kind, target_id}`만 보낸다.
  - **서버는 클라이언트를 믿지 않고** service key로 DB를 다시 읽어 실제로 새 응답이 생겼는지, 결정됐는지 확인한 뒤 보낸다(N빵 금액을 서버가 다시 계산한 것과 같은 원칙).
  - 남용 방지
    - ①은 만든 사람에게 10분에 1번으로 묶는다("새 응답 N개").
    - ②는 투표당 1번.
    - 중복은 `push_log`(subscription, kind, target, event) unique로 막는다 → 이 테이블도 14번 SQL에 넣는다.
- 404·410 응답이 오면 구독을 삭제하고, 다른 실패는 `failed_count`를 올린다(로그는 남기되 endpoint는 찍지 않는다).
- **알림 링크**: `buildShareUrl(…, 'push', 'vote', id)` → `ShareSource`에 `push`를 추가한다. 관리 토큰 `#k=`는 넣지 않는다.
- **이벤트**: 열람은 `utm_source=push`로 잡히므로 새 이벤트가 필요 없다.

### PR 3 — ③ 전날 + ④ 미납 · 약 1일
- `app/api/cron/push-reminders/route.ts` + `vercel.json` `crons`(하루 1번, 예: 11:00 UTC = 20:00 KST. Hobby라면 ±59분). `CRON_SECRET`으로 인증한다(이미 있는 env).
  - **③**: 결정된 투표 중 표가 가장 많은 날짜가 내일인 것 → 그 투표의 구독자 전원. `band_schedules`는 로그인 사용자 구독이 생기면 확장한다.
  - **④**: 만든 지 1일 이상 된 정산에서, 정산 topic(member)을 구독했고 그 기기 키의 `split_payers.paid`가 true가 아닌 사람에게만 1번 보낸다. **이름이나 다른 사람의 납부 상태는 알림에 넣지 않는다.**
- ④가 개인 독촉으로 느껴지지 않도록 문구는 "정산 링크 다시 보기"처럼 중립적으로 쓴다(사용자 검토).

### PR 4 — 측정 · 문서 · 반나절
- `docs/ANALYTICS.md`에 이벤트와 쿼리를 추가한다: 허용률 = `push_permission(granted)` / `push_prompt_view`, 알림 유입 = `utm_source=push` 세션, 알림 받은 사람 D7.
- 판정: 2주 뒤 허용률과 알림 유입 세션을 캘린더 유입(`utm_source=calendar`)과 비교한다.

## 6. 결정 (2026-11-08, 사용자)

- 채널: **A 웹 푸시**
- Vercel: **Hobby** → PR 3 Cron은 하루 1번, `0 11 * * *`(20:00 KST 목표, 실제 20:00~20:59)
- `web-push` 의존성: **승인**
- ④ 미납 알림: **넣는다** ("잊지 않게"). 본인에게만, 정산당 1번, 중립 문구
- 아직 남은 것: VAPID 키 생성·환경변수 등록은 PR 1 때 사용자가 직접(키 값은 채팅·파일에 쓰지 않음). B 관련 카카오 문의는 하지 않음

### (결정 전 질문 — 기록용)

1. **Vercel 플랜이 Hobby인가요, Pro인가요?** 전날 알림의 정확도(±59분)만 달라진다. 콘솔을 보지 않고는 확인하지 않았다.
2. **의존성 `web-push` 추가를 승인하나요?** 직접 구현(RFC 8291 암호화)은 권하지 않는다.
3. **④ 미납 알림을 넣을까요?** 본인에게만 가더라도 "독촉" 느낌이 있을 수 있다. 넣는다면 문구를 검토해 주세요.
4. (B를 계속 검토한다면) 카카오 데브톡에 "로그인 사용자 본인에게 서비스 알림을 나에게 보내기로 보내도 되는지" 문의해야 한다. 콘솔 설정은 바꾸지 않았다.

## 출처 (공식 문서)

- 카카오톡 메시지 공통 — 이용 정책·쿼터·"서비스가 사용자에게 메시지를 발송할 수 없습니다": https://developers.kakao.com/docs/ko/kakaotalk-message/common
- 카카오톡 메시지 REST API — 나에게 보내기 엔드포인트·`talk_message`: https://developers.kakao.com/docs/ko/kakaotalk-message/rest-api
- 카카오 로그인 공통 — 토큰 만료(액세스 REST 6시간·JS 2시간, 리프레시 2달, 갱신 시 이전 토큰 폐기): https://developers.kakao.com/docs/ko/kakaologin/common
- Supabase 소셜 로그인 — provider 토큰을 DB에 저장하지 않고 갱신도 하지 않음: https://supabase.com/docs/guides/auth/social-login
- Supabase Kakao 로그인: https://supabase.com/docs/guides/auth/social-login/auth-kakao
- MDN Push API — 서비스 워커 필수, endpoint 비밀, 브라우저 지원·쿼터: https://developer.mozilla.org/en-US/docs/Web/API/Push_API
- web.dev 웹 푸시 개요 — VAPID·구독·푸시 서비스: https://web.dev/articles/push-notifications-overview
- WebKit — iOS/iPadOS 16.4 웹 푸시(홈 화면 앱, `display`, 사용자 탭), macOS 사파리 16.1: https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/
- Vercel Cron 사용량 — Hobby 하루 1번·±59분, Pro 분 단위: https://vercel.com/docs/cron-jobs/usage-and-pricing
