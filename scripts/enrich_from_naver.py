"""
Music Spot — Naver Local Search API로 전화번호/네이버플레이스URL 보강

사용법: python3 scripts/enrich_from_naver.py
"""

import os
import re
import time
import requests
from dotenv import load_dotenv
from supabase import create_client

load_dotenv(".env.local")

SUPABASE_URL = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]
NAVER_CLIENT_ID = os.environ["NAVER_CLIENT_ID"]
NAVER_CLIENT_SECRET = os.environ["NAVER_CLIENT_SECRET"]

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

NAVER_URL = "https://openapi.naver.com/v1/search/local.json"
HEADERS = {
    "X-Naver-Client-Id": NAVER_CLIENT_ID,
    "X-Naver-Client-Secret": NAVER_CLIENT_SECRET,
}


def search_naver(name, address):
    dong = ""
    m = re.search(r"(\S+[동구시면리])", address or "")
    if m:
        dong = m.group(1)
    short_name = name[:20] if len(name) > 20 else name
    query = f"{short_name} {dong}".strip()
    if not query:
        return None

    try:
        resp = requests.get(
            NAVER_URL,
            params={"query": query, "display": 1},
            headers=HEADERS,
            timeout=5,
        )
        items = resp.json().get("items", [])
        if not items:
            return None
        item = items[0]
        return {
            "phone": item.get("telephone") or None,
            "naver_place_url": item.get("link") or None,
        }
    except Exception as e:
        print(f"    [에러] {e}")
        return None


def fetch_all_targets():
    all_rows = []
    offset = 0
    while True:
        res = (
            supabase.table("studios")
            .select("id, name, address, phone, naver_place_url")
            .range(offset, offset + 999)
            .execute()
        )
        all_rows.extend(res.data)
        if len(res.data) < 1000:
            break
        offset += 1000
    return [s for s in all_rows if not s.get("phone") or not s.get("naver_place_url")]


def main():
    # API 테스트
    print("=== Naver API 테스트 ===")
    test = search_naver("연습실", "서울 마포구 서교동")
    if test is None:
        print("  API 실패. NAVER_CLIENT_ID/SECRET 확인.")
        return
    print(f"  테스트 성공: {test}\n")

    targets = fetch_all_targets()
    print(f"보강 대상: {len(targets)}건\n")

    phones_added = 0
    urls_added = 0
    failed = 0

    for i, s in enumerate(targets):
        r = search_naver(s["name"], s.get("address", ""))
        if not r:
            failed += 1
            time.sleep(0.2)
            continue

        update = {}
        if not s.get("phone") and r.get("phone"):
            update["phone"] = r["phone"]
        if not s.get("naver_place_url") and r.get("naver_place_url"):
            update["naver_place_url"] = r["naver_place_url"]

        if update:
            supabase.table("studios").update(update).eq("id", s["id"]).execute()
            if "phone" in update:
                phones_added += 1
            if "naver_place_url" in update:
                urls_added += 1

        time.sleep(0.2)
        if (i + 1) % 50 == 0:
            print(f"  진행: {i + 1}/{len(targets)} (전화: {phones_added}, URL: {urls_added}, 실패: {failed})")

    print(f"\n=== 완료 ===")
    print(f"전화번호 추가: {phones_added}건")
    print(f"네이버 URL 추가: {urls_added}건")
    print(f"실패: {failed}건")


if __name__ == "__main__":
    main()
