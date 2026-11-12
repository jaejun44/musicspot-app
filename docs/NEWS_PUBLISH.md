# 밴드씬 뉴스 반영 — 인스타 카드뉴스 → /news

인스타에 카드뉴스를 올린 뒤 그 슬롯을 사이트 `/news`에 올리는 방법. 원본 폴더는 읽기만 한다(수정·이동·삭제 없음).

- 원본: `~/Desktop/musicSpot_cardnews/_active/daily/<YYYY-MM-DD>/slot-*/`
- 스크립트: `scripts/import_cardnews.py` (파싱 `scripts/cardnews_parse.py`, 테스트 `tests/cardnews-parse.cjs`)
- 저장: DB `news_posts`(`supabase/17_news.sql`), 이미지 Storage 공개 버킷 `news`(`<날짜>/<슬롯>/01.webp`)

## 매일: 인스타에 올린 뒤 1줄

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

## 하지 않는 것
카드뉴스 폴더의 문서·작업 흐름은 이 스크립트가 바꾸지 않는다. 자동으로 돌리고 싶으면(예: 카드뉴스 게시 작업 마지막 단계에 위 1줄 추가) 따로 정한다.
