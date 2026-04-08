"""
Music Spot — 카카오 로컬 API로 위경도 + 이미지 동시 업데이트

사용법:
  python3 scripts/update_kakao_data.py

사전 조건:
  - developers.kakao.com → 내 애플리케이션 → 카카오맵/로컬 서비스 활성화
  - .env.local에 KAKAO_REST_API_KEY 설정
"""

import os
import time
import httpx
from dotenv import load_dotenv
from supabase import create_client

load_dotenv(".env.local")

SUPABASE_URL = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]
KAKAO_REST_API_KEY = os.environ["KAKAO_REST_API_KEY"]

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
HEADERS = {"Authorization": f"KakaoAK {KAKAO_REST_API_KEY}"}


def search_keyword(query: str) -> dict | None:
    """카카오 키워드 검색 → lat, lng, phone, place_url"""
    try:
        resp = httpx.get(
            "https://dapi.kakao.com/v2/local/search/keyword.json",
            params={"query": query, "size": 1},
            headers=HEADERS,
            timeout=5,
        )
        data = resp.json()
        if data.get("documents"):
            doc = data["documents"][0]
            return {
                "lat": float(doc["y"]),
                "lng": float(doc["x"]),
                "place_url": doc.get("place_url"),
                "phone": doc.get("phone") or None,
            }
    except Exception as e:
        print(f"    [키워드검색 에러] {e}")
    return None


def search_address(address: str) -> dict | None:
    """카카오 주소 검색 폴백 → lat, lng만"""
    try:
        resp = httpx.get(
            "https://dapi.kakao.com/v2/local/search/address.json",
            params={"query": address},
            headers=HEADERS,
            timeout=5,
        )
        data = resp.json()
        if data.get("documents"):
            doc = data["documents"][0]
            return {
                "lat": float(doc["y"]),
                "lng": float(doc["x"]),
            }
    except Exception as e:
        print(f"    [주소검색 에러] {e}")
    return None


def test_api() -> bool:
    """API 연결 테스트"""
    try:
        resp = httpx.get(
            "https://dapi.kakao.com/v2/local/search/keyword.json",
            params={"query": "서울 연습실", "size": 1},
            headers=HEADERS,
            timeout=5,
        )
        data = resp.json()
        if resp.status_code == 200 and "documents" in data:
            return True
        print(f"    API 응답 이상: {data}")
    except Exception as e:
        print(f"    API 연결 실패: {e}")
    return False


def fetch_all_null_lat():
    """lat IS NULL인 레코드 전체 조회 (1000건 제한 우회)"""
    return _fetch_all(lambda q: q.is_("lat", "null").not_.is_("address", "null"))


def fetch_all_no_phone():
    """phone이 비어있는 레코드 전체 조회 (lat 있는 것만)"""
    return _fetch_all(
        lambda q: q.not_.is_("lat", "null").is_("phone", "null")
    )


def _fetch_all(apply_filter):
    all_rows = []
    offset = 0
    batch = 1000
    while True:
        q = supabase.table("studios").select("id, name, address, phone, photos")
        q = apply_filter(q)
        res = q.range(offset, offset + batch - 1).execute()
        rows = res.data
        all_rows.extend(rows)
        if len(rows) < batch:
            break
        offset += batch
    return all_rows


def main():
    print("=== Kakao API 연결 테스트 ===")
    if not test_api():
        print()
        print("Kakao 로컬 API가 비활성화 상태입니다.")
        print("developers.kakao.com → 내 애플리케이션 → music-spot")
        print("→ 카카오맵 또는 로컬 서비스 활성화 필요")
        return
    print("  테스트 성공\n")

    # Phase 1: lat/lng 미입력 데이터
    print("=== [Phase 1] lat/lng 미입력 데이터 조회 ===")
    null_rows = fetch_all_null_lat()
    print(f"  대상: {len(null_rows)}건\n")

    # Phase 2: phone 미입력 데이터 (lat 있는 것)
    print("=== [Phase 2] 전화번호 미입력 데이터 조회 ===")
    photo_rows = fetch_all_no_phone()
    print(f"  대상: {len(photo_rows)}건\n")

    # 합치되 중복 제거
    seen = set()
    rows = []
    for r in null_rows + photo_rows:
        if r["id"] not in seen:
            seen.add(r["id"])
            rows.append(r)

    if not rows:
        print("업데이트할 데이터가 없습니다.")
        return

    print(f"=== 총 {len(rows)}건 처리 시작 ===")
    geocoded = 0
    phones_added = 0
    places_added = 0
    failed = 0

    for i, row in enumerate(rows):
        name = row["name"] or ""
        address = row["address"] or ""
        studio_id = row["id"]
        has_coords = studio_id not in {r["id"] for r in null_rows}

        # 1단계: name + address로 키워드 검색
        result = search_keyword(f"{name} {address}")

        # 2단계: 실패 시 address만으로 주소 검색 폴백
        if result is None and address:
            result = search_address(address)

        if result is None:
            failed += 1
            if (i + 1) % 50 == 0:
                print(f"  진행: {i + 1}/{len(rows)} (위경도: {geocoded}, 전화: {phones_added}, 실패: {failed})")
            continue

        # 업데이트 데이터 구성
        update = {}

        # 위경도 (없을 때만)
        if not has_coords:
            update["lat"] = result["lat"]
            update["lng"] = result["lng"]

        # place_url → notes에 저장
        place_url = result.get("place_url")
        if place_url:
            update["notes"] = f"카카오플레이스: {place_url}"
            places_added += 1

        # phone 업데이트 (DB에 없을 때만)
        if result.get("phone") and not row.get("phone"):
            update["phone"] = result["phone"]
            phones_added += 1

        if not update:
            continue

        # Supabase 업데이트
        try:
            supabase.table("studios").update(update).eq("id", studio_id).execute()
            if not has_coords:
                geocoded += 1
        except Exception as e:
            print(f"    [DB 에러] {name[:20]}: {e}")
            failed += 1

        # 50건마다 진행 상황 + rate limit 대기
        if (i + 1) % 50 == 0:
            print(f"  진행: {i + 1}/{len(rows)} (위경도: {geocoded}, 전화: {phones_added}, 실패: {failed})")
            time.sleep(1)

    # 통계
    print(f"\n=== 완료 ===")
    print(f"총 처리: {len(rows)}건")
    print(f"위경도 성공: {geocoded}건")
    print(f"전화번호 추가: {phones_added}건")
    print(f"카카오플레이스 URL: {places_added}건")
    print(f"실패: {failed}건")

    # 남은 건 확인
    remaining = fetch_all_null_lat()
    print(f"남은 미처리: {len(remaining)}건")


if __name__ == "__main__":
    main()
