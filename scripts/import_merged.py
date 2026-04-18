"""
Music Spot — rooms_merged.csv 기반 일괄 적재 스크립트

crawling/merge_filtered.py 가 만든 통합 CSV(= 사진 + 위치 + 가격이 모두 있는
뮬 + 스페이스클라우드 데이터)를 studios 테이블에 업로드합니다.

사용법:
  pip3 install pandas supabase python-dotenv
  python3 scripts/import_merged.py                           # 2000개까지 추가
  python3 scripts/import_merged.py --reset                   # 전체 삭제 후 재적재
  python3 scripts/import_merged.py --limit 500               # 상한 변경
  python3 scripts/import_merged.py --csv ../crawling/rooms_merged.csv

기본 입력 파일:
  - data/rooms_merged.csv  (없으면 ../crawling/rooms_merged.csv 자동 탐색)
"""

import os
import sys
import math
import argparse
import pandas as pd
from dotenv import load_dotenv
from supabase import create_client


load_dotenv(".env.local")

SUPABASE_URL = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


# ---------------------------- 유틸 ----------------------------

def clean_value(v):
    """NaN, inf 등을 None으로 변환"""
    if v is None:
        return None
    if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
        return None
    return v


def split_photos(image_url: str, image_urls: str) -> list[str]:
    """image_url + image_urls(' | ' 구분) → 중복 제거된 배열"""
    out: list[str] = []
    if image_url:
        u = str(image_url).strip()
        if u:
            out.append(u)
    if image_urls:
        for u in str(image_urls).split(" | "):
            u = u.strip()
            if u and u not in out:
                out.append(u)
    return out


def classify_room(row: dict) -> str | None:
    """price_info 기반 room_type 분류: T=시간당결제, M=월결제"""
    price = str(row.get("price_info") or "")
    src = str(row.get("source") or "")

    # 스페이스클라우드는 전부 시간당 결제
    if src == "spacecloud":
        return "T"

    # 뮬: price_info에 시간당 키워드 있으면 T
    if "시간" in price or "시간당" in price or "/h" in price.lower():
        return "T"

    # 뮬: 월 키워드 있으면 M
    if "월" in price:
        return "M"

    return None


def detect_drum(row: dict) -> bool:
    name = str(row.get("name") or "")
    options = str(row.get("options") or "")
    return "드럼" in name or "드럼" in options


def has_required(row: dict) -> bool:
    """사진 + 위치 + 가격 이중 검증"""
    photos = row.get("photos") or []
    has_image = len(photos) > 0
    has_location = bool(row.get("region") or row.get("address"))
    has_price = bool(row.get("price_info"))
    return has_image and has_location and has_price


# ------------------------- 파일 로드 -------------------------

def resolve_csv_path(root: str, csv_arg: str | None) -> str:
    """CSV 경로 결정: 명시 > data/ > ../crawling/"""
    candidates = []
    if csv_arg:
        candidates.append(csv_arg)
    candidates.extend([
        os.path.join(root, "data/rooms_merged.csv"),
        os.path.join(root, "..", "crawling/rooms_merged.csv"),
    ])
    for p in candidates:
        if p and os.path.exists(p):
            return p
    print("[에러] rooms_merged.csv를 찾지 못했습니다. --csv 경로를 직접 지정하세요.")
    print("     탐색 경로:")
    for p in candidates:
        print(f"       - {p}")
    sys.exit(1)


def load_merged(path: str) -> pd.DataFrame:
    """통합 CSV 로드 후 studios 스키마에 맞게 변환"""
    df = pd.read_csv(path, encoding="utf-8-sig")

    # 통합 CSV의 컬럼: source, title, category, region, address, price_info,
    #                image_url, image_urls, phone, options, rating, hours, url
    df = df.rename(columns={"title": "name", "url": "source_url"})

    # 누락 컬럼 보정
    for col in ["name", "category", "options", "region", "address", "phone",
                "price_info", "image_url", "image_urls", "capacity", "rating",
                "hours", "source_url", "source"]:
        if col not in df.columns:
            df[col] = ""

    # photos 배열 생성
    df["photos"] = df.apply(
        lambda r: split_photos(r.get("image_url"), r.get("image_urls")),
        axis=1,
    )

    # 부가 분류
    df["room_type"] = df.apply(classify_room, axis=1)
    df["has_drum"] = df.apply(detect_drum, axis=1)

    # studios 스키마에 없는 중간 컬럼은 제거
    cols_keep = ["name", "category", "options", "region", "address", "phone",
                 "price_info", "capacity", "rating", "hours", "source_url",
                 "source", "photos", "room_type", "has_drum"]
    return df[[c for c in cols_keep if c in df.columns]]


# ------------------------- DB 작업 -------------------------

def delete_all_studios():
    print("=== 기존 데이터 삭제 ===")
    try:
        supabase.table("studios").delete().gte("created_at", "1970-01-01").execute()
        print("  기존 데이터 전체 삭제 완료")
    except Exception as e:
        print(f"  [에러] 삭제 실패: {e}")
        sys.exit(1)


# ---------------------------- main ----------------------------

def main():
    parser = argparse.ArgumentParser(description="rooms_merged.csv → studios 적재")
    parser.add_argument("--csv", type=str, default=None,
                        help="입력 CSV 경로 (기본: data/rooms_merged.csv 또는 ../crawling/rooms_merged.csv)")
    parser.add_argument("--limit", type=int, default=2000,
                        help="최대 업로드 개수 (기본: 2000)")
    parser.add_argument("--reset", action="store_true",
                        help="기존 studios 전체 삭제 후 재적재")
    parser.add_argument("--batch", type=int, default=100,
                        help="insert 배치 크기 (기본: 100)")
    parser.add_argument("--publish", action="store_true",
                        help="is_published=True로 적재 (기본: False)")
    args = parser.parse_args()

    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    csv_path = resolve_csv_path(root, args.csv)
    print(f"[*] 입력: {csv_path}")

    # 1. 로드
    combined = load_merged(csv_path)
    print(f"[*] 로드: {len(combined)}건")

    # 2. 중복 제거 (address 기준, 기존 import_studios.py와 동일)
    before = len(combined)
    combined = combined.drop_duplicates(subset=["address"], keep="first")
    print(f"[*] 중복 제거: {before} → {len(combined)}건 ({before - len(combined)} 제거)")

    # 3. NaN → None 후 dict 변환
    records = combined.where(pd.notna(combined), None).to_dict("records")

    # 4. 사진 + 위치 + 가격 이중 필터
    before = len(records)
    records = [r for r in records if has_required(r)]
    print(f"[*] 필수필드 검증: {before} → {len(records)}건")

    # 5. 상한 적용
    if args.limit and len(records) > args.limit:
        print(f"[*] 상한: {len(records)} → {args.limit}")
        records = records[: args.limit]

    # 6. 기본값 및 NaN 정리
    t_count = m_count = drum_count = 0
    for rec in records:
        rec["lat"] = None
        rec["lng"] = None
        rec["is_published"] = bool(args.publish)
        for k, v in list(rec.items()):
            if k == "photos":
                # 배열 유지 (빈 배열은 None으로 두지 않음)
                rec[k] = v or []
            else:
                rec[k] = clean_value(v)
        if rec.get("room_type") == "T":
            t_count += 1
        elif rec.get("room_type") == "M":
            m_count += 1
        if rec.get("has_drum"):
            drum_count += 1

    print(f"[*] 룸타입: T룸 {t_count} / M룸 {m_count} / 드럼가능 {drum_count}")
    print(f"[*] 업로드 대상: {len(records)}건")

    if not records:
        print("[!] 업로드할 데이터 없음 — 종료")
        return

    # 7. reset 모드
    if args.reset:
        delete_all_studios()

    # 8. 배치 insert
    print("\n=== Supabase 적재 ===")
    inserted = 0
    failed = 0
    for i in range(0, len(records), args.batch):
        batch = records[i : i + args.batch]
        try:
            supabase.table("studios").insert(batch).execute()
            inserted += len(batch)
            print(f"  {inserted}/{len(records)} 삽입 완료")
        except Exception as e:
            failed += len(batch)
            print(f"  [에러] batch {i}~{i+len(batch)}: {e}")

    print("\n=== 완료 ===")
    print(f"총 insert: {inserted}건")
    print(f"실패: {failed}건")
    print("\n다음 단계:")
    print("  1) python3 scripts/update_geocoding.py       # lat/lng 채우기 (Kakao API)")
    print("  2) python3 scripts/update_quality_score.py   # 완성도 점수 갱신")


if __name__ == "__main__":
    main()
