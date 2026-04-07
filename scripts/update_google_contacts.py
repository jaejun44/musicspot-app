"""
Music Spot — Google Places API로 연락처 정보 보완

사용법:
  python3 scripts/update_google_contacts.py
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
FIELD_MASK = "places.id,places.displayName,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri,places.googleMapsUri"


def similarity(a: str, b: str) -> float:
    if not a or not b:
        return 0.0
    a_clean = set(a.replace(" ", "").lower())
    b_clean = set(b.replace(" ", "").lower())
    if not a_clean or not b_clean:
        return 0.0
    return len(a_clean & b_clean) / min(len(a_clean), len(b_clean))


def search_place(name: str, region: str, address: str = "") -> dict | None:
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
                "X-Goog-FieldMask": FIELD_MASK,
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

        places = resp.json().get("places", [])
        if not places:
            return None

        p = places[0]
        return {
            "display_name": p.get("displayName", {}).get("text", ""),
            "phone": p.get("nationalPhoneNumber") or p.get("internationalPhoneNumber"),
            "website": p.get("websiteUri"),
            "maps_url": p.get("googleMapsUri"),
        }
    except Exception as e:
        print(f"    [검색 에러] {e}")
        return None


def fetch_no_phone():
    all_rows = []
    offset = 0
    while True:
        res = (
            supabase.table("studios")
            .select("id, name, region, address, phone, naver_place_url, notes")
            .or_("phone.is.null,phone.eq.")
            .range(offset, offset + 999)
            .execute()
        )
        all_rows.extend(res.data)
        if len(res.data) < 1000:
            break
        offset += 1000
    return all_rows


def main():
    print("=== Google Places API 테스트 ===")
    try:
        resp = httpx.post(
            SEARCH_URL,
            headers={
                "Content-Type": "application/json",
                "X-Goog-Api-Key": GOOGLE_API_KEY,
                "X-Goog-FieldMask": "places.id,places.displayName",
            },
            json={"textQuery": "서울 연습실", "languageCode": "ko"},
            timeout=10,
        )
        if resp.status_code != 200 or not resp.json().get("places"):
            print(f"  API 실패: {resp.status_code}")
            return
    except Exception as e:
        print(f"  API 연결 실패: {e}")
        return
    print("  테스트 성공\n")

    print("=== 전화번호 미입력 데이터 조회 ===")
    rows = fetch_no_phone()
    print(f"  대상: {len(rows)}건\n")

    if not rows:
        print("업데이트할 데이터가 없습니다.")
        return

    phones_added = 0
    websites_added = 0
    skipped = 0
    failed = 0

    print(f"=== 처리 시작 ({len(rows)}건) ===")
    for i, row in enumerate(rows):
        name = row["name"] or ""
        region = row.get("region") or ""
        address = row.get("address") or ""

        result = search_place(name, region, address)

        if result is None:
            failed += 1
        else:
            sim = similarity(name, result["display_name"])
            if sim < 0.3:
                skipped += 1
            else:
                update = {}

                # phone (없을 때만)
                if result.get("phone") and not row.get("phone"):
                    update["phone"] = result["phone"]

                # website → naver_place_url (없을 때만)
                if result.get("website") and not row.get("naver_place_url"):
                    update["naver_place_url"] = result["website"]

                # Google Maps URL → notes에 append
                if result.get("maps_url"):
                    existing_notes = row.get("notes") or ""
                    if "google" not in existing_notes.lower():
                        maps_note = f"Google Maps: {result['maps_url']}"
                        update["notes"] = (
                            f"{existing_notes}\n{maps_note}".strip()
                            if existing_notes
                            else maps_note
                        )

                if update:
                    try:
                        supabase.table("studios").update(update).eq("id", row["id"]).execute()
                        if "phone" in update:
                            phones_added += 1
                        if "naver_place_url" in update:
                            websites_added += 1
                    except Exception as e:
                        print(f"    [DB 에러] {name[:20]}: {e}")
                        failed += 1

        time.sleep(0.5)

        if (i + 1) % 50 == 0:
            print(f"  진행: {i + 1}/{len(rows)} (전화: {phones_added}, 웹사이트: {websites_added}, 건너뜀: {skipped}, 실패: {failed})")

    print(f"\n=== 완료 ===")
    print(f"총 처리: {len(rows)}건")
    print(f"전화번호 추가: {phones_added}건")
    print(f"웹사이트 추가: {websites_added}건")
    print(f"건너뜀 (이름 불일치): {skipped}건")
    print(f"실패: {failed}건")


if __name__ == "__main__":
    main()
