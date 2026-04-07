"""
Music Spot — lat/lng 미입력 데이터에 Geocoding 업데이트

사용법:
  pip3 install supabase httpx python-dotenv
  python3 scripts/update_geocoding.py

사전 조건:
  - Kakao Developers에서 OPEN_MAP_AND_LOCAL 서비스 활성화 필요
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


def geocode(address: str) -> tuple[float | None, float | None]:
    """Kakao Geocoding API로 주소 → 위경도 변환"""
    if not address:
        return None, None

    # 주소 검색 먼저 시도
    try:
        resp = httpx.get(
            "https://dapi.kakao.com/v2/local/search/address.json",
            params={"query": address},
            headers={"Authorization": f"KakaoAK {KAKAO_REST_API_KEY}"},
            timeout=5,
        )
        data = resp.json()
        if data.get("documents"):
            doc = data["documents"][0]
            return float(doc["y"]), float(doc["x"])
    except Exception as e:
        print(f"  [주소검색 실패] {e}")

    # 키워드 검색으로 폴백
    try:
        resp = httpx.get(
            "https://dapi.kakao.com/v2/local/search/keyword.json",
            params={"query": address},
            headers={"Authorization": f"KakaoAK {KAKAO_REST_API_KEY}"},
            timeout=5,
        )
        data = resp.json()
        if data.get("documents"):
            doc = data["documents"][0]
            return float(doc["y"]), float(doc["x"])
    except Exception as e:
        print(f"  [키워드검색 실패] {e}")

    return None, None


def main():
    # lat이 NULL인 레코드만 가져오기
    print("=== lat/lng 미입력 데이터 조회 ===")
    result = (
        supabase.table("studios")
        .select("id, name, address")
        .is_("lat", "null")
        .not_.is_("address", "null")
        .execute()
    )
    rows = result.data
    print(f"대상: {len(rows)}건\n")

    if not rows:
        print("업데이트할 데이터가 없습니다.")
        return

    # API 연결 테스트
    print("=== Kakao API 테스트 ===")
    test_lat, test_lng = geocode("서울특별시 마포구 서교동")
    if test_lat is None:
        print("[에러] Kakao API가 작동하지 않습니다.")
        print("→ Kakao Developers에서 OPEN_MAP_AND_LOCAL 서비스를 활성화하세요.")
        return
    print(f"테스트 성공: ({test_lat}, {test_lng})\n")

    # Geocoding 실행
    print("=== Geocoding 시작 ===")
    updated = 0
    skipped = 0
    failed = 0

    for i, row in enumerate(rows):
        address = row["address"]
        lat, lng = geocode(address)

        if lat is not None and lng is not None:
            try:
                supabase.table("studios").update(
                    {"lat": lat, "lng": lng, "updated_at": "now()"}
                ).eq("id", row["id"]).execute()
                updated += 1
            except Exception as e:
                print(f"  [DB 에러] {row['name']}: {e}")
                failed += 1
        else:
            skipped += 1

        if (i + 1) % 50 == 0:
            print(f"  진행: {i + 1}/{len(rows)} (성공: {updated}, 실패: {skipped + failed})")
            time.sleep(0.5)  # Rate limit 방지

    # 통계
    print(f"\n=== 완료 ===")
    print(f"업데이트 성공: {updated}건")
    print(f"Geocoding 실패 (주소 매칭 불가): {skipped}건")
    print(f"DB 저장 실패: {failed}건")

    # 남은 건 확인
    remaining = (
        supabase.table("studios")
        .select("id", count="exact")
        .is_("lat", "null")
        .execute()
    )
    print(f"아직 lat/lng 없는 레코드: {remaining.count}건")


if __name__ == "__main__":
    main()
