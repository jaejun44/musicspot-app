# 밴드씬 뉴스 반영 — 인스타 카드뉴스 → /news

인스타에 카드뉴스를 올린 뒤 그 슬롯을 사이트 `/news`에 올리는 방법. 원본 폴더는 읽기만 한다(수정·이동·삭제 없음).

- 원본: `~/Desktop/musicSpot_cardnews/_active/daily/<YYYY-MM-DD>/slot-*/`
- 스크립트: `scripts/import_cardnews.py` (파싱 `scripts/cardnews_parse.py`, 테스트 `tests/cardnews-parse.cjs`)
- 저장: DB `news_posts`(`supabase/17_news.sql`), 이미지 Storage 공개 버킷 `news`(`<날짜>/<슬롯>/01.webp`)

## 자동 반영 (2026-11-20~) — 평소엔 아무것도 안 해도 됨

맥 launchd가 **30분마다** `scripts/news_autoimport.sh`를 돌린다 → `import_cardnews.py --new-only --apply`(DB에 없는 `published` 슬롯만 올림, 이미 올린 글은 건드리지 않음). 새 글이 올라가거나 실패하면 맥 알림("Music Spot 뉴스")이 뜬다.

- 왜 맥에서: 게시는 Cowork(원격 세션)가 하는데 그 세션에는 `musicSpot_cardnews` 폴더만 연결돼 있어 이 레포의 스크립트·`.env.local`에 접근할 수 없다(11-12~20 자동 반영이 한 번도 안 돈 원인)
- 왜 작은 앱: launchd는 바탕화면 폴더를 직접 못 읽는다(`Operation not permitted`). bash·python에 전체 디스크 권한을 주는 대신 `~/Applications/MusicSpotNewsImport.app`(이 스크립트만 실행)에 바탕화면 접근만 허용
- 설치·재설치: `bash scripts/launchd/install_news_import.sh` → 처음 한 번 "데스크탑 폴더 접근" 창에서 [허용]. 해제 방법은 그 파일 맨 아래
- 로그: `~/Library/Logs/musicspot-news-import.log`(실행마다 1줄, 실패면 오류 끝 15줄) · launchd 자체 오류 `…news-import.err.log`
- 상태: `launchctl print gui/$(id -u)/com.musicspot.news-import | grep -E "runs|last exit"`
- 맥이 꺼져 있거나 잠자면 그동안은 안 돈다 → 깨어난 뒤 다음 실행 때 한꺼번에 올라감
- 파이썬 경로가 바뀌면(`which python3`) `news_autoimport.sh`의 `PY`를 고친다

## 수동: 한 슬롯만 바로 / 캡션 고친 뒤 다시 반영

자동 반영은 새 슬롯만 올리므로, **이미 올라간 글의 캡션을 고쳤으면** 아래로 다시 돌린다.

레포 루트(`musicspot_app`)에서:

```bash
python3 scripts/import_cardnews.py --src ~/Desktop/musicSpot_cardnews/_active/daily --only 2026-11-12/slot-a --apply
```

- `--only`의 날짜·슬롯만 바꾼다. 같은 슬롯을 다시 돌려도 중복되지 않는다(`source_key` 기준 upsert — 캡션을 고쳤으면 다시 돌리면 반영)
- 사이트에는 ISR이라 **최대 1시간 뒤** 목록·상세에 보인다(상세는 첫 요청 때 바로 만들어짐)
- 미리 보기만: `--apply` 대신 `--plan /경로/plan.json` (DB·저장소에 쓰지 않음)
- 서비스 키는 `.env.local`의 `SUPABASE_SERVICE_KEY`를 읽는다(출력하지 않음)

## 가져오는 조건 (하나라도 빠지면 건너뜀 — 출력의 `skip_reasons`)

| 조건 | 건너뛸 때 사유 |
|---|---|
| `manifest.json`의 `status`가 `published` | `status=<값>` |
| `post_url`이 `https://www.instagram.com/…` | `post_url 없음` |
| `caption.txt` 있음 | `caption.txt 없음` |
| 이미지 `out/01.png`… 또는 슬롯 루트 `01.png`… | `이미지 없음` |
| 캡션에 이미지 표기 줄(라벨에 사진·이미지·비주얼·재킷·포스터·썸네일·아트워크·일러스트·그래픽 + `:`) | `이미지 표기 없음` |

캡션 파싱: 첫 줄 = 제목 / 해시태그만 있는 줄 = 해시태그 / 이미지 표기 줄 = 저작자 표기(원문 그대로) / `출처:`·`보도:` 줄과 URL만 있는 줄 = 출처 / 나머지 = 본문. 문장은 고치지 않는다.

이미지 표기 분류(`image_source_kind`): `cc`(Wikimedia·CC·퍼블릭 도메인) · `original`(MUSIC SPOT 자체 그래픽) · `official`(레이블·밴드 공식 자료·재킷·포스터·보도 사진, 섞이면 이쪽). 공식 자료만 내려야 할 때:

```sql
UPDATE public.news_posts SET is_published = false WHERE image_source_kind = 'official';
```
(운영 DB 쓰기 — 건수 보고 → 승인 → 백업 후. 스크립트는 `is_published`를 덮어쓰지 않으므로 다시 돌려도 내린 글은 그대로)

## 실패했을 때 확인할 것

1. **`skip_reasons`에 그 슬롯이 있다** → 사유대로 원본을 고친 뒤 다시(예: `status`를 `published`로, `post_url` 채우기, 캡션에 `사진:` 줄)
2. **`KeyError: 'SUPABASE_SERVICE_KEY'`** → 레포 루트에서 실행했는지, `.env.local`에 키가 있는지
3. **저장소 업로드 오류(413·mime)** → 버킷 제한은 WebP·장당 2MB. 변환 후 장당 200KB 목표라 보통 안 걸림. 원본 PNG가 깨졌는지 확인
4. **`duplicate key … slug`** → 같은 요약의 slug가 이미 있음. 스크립트가 다른 슬롯이면 `-<슬롯>`을 붙이는데, DB에서 그 slug의 `source_key`를 확인
5. **사이트에 안 보인다** → 1시간 기다리거나, `is_published`가 false인지 확인. 목록은 `published_on`(폴더 날짜) 최신순
6. **Pillow/WebP 오류** → `python3 -c "from PIL import features; print(features.check('webp'))"`가 True인지
7. **자동 반영이 안 됐다** → 로그 마지막 줄 확인. `Operation not permitted`면 시스템 설정 → 개인정보 보호 및 보안 → 파일 및 폴더 → MusicSpotNewsImport의 "데스크탑 폴더"를 켜거나 설치 스크립트를 다시 실행. `runs`가 안 늘면 `launchctl bootstrap`이 안 된 것 → 설치 스크립트 다시

## 하지 않는 것
카드뉴스 폴더의 원본 파일은 읽기만 한다(자동 반영도 같음).
