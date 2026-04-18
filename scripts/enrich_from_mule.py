"""
Music Spot — Mule 크롤링으로 사진/전화번호/장비태그 보강

사용법: python3 scripts/enrich_from_mule.py
"""

import os
import re
import time
import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from supabase import create_client

load_dotenv(".env.local")

supabase = create_client(
    os.environ["NEXT_PUBLIC_SUPABASE_URL"],
    os.environ["SUPABASE_SERVICE_KEY"],
)
UA = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36", "Referer": "https://mule.co.kr/"}


def scrape_mule(url):
    try:
        resp = requests.get(url, headers=UA, timeout=10)
        if resp.status_code != 200:
            return None
        soup = BeautifulSoup(resp.text, "html.parser")

        photos = []
        content = soup.select_one("#bo_v_con") or soup.select_one(".board-content") or soup.select_one(".view_content")
        if content:
            for img in content.find_all("img"):
                src = img.get("src") or ""
                if src and not src.endswith((".gif", ".svg")) and "icon" not in src:
                    if src.startswith("/"):
                        src = "https://mule.co.kr" + src
                    if src not in photos:
                        photos.append(src)
        photos = photos[:10]

        data = {}
        if photos:
            data["photos"] = photos

        body = soup.get_text()

        # 전화번호 추출
        phones = re.findall(r"01[016789][-.\s]?\d{3,4}[-.\s]?\d{4}", body)
        if phones:
            data["phone"] = re.sub(r"[-.\s]", "-", phones[0])

        return data if data else None
    except Exception as e:
        print(f"    [에러] {e}")
        return None


def fetch_targets():
    all_rows = []
    offset = 0
    while True:
        res = (
            supabase.table("studios")
            .select("id, name, source_url, photos, phone")
            .eq("source", "mule")
            .range(offset, offset + 999)
            .execute()
        )
        all_rows.extend(res.data)
        if len(res.data) < 1000:
            break
        offset += 1000
    return [s for s in all_rows if not s.get("photos") or len(s.get("photos", [])) == 0]


def main():
    targets = fetch_targets()
    print(f"Mule 사진 보강 대상: {len(targets)}건\n")

    if not targets:
        print("업데이트할 데이터가 없습니다.")
        return

    updated = 0
    failed = 0

    for i, s in enumerate(targets):
        url = s.get("source_url")
        if not url:
            failed += 1
            continue

        scraped = scrape_mule(url)
        if not scraped:
            failed += 1
            time.sleep(1.5)
            continue

        update = {}
        if scraped.get("photos"):
            update["photos"] = scraped["photos"]
        if not s.get("phone") and scraped.get("phone"):
            update["phone"] = scraped["phone"]

        if update:
            supabase.table("studios").update(update).eq("id", s["id"]).execute()
            updated += 1

        time.sleep(1.5)
        if (i + 1) % 20 == 0:
            print(f"  진행: {i + 1}/{len(targets)} (성공: {updated}, 실패: {failed})")

    print(f"\n=== 완료 ===")
    print(f"업데이트 성공: {updated}건")
    print(f"실패: {failed}건")


if __name__ == "__main__":
    main()
