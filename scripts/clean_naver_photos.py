"""네이버 로고/아이콘 이미지 정리"""
import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv(".env.local")
supabase = create_client(
    os.environ["NEXT_PUBLIC_SUPABASE_URL"],
    os.environ["SUPABASE_SERVICE_KEY"],
)

NAVER_KEYWORDS = ["naver", "static.nid", "favicon", "dthumb", "pstatic"]

all_rows = []
offset = 0
while True:
    res = supabase.table("studios").select("id, photos").not_.is_("photos", "null").range(offset, offset + 999).execute()
    all_rows.extend(res.data)
    if len(res.data) < 1000:
        break
    offset += 1000

print(f"photos 있는 레코드: {len(all_rows)}건")

cleaned = 0
for row in all_rows:
    photos = row.get("photos") or []
    if not photos:
        continue
    if any(any(kw in url for kw in NAVER_KEYWORDS) for url in photos):
        supabase.table("studios").update({"photos": []}).eq("id", row["id"]).execute()
        cleaned += 1

print(f"네이버 로고 정리 완료: {cleaned}건")
