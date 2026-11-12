"""
Music Spot — studios.kinds·band_rank 채우기 (2026-11-12, supabase/18_studio_kinds.sql)

규칙은 scripts/studio_rules.py classify_kinds·band_rank. 공개 여부(is_published)는 건드리지 않는다.
전 행(비공개 포함)을 같은 규칙으로 계산하고, 값이 달라진 행만 고친다.

사용법:
  python3 scripts/update_studio_kinds.py --plan <경로>                       # 미리보기(바뀔 건수·분포 + 계획 저장, DB 안 건드림)
  python3 scripts/update_studio_kinds.py --apply --plan <경로> --backup <경로>   # 저장한 계획 그대로 반영(이전 값 백업 먼저)
"""

import argparse
import json
import os
import sys
from collections import Counter

from dotenv import load_dotenv
from supabase import create_client

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from studio_rules import band_rank, classify_kinds  # noqa: E402

FIELDS = "id, name, category, options, notes, price_info, has_drum, is_published, kinds, band_rank"


def client():
    load_dotenv(".env.local")
    return create_client(os.environ["NEXT_PUBLIC_SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"])


def fetch_all(sb) -> list[dict]:
    rows, offset = [], 0
    while True:
        res = sb.table("studios").select(FIELDS).order("id").range(offset, offset + 999).execute()
        rows.extend(res.data)
        if len(res.data) < 1000:
            break
        offset += 1000
    return rows


def plan(rows: list[dict]) -> dict[str, dict]:
    changes = {}
    for r in rows:
        kinds = classify_kinds(r)
        rank = band_rank(kinds)
        if kinds != (r.get("kinds") or []) or rank != r.get("band_rank"):
            changes[r["id"]] = {"kinds": kinds, "band_rank": rank}
    return changes


def summarize(rows: list[dict], changes: dict[str, dict]) -> None:
    pub = [r for r in rows if r.get("is_published")]
    after = {r["id"]: changes.get(r["id"], {"kinds": r.get("kinds") or [], "band_rank": r.get("band_rank")}) for r in rows}
    print(f"[*] 전체 {len(rows)}행 (공개 {len(pub)}) · 바뀔 행 {len(changes)}")
    print("[*] 공개 band_rank:", dict(sorted(Counter(after[r['id']]['band_rank'] for r in pub).items())))
    kinds = Counter(k for r in pub for k in after[r["id"]]["kinds"])
    print("[*] 공개 종류별:", dict(kinds.most_common()))


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--plan", required=True, help="계획 JSON 경로(미리보기 때 저장, --apply 때 읽음)")
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--backup", help="--apply 때 이전 값 백업 경로(필수)")
    args = ap.parse_args()
    sb = client()

    if not args.apply:
        rows = fetch_all(sb)
        changes = plan(rows)
        summarize(rows, changes)
        with open(args.plan, "w", encoding="utf-8") as f:
            json.dump(changes, f, ensure_ascii=False)
        print(f"[*] 계획 저장: {args.plan}\n(미리보기만 했습니다. 반영: --apply --plan <경로> --backup <경로>)")
        return

    if not args.backup:
        sys.exit("--apply에는 --backup <경로>가 필요합니다")
    with open(args.plan, encoding="utf-8") as f:
        changes: dict[str, dict] = json.load(f)
    ids = list(changes)
    old = {}
    for k in range(0, len(ids), 200):
        res = sb.table("studios").select("id, kinds, band_rank, updated_at").in_("id", ids[k:k + 200]).execute()
        old.update({r["id"]: {"kinds": r["kinds"], "band_rank": r["band_rank"], "updated_at": r["updated_at"]} for r in res.data})
    with open(args.backup, "w", encoding="utf-8") as f:
        json.dump(old, f, ensure_ascii=False)
    print(f"[*] 백업: {args.backup} ({len(old)}행)")

    failed = 0
    for sid, upd in changes.items():  # updated_at은 그대로 둔다(내용 수정이 아닌 파생값)
        try:
            sb.table("studios").update(upd).eq("id", sid).execute()
        except Exception as e:  # 한 행 실패로 멈추지 않되 끝에 건수로 알린다
            failed += 1
            print(f"  [실패] {sid}: {e}")
    print(f"[*] 완료: {len(changes) - failed}행 갱신, 실패 {failed}")
    if failed:
        sys.exit(1)


if __name__ == "__main__":
    main()
