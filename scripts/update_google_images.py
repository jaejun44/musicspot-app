"""
Music Spot — Google Places API로 연습실 이미지 수집

사용법:
  python3 scripts/update_google_images.py

사전 조건:
  - .env.local에 GOOGLE_PLACES_API_KEY 설정
  - Google Cloud Console에서 Places API (New) 활성화
"""

import os
import time
import httpx
from dotenv import load_dotenv
from supabase import create_client

load_dotenv(".env.local")

SUPABASE_URL = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]
GOOGLE_API_KEY = os.environ["GOOGLE_PLACES_API_KEY"]

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

SEARCH_URL = "https://places.googleapis.com/v1/places:searchText"
PHOTO_URL_TEMPLATE = "https://places.googleapis.com/v1/{name}/media?maxHeightPx=800&maxWidthPx=800&key={key}"


def similarity(a: str, b: str) -> float:
    """두 문자열의 단순 문자 겹침 비율 (0~1)"""
    if not a or not b:
        return 0.0
    a_clean = set(a.replace(" ", "").lower())
    b_clean = set(b.replace(" ", "").lower())
    if not a_clean or not b_clean:
        return 0.0
    intersection = a_clean & b_clean
    return len(intersection) / min(len(a_clean), len(b_clean))


def search_place(name: str, region: str, address: str = "") -> dict | None:
    """Google Places Text Search로 장소 검색"""
    short_name = name[:20] if len(name) > 30 else name
    location = region or (address[:10] if address else "")
    query = f"{short_name} {location}".strip()
    if not query:
        return None

    try:
        resp = httpx.post(
            SEARCH_URL,
            headers={
                "Content-Type": "application/json",
                "X-Goog-Api-Key": GOOGLE_API_KEY,
                "X-Goog-FieldMask": "places.id,places.displayName,places.photos",
            },
            json={
                "textQuery": query,
                "languageCode": "ko",
                "locationBias": {
                    "circle": {
                        "center": {"latitude": 37.5665, "longitude": 126.9780},
                        "radius": 50000.0,
                    }
                },
            },
            timeout=10,
        )

        if resp.status_code != 200:
            return None

        data = resp.json()
        places = data.get("places", [])
        if not places:
            return None

        place = places[0]
        display_name = place.get("displayName", {}).get("text", "")
        photos = place.get("photos", [])

        return {
            "display_name": display_name,
            "photos": photos,
        }

    except Exception as e:
        print(f"    [검색 에러] {e}")
        return None


def get_photo_urls(photos: list, max_count: int = 3) -> list[str]:
    """photo resource name → 실제 이미지 URL 생성"""
    urls = []
    for photo in photos[:max_count]:
        photo_name = photo.get("name")
        if not photo_name:
            continue
        url = PHOTO_URL_TEMPLATE.format(name=photo_name, key=GOOGLE_API_KEY)
        urls.append(url)
    return urls


def fetch_no_photos():
    """photos가 비어있는 레코드 전체 조회 (is_published 무관)"""
    all_rows = []
    offset = 0
    batch = 1000
    while True:
        res = (
            supabase.table("studios")
            .select("id, name, region, address, photos")
            .or_("photos.is.null,photos.eq.{}")
            .range(offset, offset + batch - 1)
            .execute()
        )
        rows = res.data
        all_rows.extend(rows)
        if len(rows) < batch:
            break
        offset += batch
    return all_rows


def test_api() -> bool:
    """API 연결 테스트"""
    try:
        resp = httpx.post(
            SEARCH_URL,
            headers={
                "Content-Type": "application/json",
                "X-Goog-Api-Key": GOOGLE_API_KEY,
                "X-Goog-FieldMask": "places.id,places.displayName",
            },
            json={
                "textQuery": "서울 연습실",
                "languageCode": "ko",
            },
            timeout=10,
        )
        if resp.status_code == 200 and resp.json().get("places"):
            return True
        print(f"  API 응답: {resp.status_code} {resp.text[:200]}")
    except Exception as e:
        print(f"  API 연결 실패: {e}")
    return False


def main():
    print("=== Google Places API 테스트 ===")
    if not test_api():
        print("\nGoogle Places API가 작동하지 않습니다.")
        print("→ Google Cloud Console에서 Places API (New) 활성화 확인")
        print("→ .env.local의 GOOGLE_PLACES_API_KEY 확인")
        return
    print("  테스트 성공\n")

    print("=== 이미지 미입력 데이터 조회 ===")
    rows = fetch_no_photos()
    print(f"  대상: {len(rows)}건\n")

    if not rows:
        print("업데이트할 데이터가 없습니다.")
        return

    success = 0
    failed = 0
    skipped = 0

    print(f"=== 처리 시작 ({len(rows)}건) ===")
    for i, row in enumerate(rows):
        name = row["name"] or ""
        region = row.get("region") or ""
        address = row.get("address") or ""

        # Google Places 검색
        result = search_place(name, region, address)

        if result is None:
            failed += 1
        elif not result["photos"]:
            failed += 1
        else:
            # 이름 유사도 체크 (30% 이상)
            sim = similarity(name, result["display_name"])
            if sim < 0.3:
                skipped += 1
            else:
                # 사진 URL 생성
                photo_urls = get_photo_urls(result["photos"])
                if photo_urls:
                    try:
                        supabase.table("studios").update(
                            {"photos": photo_urls}
                        ).eq("id", row["id"]).execute()
                        success += 1
                    except Exception as e:
                        print(f"    [DB 에러] {name[:20]}: {e}")
                        failed += 1
                else:
                    failed += 1

        # Rate limit
        time.sleep(0.5)

        # 진행 상황
        if (i + 1) % 50 == 0:
            print(f"  진행: {i + 1}/{len(rows)} (성공: {success}, 실패: {failed}, 건너뜀: {skipped})")

    # 통계
    print(f"\n=== 완료 ===")
    print(f"총 처리: {len(rows)}건")
    print(f"이미지 추가 성공: {success}건")
    print(f"실패 (장소 없음/사진 없음): {failed}건")
    print(f"건너뜀 (이름 불일치): {skipped}건")


if __name__ == "__main__":
    main()
