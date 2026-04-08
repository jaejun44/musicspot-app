"""
Music Spot — 연습실 데이터 초기 적재 스크립트 (Geocoding 없이)

사용법:
  pip3 install pandas supabase python-dotenv
  python3 scripts/import_studios.py           # 기존 데이터 유지 + 추가
  python3 scripts/import_studios.py --reset   # 기존 데이터 삭제 후 재적재

입력 파일:
  - data/mule_rooms.csv
  - data/spacecloud_rooms.csv
"""

import os
import sys
import math
import pandas as pd
from dotenv import load_dotenv
from supabase import create_client

load_dotenv(".env.local")

SUPABASE_URL = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


def clean_value(v):
    """NaN, inf 등을 None으로 변환"""
    if v is None:
        return None
    if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
        return None
    return v


def load_mule(path: str) -> pd.DataFrame:
    """뮬 데이터 로드 및 정규화"""
    df = pd.read_csv(path, encoding="utf-8-sig")
    df = df.rename(columns={"title": "name", "url": "source_url"})
    df["source"] = "mule"
    cols = ["name", "category", "options", "region", "address", "phone",
            "price_info", "source_url", "source"]
    return df[[c for c in cols if c in df.columns]]


def load_spacecloud(path: str) -> pd.DataFrame:
    """스페이스클라우드 데이터 로드 및 정규화"""
    df = pd.read_csv(path, encoding="utf-8-sig")
    df = df.rename(columns={"title": "name", "url": "source_url"})
    df["source"] = "spacecloud"
    cols = ["name", "category", "options", "region", "address", "phone",
            "price_info", "capacity", "rating", "hours", "source_url", "source"]
    return df[[c for c in cols if c in df.columns]]


def delete_all_studios():
    """기존 studios 테이블 전체 삭제"""
    print("=== 기존 데이터 삭제 ===")
    try:
        # Supabase에서 전체 삭제: is_published이 true든 false든 모두
        supabase.table("studios").delete().gte("created_at", "1970-01-01").execute()
        print("  기존 데이터 전체 삭제 완료")
    except Exception as e:
        print(f"  [에러] 삭제 실패: {e}")
        sys.exit(1)


def main():
    reset_mode = "--reset" in sys.argv

    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

    # 1. 파일 읽기
    print("=== 파일 로드 ===")
    mule_path = os.path.join(root, "data/mule_rooms.csv")
    space_path = os.path.join(root, "data/spacecloud_rooms.csv")

    dfs = []
    if os.path.exists(mule_path):
        mule_df = load_mule(mule_path)
        print(f"  mule: {len(mule_df)}건")
        dfs.append(mule_df)
    else:
        print(f"  [경고] {mule_path} 파일 없음 — 건너뜀")

    if os.path.exists(space_path):
        space_df = load_spacecloud(space_path)
        print(f"  spacecloud: {len(space_df)}건")
        dfs.append(space_df)
    else:
        print(f"  [경고] {space_path} 파일 없음 — 건너뜀")

    if not dfs:
        print("로드할 파일이 없습니다.")
        return

    combined = pd.concat(dfs, ignore_index=True)
    print(f"\n합산: {len(combined)}건")

    # 2. 중복 제거 (address 기준)
    before = len(combined)
    combined = combined.drop_duplicates(subset=["address"], keep="first")
    print(f"중복 제거: {before} → {len(combined)}건 ({before - len(combined)}건 제거)")

    # 2.5. room_type 자동 분류 (category 기반)
    def classify_room(row):
        cat = str(row.get("category", "") or "")
        src = str(row.get("source", ""))
        if src == "mule":
            if "개인연습실" in cat:
                return "T"
            if "합주" in cat:
                return "M"
        if "악기연습실" in cat:
            return "M"
        if "보컬연습실" in cat:
            return "T"
        return None

    combined["room_type"] = combined.apply(classify_room, axis=1)
    t_count = (combined["room_type"] == "T").sum()
    m_count = (combined["room_type"] == "M").sum()
    print(f"룸타입 분류: T룸 {t_count}건 / M룸 {m_count}건")

    # 2.6. has_drum 자동 분류 (name, options 키워드 기반)
    def detect_drum(row):
        name = str(row.get("name", "") or "")
        options = str(row.get("options", "") or "")
        return "드럼" in name or "드럼" in options

    combined["has_drum"] = combined.apply(detect_drum, axis=1)
    drum_count = combined["has_drum"].sum()
    print(f"드럼 가능: {drum_count}건")

    # 3. Geocoding 건너뜀 — lat/lng = None
    combined["lat"] = None
    combined["lng"] = None
    print("\n[Geocoding 건너뜀] lat/lng = None으로 적재합니다.")
    print("→ Kakao API 활성화 후 update_geocoding.py를 실행하세요.")

    # 3.5. 기존 데이터 삭제 (--reset 모드)
    if reset_mode:
        delete_all_studios()

    # 4. Supabase insert
    print("\n=== Supabase 적재 ===")
    records = combined.where(pd.notna(combined), None).to_dict("records")

    # NaN 클린업 + 기본값 설정
    for rec in records:
        rec["is_published"] = False
        for k, v in rec.items():
            rec[k] = clean_value(v)

    batch_size = 100
    inserted = 0
    failed = 0

    for i in range(0, len(records), batch_size):
        batch = records[i : i + batch_size]
        try:
            supabase.table("studios").insert(batch).execute()
            inserted += len(batch)
            print(f"  {inserted}/{len(records)} 삽입 완료")
        except Exception as e:
            failed += len(batch)
            print(f"  [에러] batch {i}~{i+len(batch)}: {e}")

    # 5. 통계
    print("\n=== 완료 ===")
    print(f"총 insert: {inserted}건")
    print(f"실패: {failed}건")


if __name__ == "__main__":
    main()
