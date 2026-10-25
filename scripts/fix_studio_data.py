"""
Music Spot — studios 데이터 품질 일괄 수정 (2026-10-25)

1) price_per_hour: 비어 있으면 원문 '시간당 N원'에서 채움 (앱의 가격순 정렬·가격 필터가 이 칸을 씀)
2) room_type: 뮬 데이터를 studio_rules.classify_room_type 규칙으로 재분류
3) photos: 뮬 사진을 실제로 받아 보고 지워진(403/404/410) URL을 뺌.
   하나도 안 남으면 is_published=false (수집 기준 '사진+위치+가격' 위반)
바뀐 행은 data_quality_score도 다시 계산.

사용법:
  python3 scripts/fix_studio_data.py                    # 미리보기(바뀔 건수·예시만, DB 안 건드림)
  python3 scripts/fix_studio_data.py --apply --backup /tmp/studios_backup.json
"""

import argparse
import json
import os
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor

from dotenv import load_dotenv
from supabase import create_client

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from studio_rules import classify_room_type, parse_hourly_price  # noqa: E402
from update_quality_score import calc_score  # noqa: E402  (같은 점수 규칙 재사용)

load_dotenv(".env.local")
supabase = create_client(os.environ["NEXT_PUBLIC_SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"])

FIELDS = "id, name, source, price_info, price_per_hour, room_type, photos, is_published, data_quality_score, phone, naver_place_url, kakao_channel, address, lat, lng"
DEAD_STATUS = {"403", "404", "410"}  # 시간 초과(000)·5xx는 일시 오류일 수 있어 지우지 않음


def fetch_all() -> list[dict]:
    rows, offset = [], 0
    while True:
        res = supabase.table("studios").select(FIELDS).range(offset, offset + 999).execute()
        rows.extend(res.data)
        if len(res.data) < 1000:
            break
        offset += 1000
    return rows


def http_status(url: str) -> str:
    # 파이썬 SSL 인증서 설정과 무관하게 시스템 curl로 확인
    out = subprocess.run(
        ["curl", "-s", "-o", "/dev/null", "-w", "%{http_code}", "-m", "10", url],
        capture_output=True, text=True,
    )
    return out.stdout.strip() or "000"


def plan_changes(rows: list[dict]) -> dict[str, dict]:
    changes: dict[str, dict] = {}

    for r in rows:
        upd = {}
        price = parse_hourly_price(r.get("price_info"))
        if price and not r.get("price_per_hour"):
            upd["price_per_hour"] = price
        if r.get("source") == "mule":
            rt = classify_room_type(r.get("source"), r.get("price_info"))
            if rt != r.get("room_type"):
                upd["room_type"] = rt
        if upd:
            changes[r["id"]] = upd

    # 사진: 공개된 뮬만 (스페이스클라우드는 표본 60/60 정상)
    targets = [r for r in rows if r.get("source") == "mule" and r.get("is_published") and r.get("photos")]
    urls = sorted({u for r in targets for u in r["photos"]})
    print(f"[*] 사진 확인: 뮬 {len(targets)}곳, URL {len(urls)}개")
    with ThreadPoolExecutor(max_workers=8) as pool:
        status = dict(zip(urls, pool.map(http_status, urls)))
    for r in targets:
        alive = [u for u in r["photos"] if status[u] not in DEAD_STATUS]
        if len(alive) != len(r["photos"]):
            upd = changes.setdefault(r["id"], {})
            upd["photos"] = alive
            if not alive:
                upd["is_published"] = False
    return changes


def summarize(rows: list[dict], changes: dict[str, dict]) -> None:
    by_id = {r["id"]: r for r in rows}
    price = [i for i, c in changes.items() if "price_per_hour" in c]
    rtype = [i for i, c in changes.items() if "room_type" in c]
    photo = [i for i, c in changes.items() if "photos" in c]
    unpub = [i for i, c in changes.items() if c.get("is_published") is False]
    print(f"\n=== 바뀔 내용 (총 {len(changes)}행) ===")
    print(f"  price_per_hour 채움: {len(price)}")
    print(f"  room_type 재분류(뮬): {len(rtype)}")
    moves: dict[str, int] = {}
    for i in rtype:
        k = f"{by_id[i].get('room_type')} → {changes[i]['room_type']}"
        moves[k] = moves.get(k, 0) + 1
    for k, v in sorted(moves.items(), key=lambda x: -x[1]):
        print(f"      {k}: {v}")
    removed = sum(len(by_id[i]["photos"]) - len(changes[i]["photos"]) for i in photo)
    print(f"  죽은 사진 제거: {len(photo)}곳 / URL {removed}개")
    print(f"  비공개 전환(사진 0장): {len(unpub)}")
    for i in unpub[:5]:
        print(f"      - {by_id[i]['name'][:50]}")
    for i in price[:3]:
        print(f"  예) {str(by_id[i].get('price_info'))[:30]!r} → {changes[i]['price_per_hour']}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true", help="실제로 DB에 쓴다 (없으면 미리보기)")
    ap.add_argument("--backup", type=str, help="--apply 시 필수. 바뀌는 행의 이전 값을 JSON으로 저장")
    args = ap.parse_args()
    if args.apply and not args.backup:
        sys.exit("[에러] --apply 에는 --backup 경로가 필요합니다")

    rows = fetch_all()
    print(f"[*] studios {len(rows)}행")
    changes = plan_changes(rows)
    summarize(rows, changes)

    if not args.apply:
        print("\n(미리보기만 했습니다. 실행하려면 --apply --backup <경로>)")
        return

    by_id = {r["id"]: r for r in rows}
    backup = {i: {k: by_id[i].get(k) for k in ("price_per_hour", "room_type", "photos", "is_published", "data_quality_score")} for i in changes}
    with open(args.backup, "w", encoding="utf-8") as f:
        json.dump(backup, f, ensure_ascii=False)
    print(f"\n[*] 백업: {args.backup} ({len(backup)}행)")

    failed = 0
    for n, (sid, upd) in enumerate(changes.items(), 1):
        merged = {**by_id[sid], **upd}
        upd = {**upd, "data_quality_score": calc_score(merged)}
        try:
            supabase.table("studios").update(upd).eq("id", sid).execute()
        except Exception as e:  # 한 행 실패로 전체를 멈추지 않되 끝에 건수로 알린다
            failed += 1
            print(f"  [실패] {sid}: {e}")
        if n % 200 == 0:
            print(f"  {n}/{len(changes)}")
    print(f"[*] 완료: {len(changes) - failed}행 갱신, 실패 {failed}")


if __name__ == "__main__":
    main()
