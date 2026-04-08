"""
Music Spot — 데이터 완성도 점수 계산 및 업데이트

사용법: python3 scripts/update_quality_score.py
"""

import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv(".env.local")

supabase = create_client(
    os.environ["NEXT_PUBLIC_SUPABASE_URL"],
    os.environ["SUPABASE_SERVICE_KEY"],
)


def calc_score(s: dict) -> int:
    score = 0
    photos = s.get("photos") or []
    if len(photos) >= 1:
        score += 30
    if len(photos) >= 3:
        score += 10
    if s.get("phone"):
        score += 15
    if s.get("naver_place_url"):
        score += 10
    if s.get("kakao_channel"):
        score += 10
    if s.get("price_info"):
        score += 10
    if s.get("address"):
        score += 5
    if s.get("lat") is not None and s.get("lng") is not None:
        score += 5
    if s.get("room_type") in ("T", "M", "both"):
        score += 5
    return score


def fetch_all():
    all_rows = []
    offset = 0
    while True:
        res = (
            supabase.table("studios")
            .select("id, photos, phone, naver_place_url, kakao_channel, price_info, address, lat, lng, room_type")
            .range(offset, offset + 999)
            .execute()
        )
        all_rows.extend(res.data)
        if len(res.data) < 1000:
            break
        offset += 1000
    return all_rows


def main():
    print("=== 전체 studios 조회 ===")
    rows = fetch_all()
    print(f"  총 {len(rows)}건\n")

    # 점수 계산
    scores = []
    for row in rows:
        s = calc_score(row)
        scores.append((row["id"], s))

    # 배치 업데이트
    print("=== 점수 업데이트 ===")
    for i, (sid, score) in enumerate(scores):
        supabase.table("studios").update({"data_quality_score": score}).eq("id", sid).execute()
        if (i + 1) % 200 == 0:
            print(f"  {i + 1}/{len(scores)} 완료")

    print(f"  {len(scores)}/{len(scores)} 완료\n")

    # 점수 분포
    buckets = {
        "0~20": 0,
        "21~40": 0,
        "41~60": 0,
        "61~80": 0,
        "81~100": 0,
    }
    for _, s in scores:
        if s <= 20:
            buckets["0~20"] += 1
        elif s <= 40:
            buckets["21~40"] += 1
        elif s <= 60:
            buckets["41~60"] += 1
        elif s <= 80:
            buckets["61~80"] += 1
        else:
            buckets["81~100"] += 1

    print("=== 점수 분포 ===")
    for k, v in buckets.items():
        bar = "█" * (v // 10)
        print(f"  {k:>7}: {v:>4}건  {bar}")


if __name__ == "__main__":
    main()
