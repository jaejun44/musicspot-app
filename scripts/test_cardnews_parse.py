"""cardnews_parse 테스트 — python3 scripts/test_cardnews_parse.py (tests/cardnews-parse.cjs가 node --test에서 부른다)"""

import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cardnews_parse import build_sources, classify_credit, make_slug, parse_caption  # noqa: E402

NEW = """2026 록앤롤 명예의 전당 헌액식이 11월 14일 열려요 🏆

📍 11/14(현지) 로스앤젤레스 Peacock Theater 녹화, 12월 ABC·Disney+ 방영
🎸 Oasis, Iron Maiden 헌액


올해 헌액 중 최애는? 댓글로 알려주세요 👇

출처: Rock & Roll Hall of Fame, Parade
사진: Raph_PH, Craig Hawkins (Wikimedia Commons, CC) — 과거 공연 사진

#뮤직스팟 #musicspot #RockHall #Oasis
"""

OLD = """﻿아이언 메이든, 12월에 LP 두 번 온다. 🤘

9월 3일 공식 발표에 따르면 Part One: 1980–1992는 12월 11일 발매 예정입니다.

출처: Iron Maiden 공식 사이트, 2026.09.03
https://www.ironmaiden.com/two-special-anniversary-releases-announced/
확인: 2026.09.09. 발매 일정은 변경될 수 있습니다.
비주얼: MUSIC SPOT 오리지널 LP 그래픽. 실제 상품 이미지가 아닙니다.

#IronMaiden #아이언메이든
#헤비메탈 #IronMaiden
"""

NO_CREDIT = """런던의 괴담을 담은 신보 🖤

본문입니다. 사진은 다음 주에.
출처: Knotfest(2026.09.29)
https://knotfest.com/a

#GreenLung
"""


class ParseCaption(unittest.TestCase):
    def test_title_is_first_nonempty_line_with_emoji(self):
        self.assertEqual(parse_caption(NEW)["title"], "2026 록앤롤 명예의 전당 헌액식이 11월 14일 열려요 🏆")
        self.assertEqual(parse_caption(OLD)["title"], "아이언 메이든, 12월에 LP 두 번 온다. 🤘")  # BOM 제거
        self.assertEqual(parse_caption("\n\n  첫 줄  \n둘째")["title"], "첫 줄")

    def test_hashtags_split_and_deduped(self):
        self.assertEqual(parse_caption(NEW)["hashtags"], ["#뮤직스팟", "#musicspot", "#RockHall", "#Oasis"])
        self.assertEqual(parse_caption(OLD)["hashtags"], ["#IronMaiden", "#아이언메이든", "#헤비메탈"])

    def test_body_excludes_title_hashtags_credit_sources_and_squeezes_blanks(self):
        body = parse_caption(NEW)["body"]
        self.assertTrue(body.startswith("📍 11/14(현지)"))
        self.assertNotIn("#", body)
        self.assertNotIn("사진:", body)
        self.assertNotIn("출처:", body)
        self.assertNotIn("\n\n\n", body)
        self.assertTrue(body.endswith("댓글로 알려주세요 👇"))
        # 본문 문장은 그대로(콜론이 있어도 라벨 줄이 아니면 본문)
        old_body = parse_caption(OLD)["body"]
        self.assertIn("Part One: 1980–1992는", old_body)
        self.assertIn("확인: 2026.09.09.", old_body)
        self.assertNotIn("https://", old_body)  # 출처 아래 URL만 있는 줄은 출처로

    def test_credit_variants(self):
        self.assertEqual(parse_caption(NEW)["credit"], "사진: Raph_PH, Craig Hawkins (Wikimedia Commons, CC) — 과거 공연 사진")
        self.assertTrue(parse_caption(OLD)["credit"].startswith("비주얼:"))
        for line in ("이미지: King Gnu 공식 MV 캡처", "사진·재킷: BAND-MAID 공식", "표지 사진: Jessica Yurko",
                     "출처·사진·투어 포스터: Nuclear Blast", "재킷: Maarten Donders"):
            self.assertEqual(parse_caption(f"제목\n본문\n{line}\n")["credit"], line, line)

    def test_missing_photo_credit_detected(self):
        p = parse_caption(NO_CREDIT)
        self.assertEqual(p["credit"], "")  # 라벨 줄이 아닌 본문 속 "사진"은 표기가 아니다
        self.assertEqual(parse_caption("")["credit"], "")
        self.assertEqual(parse_caption("제목만")["title"], "제목만")

    def test_sources_text_and_links_without_instagram(self):
        p = parse_caption(OLD)
        src = build_sources(p, "- https://www.ironmaiden.com/two-special-anniversary-releases-announced/\n"
                               "- https://www.instagram.com/music_spot_kr/p/x/\n- https://example.com/a")
        self.assertEqual(src[0], {"text": "출처: Iron Maiden 공식 사이트, 2026.09.03"})
        urls = [s["url"] for s in src if "url" in s]
        self.assertEqual(urls, ["https://www.ironmaiden.com/two-special-anniversary-releases-announced/",
                                "https://example.com/a"])
        self.assertEqual(src[1]["label"], "ironmaiden.com")


class Classify(unittest.TestCase):
    def test_three_kinds(self):
        self.assertEqual(classify_credit("사진: Raph_PH, Craig Hawkins (Wikimedia Commons, CC) — 과거 공연 사진"), "cc")
        self.assertEqual(classify_credit("비주얼: MUSIC SPOT 오리지널 LP 그래픽. 실제 상품 이미지가 아닙니다."), "original")
        self.assertEqual(classify_credit("사진·재킷: BAND-MAID / PONY CANYON 공식 홍보 자료"), "official")
        self.assertEqual(classify_credit("이미지: King Gnu 공식 MV 캡처 · \"AIZO\" 공식 커버"), "official")
        # 섞이면 공식 자료가 이긴다(나중에 official만 골라 내리기 위해)
        self.assertEqual(classify_credit("사진: X (Wikimedia Commons, CC)\n재킷: 레이블 제공"), "official")
        self.assertEqual(classify_credit("사진: Lau Anime X (Public Domain) · Anime Friends 2015"), "cc")
        self.assertEqual(classify_credit("사진: Knotfest 기사 이미지, angela n.(CC BY 2.0)"), "official")
        # 어느 쪽인지 모르는 보도 사진은 official 쪽으로
        self.assertEqual(classify_credit("표지 사진: Jessica Yurko / Knotfest"), "official")


class Slug(unittest.TestCase):
    def test_slug_prefers_topic_then_title_then_tags_then_slot(self):
        self.assertEqual(make_slug("2026-09-09", "slot-18", "Iron Maiden 2026-09-03 anniversary vinyl", "x"),
                         "2026-09-09-iron-maiden-anniversary-vinyl")
        self.assertEqual(make_slug("2026-11-06", "slot-b", None, "🇺🇸 King Gnu, 첫 미국 헤드라인 투어 확정!"),
                         "2026-11-06-king-gnu")
        self.assertEqual(make_slug("2026-11-12", "slot-a", None, "2026 헌액식 11월 14일",
                                   ["#뮤직스팟", "#musicspot", "#RockHall", "#Oasis"]), "2026-11-12-rockhall-oasis")
        self.assertEqual(make_slug("2026-11-12", "slot-a", None, "한글 제목", []), "2026-11-12-slot-a")


if __name__ == "__main__":
    unittest.main()
