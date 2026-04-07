"""
Music Spot — 네이버 플레이스 이미지 크롤링 (MVP 내부 검증용)

사용법:
  pip3 install playwright
  python3 -m playwright install chromium
  python3 scripts/crawl_naver_images.py

주의: MVP 내부 검증 목적. 추후 Google Places API로 교체 예정.
"""

import os
import re
import time
import random
from urllib.parse import quote
from dotenv import load_dotenv
from supabase import create_client

load_dotenv(".env.local")

SUPABASE_URL = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

USER_AGENTS = [
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
]


def fetch_no_photos():
    """photos가 비어있는 레코드 전체 조회 (1000건 제한 우회)"""
    all_rows = []
    offset = 0
    batch = 1000
    while True:
        res = (
            supabase.table("studios")
            .select("id, name, address, region")
            .or_("photos.is.null,photos.eq.{}")
            .eq("is_published", True)
            .range(offset, offset + batch - 1)
            .execute()
        )
        rows = res.data
        all_rows.extend(rows)
        if len(rows) < batch:
            break
        offset += batch
    return all_rows


def extract_images(page, query: str) -> list[str]:
    """네이버 검색 결과에서 플레이스(ldb-phinf) 이미지 URL만 추출"""
    url = f"https://search.naver.com/search.naver?query={quote(query)}"
    page.goto(url, wait_until="domcontentloaded", timeout=15000)
    time.sleep(1.5)

    images = []

    try:
        all_imgs = page.query_selector_all("img")
        for el in all_imgs:
            src = el.get_attribute("src") or ""
            if "ldb-phinf" in src and src.startswith("http"):
                cleaned = re.sub(r"type=\w+", "type=f640_640", src)
                if cleaned not in images:
                    images.append(cleaned)
            if len(images) >= 3:
                break
    except Exception:
        pass

    return images


def main():
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("playwright가 설치되어 있지 않습니다.")
        print("  pip3 install playwright")
        print("  python3 -m playwright install chromium")
        return

    print("=== 이미지 미입력 데이터 조회 ===")
    rows = fetch_no_photos()
    print(f"  대상: {len(rows)}건\n")

    if not rows:
        print("업데이트할 데이터가 없습니다.")
        return

    success = 0
    failed = 0

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            user_agent=random.choice(USER_AGENTS),
            viewport={"width": 1280, "height": 800},
            locale="ko-KR",
        )
        page = context.new_page()

        print(f"=== 크롤링 시작 ({len(rows)}건) ===")
        for i, row in enumerate(rows):
            name = row["name"] or ""
            region = row.get("region") or ""

            # 검색어 구성: 이름이 너무 길면 앞 20자만
            short_name = name[:20] if len(name) > 20 else name
            query = f"{short_name} 연습실"

            try:
                # UA 로테이션 (50건마다)
                if i > 0 and i % 50 == 0:
                    context.close()
                    context = browser.new_context(
                        user_agent=random.choice(USER_AGENTS),
                        viewport={"width": 1280, "height": 800},
                        locale="ko-KR",
                    )
                    page = context.new_page()

                images = extract_images(page, query)

                if images:
                    supabase.table("studios").update(
                        {"photos": images}
                    ).eq("id", row["id"]).execute()
                    success += 1
                else:
                    failed += 1

            except Exception as e:
                failed += 1
                if "timeout" not in str(e).lower():
                    print(f"    [에러] {short_name}: {e}")

            # Rate limit
            time.sleep(random.uniform(2, 3))

            # 진행 상황
            if (i + 1) % 50 == 0:
                print(f"  진행: {i + 1}/{len(rows)} (성공: {success}, 실패: {failed})")

            # 100건마다 긴 대기
            if (i + 1) % 100 == 0:
                print(f"  --- 100건 처리 완료, 10초 대기 ---")
                time.sleep(10)

        browser.close()

    # 통계
    print(f"\n=== 완료 ===")
    print(f"총 처리: {len(rows)}건")
    print(f"이미지 추가 성공: {success}건")
    print(f"실패 (플레이스 없음): {failed}건")


if __name__ == "__main__":
    main()
