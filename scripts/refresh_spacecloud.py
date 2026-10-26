"""
Music Spot — spacecloud 연습실 최신화 (사진·요금·폐업) (2026-10-26)

이미 가진 source_url(www.spacecloud.kr/space/<id>, robots.txt 허용 경로)의 공개 페이지를
한 곳씩 천천히 열어 다음만 고친다. 새 연습실을 찾지는 않는다.
  - photos     : 공간 갤러리 사진 주소(최대 10장). 사진은 복사하지 않고 원본 주소 그대로
  - price_info : 상품별 최저 '시간당 N원~ / 패키지 N원~' (기존 수집 형식과 같음)
                 + price_per_hour·room_type을 같은 규칙(studio_rules)으로
  - 페이지 404 : 문 닫은 것으로 보고 is_published=false
네이버·카카오 링크, 주소·좌표, 이름 등 다른 칸은 건드리지 않는다.
검색(/search)·API(api.spacecloud.kr)는 robots.txt가 막아 두어 쓰지 않는다.

배경: 예전 수집기 갤러리 선택자가 지도 타일만 긁어 모든 곳이 사진 1장뿐이었다(2026-10-26 사진 보강).

사용법:
  python3 scripts/refresh_spacecloud.py --sample 20               # 미리보기(표본), DB 안 건드림
  python3 scripts/refresh_spacecloud.py --plan <경로>             # 미리보기(전체) + 바뀔 내용 저장
  python3 scripts/refresh_spacecloud.py --apply --plan <경로> --backup <경로>   # 저장한 내용 그대로 반영
"""

import argparse
import json
import os
import random
import re
import subprocess
import sys
import time
from datetime import datetime, timezone

from dotenv import load_dotenv
from supabase import create_client

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from studio_rules import classify_room_type, parse_hourly_price  # noqa: E402
from update_quality_score import calc_score  # noqa: E402  (같은 점수 규칙 재사용)

load_dotenv(".env.local")
supabase = create_client(os.environ["NEXT_PUBLIC_SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"])

FIELDS = "id, name, source, source_url, photos, is_published, data_quality_score, price_info, price_per_hour, room_type, phone, naver_place_url, kakao_channel, address, lat, lng"
BACKUP_KEYS = ("photos", "price_info", "price_per_hour", "room_type", "is_published", "data_quality_score", "updated_at")
MAX_PHOTOS = 10
DELAY_SEC = 1.5  # 상대 서버 부담을 줄이려고 한 곳씩, 간격을 두고
SPACE_URL_RE = re.compile(r"^https://www\.spacecloud\.kr/space/\d+$")
# 페이지 데이터는 Next.js 조각(self.__next_f.push([1,"..."]))에 JS 문자열로 들어 있다
CHUNK_RE = re.compile(r'self\.__next_f\.push\(\[1,"((?:[^"\\]|\\.)*)"\]\)')
DETAIL_KEY = '"detail":{"products"'


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


def fetch_page(url: str) -> tuple[str, str]:
    """(HTTP 상태, 본문). 파이썬 SSL 인증서 설정과 무관하게 시스템 curl로."""
    out = subprocess.run(
        ["curl", "-s", "-m", "20", "-w", "\n%{http_code}",
         "-A", "Mozilla/5.0 (compatible; MusicSpotBot/1.0; +https://musicspotfest.com)", url],
        capture_output=True, text=True,
    )
    body, _, status = out.stdout.rpartition("\n")
    return status or "000", body


def parse_detail(html: str) -> dict | None:
    payload = "".join(json.loads(f'"{c}"') for c in CHUNK_RE.findall(html))
    i = payload.find(DETAIL_KEY)
    if i < 0:
        return None
    detail, _ = json.JSONDecoder().raw_decode(payload, i + len('"detail":'))
    return detail


def photo_key(url: str) -> str:
    return url.split("?")[0]


def gallery_photos(detail: dict) -> list[str]:
    seen, photos = set(), []
    for img in detail.get("images") or []:
        url = img.get("image_url") if isinstance(img, dict) else img
        if isinstance(url, str) and url.startswith("https://") and photo_key(url) not in seen:
            seen.add(photo_key(url))
            photos.append(url)
    return photos[:MAX_PHOTOS]


def price_text(detail: dict) -> str | None:
    """상품별 최저가 → 기존 수집 형식 '시간당 N원~ / 패키지 N원~'."""
    lowest: dict[str, int] = {}
    for product in detail.get("products") or []:
        for rt in product.get("reservation_types") or []:
            code, price = rt.get("rsv_tp_cd"), rt.get("price")
            if code in ("TIME", "PKG") and isinstance(price, int) and price > 0:
                lowest[code] = min(price, lowest.get(code, price))
    parts = []
    if "TIME" in lowest:
        parts.append(f"시간당 {lowest['TIME']:,}원~")
    if "PKG" in lowest:
        parts.append(f"패키지 {lowest['PKG']:,}원~")
    return " / ".join(parts) or None


def row_changes(row: dict, detail: dict) -> dict:
    upd = {}
    photos = gallery_photos(detail)
    if photos and [photo_key(u) for u in photos] != [photo_key(u) for u in row.get("photos") or []]:
        upd["photos"] = photos
    price = price_text(detail)
    if price and price != row.get("price_info"):
        upd["price_info"] = price
        upd["price_per_hour"] = parse_hourly_price(price)
        upd["room_type"] = classify_room_type("spacecloud", price)
    return upd


def plan_changes(rows: list[dict]) -> tuple[dict[str, dict], dict[str, int]]:
    changes: dict[str, dict] = {}
    stats = {"checked": 0, "fetch_fail": 0, "parse_fail": 0, "closed": 0, "bad_url": 0}
    for n, r in enumerate(rows, 1):
        url = r.get("source_url") or ""
        if not SPACE_URL_RE.match(url):
            stats["bad_url"] += 1
            continue
        status, html = fetch_page(url)
        stats["checked"] += 1
        if status in ("404", "410"):
            stats["closed"] += 1
            changes[r["id"]] = {"is_published": False}
        elif status != "200":
            stats["fetch_fail"] += 1  # 일시 오류일 수 있어 건드리지 않음
        else:
            try:
                detail = parse_detail(html)
            except (ValueError, KeyError) as e:
                print(f"  [파싱 실패] {url}: {e}")
                detail = None
            if detail is None:
                stats["parse_fail"] += 1
            else:
                upd = row_changes(r, detail)
                if upd:
                    changes[r["id"]] = upd
        if n % 50 == 0:
            print(f"  {n}/{len(rows)} 확인, 바뀔 곳 {len(changes)}")
        time.sleep(DELAY_SEC)
    return changes, stats


def summarize(rows: list[dict], changes: dict[str, dict], stats: dict[str, int]) -> None:
    by_id = {r["id"]: r for r in rows}
    photo = [i for i, c in changes.items() if "photos" in c]
    price = [i for i, c in changes.items() if "price_info" in c]
    closed = [i for i, c in changes.items() if c.get("is_published") is False]
    print("\n=== 바뀔 내용 ===")
    print(f"  확인 {stats['checked']}곳 · 받기 실패 {stats['fetch_fail']} · 해석 실패 {stats['parse_fail']} · 주소 형식 다름 {stats['bad_url']}")
    print(f"  사진 바뀜: {len(photo)}곳")
    grew = [len(changes[i]["photos"]) - len(by_id[i].get("photos") or []) for i in photo]
    if grew:
        print(f"      늘어남 {sum(g > 0 for g in grew)} · 같거나 줄어듦(사장님이 바꾼 것) {sum(g <= 0 for g in grew)}")
    print(f"  요금 문구 바뀜: {len(price)}곳")
    for i in price[:5]:
        print(f"      {by_id[i]['name'][:24]}: {by_id[i].get('price_info')!r} → {changes[i]['price_info']!r}")
    print(f"  페이지 없음(404) → 비공개: {len(closed)}곳")
    for i in closed[:10]:
        print(f"      - {by_id[i]['name'][:40]}")


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
    print(f"[*] 공개 spacecloud {len(rows)}곳")
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
    ids = list(changes)
    old = {}
    for k in range(0, len(ids), 200):  # updated_at까지 이전 값 그대로 백업
        res = supabase.table("studios").select("id, " + ", ".join(BACKUP_KEYS)).in_("id", ids[k:k + 200]).execute()
        old.update({r["id"]: {key: r.get(key) for key in BACKUP_KEYS} for r in res.data})
    with open(args.backup, "w", encoding="utf-8") as f:
        json.dump(old, f, ensure_ascii=False)
    print(f"\n[*] 백업: {args.backup} ({len(old)}행)")

    now = datetime.now(timezone.utc).isoformat()
    failed = 0
    for sid, upd in changes.items():
        upd = {**upd, "updated_at": now, "data_quality_score": calc_score({**by_id[sid], **upd})}
        try:
            supabase.table("studios").update(upd).eq("id", sid).execute()
        except Exception as e:  # 한 행 실패로 전체를 멈추지 않되 끝에 건수로 알린다
            failed += 1
            print(f"  [실패] {sid}: {e}")
    print(f"[*] 완료: {len(changes) - failed}행 갱신, 실패 {failed}")


if __name__ == "__main__":
    main()
