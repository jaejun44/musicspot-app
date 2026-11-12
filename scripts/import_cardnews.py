"""
Music Spot — 인스타 카드뉴스 → /news 웹 보관 (2026-11-12)

원본 폴더(<daily>/<YYYY-MM-DD>/slot-*/)는 읽기만 한다. 수정·이동·삭제하지 않는다.
가져오는 조건(전부): manifest status == "published" · post_url 있음 · caption.txt 있음 · 이미지 1장 이상 ·
캡션에 이미지 표기(사진·이미지·비주얼·재킷·포스터 등 라벨 줄, scripts/cardnews_parse.py)
표기는 cc / original / official 로 분류해 image_source_kind에 저장(나중에 official만 내릴 수 있게)
이미지: out/NN.png(최신) 또는 슬롯 루트 NN.png(옛 슬롯) → WebP(가로 1080, 장당 200KB 목표) → Storage 공개 버킷 news
DB: public.news_posts, source_key(<날짜>/<슬롯>) 기준 upsert — 여러 번 돌려도 중복 없음. is_published는 덮어쓰지 않는다

사용법:
  python3 scripts/import_cardnews.py --src <daily 폴더> --plan <경로>              # 미리보기만(DB·저장소 안 씀)
  python3 scripts/import_cardnews.py --src <daily 폴더> --apply                    # 전체 반영
  python3 scripts/import_cardnews.py --src <daily 폴더> --only 2026-11-12/slot-a --apply   # 한 슬롯만
서비스 키는 .env.local(SUPABASE_SERVICE_KEY)에서 읽고 출력하지 않는다.
"""

import argparse
import glob
import io
import json
import os
import re
import sys
from collections import Counter
from datetime import datetime, timezone

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cardnews_parse import build_sources, classify_credit, make_slug, parse_caption  # noqa: E402

BUCKET = "news"
TARGET_WIDTH = 1080
TARGET_BYTES = 200 * 1024
IMG_RE = re.compile(r"^(\d{2})\.png$")
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
KIND_NAMES = {"cc": "a Wikimedia·CC 사진", "original": "b MUSIC SPOT 자체 그래픽", "official": "c 레이블·밴드 공식 자료"}


def find_images(slot_dir: str) -> list[str]:
    """out/NN.png가 있으면 그것, 없으면 슬롯 루트 NN.png. 번호 순"""
    for d in (os.path.join(slot_dir, "out"), slot_dir):
        if os.path.isdir(d):
            files = sorted(f for f in os.listdir(d) if IMG_RE.match(f))
            if files:
                return [os.path.join(d, f) for f in files]
    return []


def to_webp(path: str) -> bytes:
    """가로 1080 유지(다르면 비율대로 맞춤), 품질을 낮춰 가며 200KB 이하로. 원본 파일은 읽기만"""
    with Image.open(path) as im:
        im = im.convert("RGB")
        if im.width != TARGET_WIDTH:
            im = im.resize((TARGET_WIDTH, round(im.height * TARGET_WIDTH / im.width)), Image.LANCZOS)
        data = b""
        for q in (82, 76, 70, 64, 58, 50):
            buf = io.BytesIO()
            im.save(buf, "WEBP", quality=q, method=6)
            data = buf.getvalue()
            if len(data) <= TARGET_BYTES:
                break
        return data


def read_text(path: str) -> str:
    try:
        with open(path, encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        return ""


def scan(src: str, only: str | None) -> tuple[list[dict], list[dict]]:
    """슬롯을 훑어 (가져올 것, 건너뛸 것[사유]) 으로 나눈다. 파일만 읽는다"""
    picked, skipped = [], []
    seen_posts: dict[str, str] = {}
    for slot_dir in sorted(glob.glob(os.path.join(src, "*", "slot-*"))):
        date, slot = slot_dir.rstrip("/").split(os.sep)[-2:]
        key = f"{date}/{slot}"
        if only and key != only:
            continue
        if not DATE_RE.match(date) or not os.path.isdir(slot_dir):
            continue

        def skip(reason: str):
            skipped.append({"source_key": key, "reason": reason})

        try:
            manifest = json.loads(read_text(os.path.join(slot_dir, "manifest.json")) or "null")
        except json.JSONDecodeError:
            manifest = None
        if not isinstance(manifest, dict):
            skip("manifest 없음·깨짐")
            continue
        status = manifest.get("status")
        if status != "published":
            skip(f"status={status}")
            continue
        post_url = (manifest.get("post_url") or "").strip()
        if not post_url.startswith("https://www.instagram.com/"):
            skip("post_url 없음")
            continue
        caption = read_text(os.path.join(slot_dir, "caption.txt"))
        if not caption.strip():
            skip("caption.txt 없음")
            continue
        images = find_images(slot_dir)
        if not images:
            skip("이미지 없음")
            continue
        parsed = parse_caption(caption)
        if not parsed["credit"]:
            skip("이미지 표기 없음")
            continue
        if post_url in seen_posts:
            skip(f"같은 인스타 글({seen_posts[post_url]})")
            continue
        seen_posts[post_url] = key

        topic = manifest.get("topic") if isinstance(manifest.get("topic"), str) else None
        picked.append({
            "source_key": key,
            "date": date,
            "slot": slot,
            "slug": make_slug(date, slot, topic, parsed["title"], parsed["hashtags"]),
            "title": parsed["title"],
            "body": parsed["body"],
            "topic": topic,
            "photo_credit": parsed["credit"],
            "image_source_kind": classify_credit(parsed["credit"]),
            "hashtags": parsed["hashtags"],
            "sources": build_sources(parsed, read_text(os.path.join(slot_dir, "sources.md"))),
            "instagram_url": post_url,
            "image_files": images,
        })
    return picked, skipped


def resolve_slugs(posts: list[dict], taken: dict[str, str]) -> None:
    """slug 충돌(다른 source_key가 이미 씀)이면 슬롯 이름을 붙인다. taken = {slug: source_key}(DB 기존 + 이번 실행)"""
    for p in posts:
        slug = p["slug"]
        if taken.get(slug, p["source_key"]) != p["source_key"]:
            slug = f"{slug}-{p['slot']}"
        taken[slug] = p["source_key"]
        p["slug"] = slug


def make_client():
    from dotenv import load_dotenv
    from supabase import create_client

    load_dotenv(".env.local")
    return create_client(os.environ["NEXT_PUBLIC_SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"])


def fetch_existing(client) -> dict[str, str]:
    rows, offset = [], 0
    while True:
        res = (client.table("news_posts").select("slug, source_key")
               .order("id").range(offset, offset + 999).execute())
        rows.extend(res.data)
        if len(res.data) < 1000:
            break
        offset += 1000
    return {r["slug"]: r["source_key"] for r in rows}


def main() -> None:
    ap = argparse.ArgumentParser(description="카드뉴스 → news_posts")
    ap.add_argument("--src", required=True, help="daily 폴더(<날짜>/slot-*/)")
    ap.add_argument("--plan", help="미리보기 결과 JSON 저장 경로(이것만 주면 DB·저장소를 쓰지 않음)")
    ap.add_argument("--apply", action="store_true", help="DB·저장소에 반영")
    ap.add_argument("--only", help="한 슬롯만: <YYYY-MM-DD>/<slot>")
    args = ap.parse_args()
    if not os.path.isdir(args.src):
        sys.exit(f"--src 폴더가 없습니다: {args.src}")
    if args.only and not re.match(r"^\d{4}-\d{2}-\d{2}/slot-[\w-]+$", args.only):
        sys.exit("--only 형식: 2026-11-12/slot-a")
    if not args.plan and not args.apply:
        sys.exit("--plan <경로> 또는 --apply 중 하나는 필요합니다")

    picked, skipped = scan(args.src, args.only)
    client = make_client() if args.apply else None
    resolve_slugs(picked, fetch_existing(client) if client else {})

    total_bytes, total_images = 0, 0
    for p in picked:
        sizes = []
        p["images"] = []
        for i, f in enumerate(p.pop("image_files"), start=1):
            data = to_webp(f)
            sizes.append(len(data))
            path = f"{p['date']}/{p['slot']}/{i:02d}.webp"
            p["images"].append(path)
            if client:
                client.storage.from_(BUCKET).upload(
                    path, data, {"content-type": "image/webp", "upsert": "true", "cache-control": "31536000"})
        p["image_count"] = len(p["images"])
        p["bytes"] = sum(sizes)
        p["max_image_bytes"] = max(sizes)
        total_bytes += p["bytes"]
        total_images += p["image_count"]
        if client:
            row = {k: p[k] for k in ("slug", "title", "body", "topic", "images", "image_count", "sources",
                                     "photo_credit", "image_source_kind", "hashtags", "instagram_url", "source_key")}
            row.update({"published_on": p["date"], "updated_at": datetime.now(timezone.utc).isoformat()})
            client.table("news_posts").upsert(row, on_conflict="source_key").execute()
            print(f"  ✓ {p['source_key']} → /news/{p['slug']} ({p['image_count']}장, {p['bytes'] // 1024}KB)")

    reasons = Counter(s["reason"] for s in skipped)
    summary = {
        "picked": len(picked),
        "skipped": len(skipped),
        "skip_reasons": dict(reasons.most_common()),
        "images": total_images,
        "total_kb": total_bytes // 1024,
        "over_200kb": sum(1 for p in picked if p["max_image_bytes"] > TARGET_BYTES),
        "image_source_kind": dict(Counter(p["image_source_kind"] for p in picked).most_common()),
    }
    if args.plan:
        with open(args.plan, "w", encoding="utf-8") as f:
            json.dump({"summary": summary, "picked": picked, "skipped": skipped}, f, ensure_ascii=False, indent=2)
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    if args.plan:  # 분류별 목록 — 표기 문구는 원문 그대로
        for kind, name in KIND_NAMES.items():
            rows = [p for p in picked if p["image_source_kind"] == kind]
            print(f"\n## ({name}) {kind} — {len(rows)}개")
            for p in rows:
                print(f"- {p['source_key']} {p['title'][:40]}\n    {p['photo_credit'].replace(chr(10), ' / ')}")
        print(f"\n## 건너뜀 — 이미지 표기 없음")
        for s in skipped:
            if s["reason"] == "이미지 표기 없음":
                print(f"- {s['source_key']}")
    if args.apply:
        print(f"반영 완료: {len(picked)}개 upsert")


if __name__ == "__main__":
    main()
