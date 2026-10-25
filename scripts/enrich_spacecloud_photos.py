"""
Music Spot — 스페이스클라우드 연습실 사진 여러 장 채우기 (2026-10-26)

배경: 수집기(crawling/spacecloud_scraper.py)의 상세 갤러리 선택자가 지도 타일만 긁어 와
      공개 877곳이 모두 대표 사진 1장뿐이었다.
방법: 이미 가진 source_url(www.spacecloud.kr/space/<id>, robots.txt 허용 경로)의 공개 페이지를
      한 곳씩 천천히 열어, 공간 갤러리 `images` 배열의 사진 주소만 읽는다.
      사진 파일은 내려받거나 옮기지 않는다(지금처럼 원본 주소를 그대로 보여 줌).
      검색(/search)·API(api.spacecloud.kr)는 robots.txt가 막아 두어 쓰지 않는다.

사용법:
  python3 scripts/enrich_spacecloud_photos.py --sample 20         # 미리보기(표본), DB 안 건드림
  python3 scripts/enrich_spacecloud_photos.py --plan <경로>       # 미리보기(전체) + 바뀔 내용 저장
  python3 scripts/enrich_spacecloud_photos.py --apply --plan <경로> --backup <경로>   # 저장한 내용 그대로 반영
"""

import argparse
import json
import os
import random
import re
import subprocess
import sys
import time

from dotenv import load_dotenv
from supabase import create_client

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from update_quality_score import calc_score  # noqa: E402  (같은 점수 규칙 재사용)

load_dotenv(".env.local")
supabase = create_client(os.environ["NEXT_PUBLIC_SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"])

FIELDS = "id, name, source, source_url, photos, is_published, data_quality_score, price_info, room_type, phone, naver_place_url, kakao_channel, address, lat, lng"
MAX_PHOTOS = 10
DELAY_SEC = 1.5  # 상대 서버 부담을 줄이려고 한 곳씩, 간격을 두고
SPACE_URL_RE = re.compile(r"^https://www\.spacecloud\.kr/space/\d+$")
# 페이지에 들어 있는 JSON은 이스케이프된 문자열: \"images\":[ ... ]
IMAGES_RE = re.compile(r'\\"images\\":\[(.*?)\]', re.S)
PHOTO_RE = re.compile(r'https://[a-z0-9]+\.edge\.naverncp\.com/service/(?!thumb_)[^"\\]+?\.(?:jpe?g|png|webp)(?:\?[^"\\]*)?', re.I)


def fetch_all() -> list[dict]:
    rows, offset = [], 0
    while True:
        res = (supabase.table("studios").select(FIELDS)
               .eq("source", "spacecloud").eq("is_published", True)
               .range(offset, offset + 999).execute())
        rows.extend(res.data)
        if len(res.data) < 1000:
            break
        offset += 1000
    return rows


def fetch_page(url: str) -> str:
    # 파이썬 SSL 인증서 설정과 무관하게 시스템 curl로
    out = subprocess.run(
        ["curl", "-s", "-m", "20", "-A", "Mozilla/5.0 (compatible; MusicSpotBot/1.0; +https://musicspotfest.com)", url],
        capture_output=True, text=True,
    )
    return out.stdout


def photo_key(url: str) -> str:
    return url.split("?")[0]


def gallery_photos(html: str, main_photo: str) -> list[str]:
    """대표 사진이 들어 있는 `images` 배열 = 공간 갤러리. 대표 사진을 맨 앞에 둔다."""
    html = html.replace("\\u0026", "&")
    main_key = photo_key(main_photo)
    for block in IMAGES_RE.findall(html):
        urls = PHOTO_RE.findall(block)
        if main_key not in {photo_key(u) for u in urls}:
            continue
        ordered, seen = [main_photo], {main_key}
        for u in urls:
            if photo_key(u) not in seen:
                seen.add(photo_key(u))
                ordered.append(u)
        return ordered[:MAX_PHOTOS]
    return []


def plan_changes(rows: list[dict]) -> tuple[dict[str, list[str]], dict[str, int]]:
    changes: dict[str, list[str]] = {}
    stats = {"checked": 0, "no_gallery": 0, "bad_url": 0, "fetch_fail": 0}
    for n, r in enumerate(rows, 1):
        url, photos = r.get("source_url") or "", r.get("photos") or []
        if not SPACE_URL_RE.match(url) or not photos:
            stats["bad_url"] += 1
            continue
        html = fetch_page(url)
        stats["checked"] += 1
        if not html:
            stats["fetch_fail"] += 1
        else:
            found = gallery_photos(html, photos[0])
            if not found:
                stats["no_gallery"] += 1
            elif len(found) > len(photos):
                changes[r["id"]] = found
        if n % 50 == 0:
            print(f"  {n}/{len(rows)} 확인, 늘어날 곳 {len(changes)}")
        time.sleep(DELAY_SEC)
    return changes, stats


def summarize(rows: list[dict], changes: dict[str, list[str]], stats: dict[str, int]) -> None:
    by_id = {r["id"]: r for r in rows}
    counts = [len(v) for v in changes.values()]
    print(f"\n=== 바뀔 내용 ===")
    print(f"  확인 {stats['checked']}곳 · 실패 {stats['fetch_fail']} · 갤러리 못 찾음 {stats['no_gallery']} · 주소 형식 다름 {stats['bad_url']}")
    print(f"  사진이 늘어나는 곳: {len(changes)}")
    if counts:
        dist = {k: counts.count(k) for k in sorted(set(counts))}
        print(f"  늘어난 뒤 장수 분포: {dist}  (평균 {sum(counts) / len(counts):.1f}장)")
    for i in list(changes)[:3]:
        print(f"  예) {by_id[i]['name'][:30]}: {len(by_id[i]['photos'])} → {len(changes[i])}장")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--sample", type=int, help="미리보기용 무작위 표본 수")
    ap.add_argument("--apply", action="store_true", help="실제로 DB에 쓴다 (없으면 미리보기)")
    ap.add_argument("--backup", type=str, help="--apply 시 필수. 바뀌는 행의 이전 값을 JSON으로 저장")
    ap.add_argument("--plan", type=str, help="미리보기: 바뀔 내용을 저장 / --apply: 저장한 내용을 반영(페이지 다시 안 엶)")
    args = ap.parse_args()
    if args.apply and not args.backup:
        sys.exit("[에러] --apply 에는 --backup 경로가 필요합니다")
    if args.apply and args.sample:
        sys.exit("[에러] --sample 은 미리보기 전용입니다")

    rows = fetch_all()
    print(f"[*] 공개 스페이스클라우드 {len(rows)}곳")
    if args.apply and args.plan:
        with open(args.plan, encoding="utf-8") as f:
            changes = json.load(f)
        known = {r["id"] for r in rows}
        changes = {i: v for i, v in changes.items() if i in known}  # 그사이 비공개된 곳은 건너뜀
        print(f"[*] 저장한 계획 {len(changes)}행 반영")
    else:
        if args.sample:
            rows = random.sample(rows, min(args.sample, len(rows)))
            print(f"[*] 표본 {len(rows)}곳만 확인")
        changes, stats = plan_changes(rows)
        summarize(rows, changes, stats)
        if args.plan and not args.apply:
            with open(args.plan, "w", encoding="utf-8") as f:
                json.dump(changes, f, ensure_ascii=False)
            print(f"[*] 계획 저장: {args.plan}")

    if not args.apply:
        print("\n(미리보기만 했습니다. 실행하려면 --apply --plan <경로> --backup <경로>)")
        return

    by_id = {r["id"]: r for r in rows}
    backup = {i: {k: by_id[i].get(k) for k in ("photos", "data_quality_score")} for i in changes}
    with open(args.backup, "w", encoding="utf-8") as f:
        json.dump(backup, f, ensure_ascii=False)
    print(f"\n[*] 백업: {args.backup} ({len(backup)}행)")

    failed = 0
    for sid, photos in changes.items():
        upd = {"photos": photos, "data_quality_score": calc_score({**by_id[sid], "photos": photos})}
        try:
            supabase.table("studios").update(upd).eq("id", sid).execute()
        except Exception as e:  # 한 행 실패로 전체를 멈추지 않되 끝에 건수로 알린다
            failed += 1
            print(f"  [실패] {sid}: {e}")
    print(f"[*] 완료: {len(changes) - failed}행 갱신, 실패 {failed}")


if __name__ == "__main__":
    main()
