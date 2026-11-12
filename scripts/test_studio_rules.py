"""studio_rules 연습실 종류 분류 테스트 — python3 scripts/test_studio_rules.py (tests/studio-kinds.cjs가 node --test에서 부른다)"""

import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from studio_rules import band_rank, classify_kinds  # noqa: E402


def studio(name="", category="", options="", notes="", price_info="", has_drum=False):
    return {"name": name, "category": category, "options": options, "notes": notes,
            "price_info": price_info, "has_drum": has_drum}


class Kinds(unittest.TestCase):
    def test_representative_kinds(self):
        self.assertEqual(classify_kinds(studio("홍대 합주실 A")), ["band"])
        self.assertEqual(classify_kinds(studio("X", options="드럼연습실, 신촌드럼")), ["drum"])
        self.assertEqual(classify_kinds(studio("X", options="그랜드피아노, 피아노연습실")), ["piano"])
        self.assertEqual(classify_kinds(studio("X", options="보컬레슨실")), ["vocal"])
        self.assertEqual(classify_kinds(studio("X 셀프 녹음실")), ["recording"])
        self.assertEqual(classify_kinds(studio("X", options="안무연습실, 전신거울")), ["dance"])

    def test_has_drum_means_band_and_drum(self):
        self.assertEqual(classify_kinds(studio("이름만", has_drum=True)), ["band", "drum"])

    def test_negations_excluded(self):
        self.assertEqual(classify_kinds(studio("X", notes="드럼 없음 / 피아노 있음")), ["piano"])
        self.assertEqual(classify_kinds(studio("X", notes="합주 불가, 보컬 연습만")), ["vocal"])
        self.assertEqual(classify_kinds(studio("X", notes="밴드 연습 불가")), [])
        # 부정은 같은 구절 안에서만 — 다른 구절의 '없음'은 영향 없음
        self.assertEqual(classify_kinds(studio("X", options="엘리베이터 없음 / 4층 밴드 합주실")), ["band"])

    def test_classical_ensemble_is_not_band(self):
        self.assertEqual(classify_kinds(studio("X", options="피아노연습, 현악합주")), ["piano"])
        self.assertEqual(classify_kinds(studio("X", options="현악앙상블 합주")), [])

    def test_category_tags(self):
        cat = "댄스연습실, 보컬연습실, 악기연습실, 연습실"
        self.assertEqual(classify_kinds(studio("X", category=cat)), ["vocal", "dance"])
        # '악기연습실' 태그는 모든 곳에 붙어 band가 아니다
        self.assertEqual(classify_kinds(studio("X", category="악기연습실, 연습실")), [])
        # 댄스 태그만 있고 이름·옵션이 음악 연습실이면 dance로 보지 않는다
        self.assertEqual(classify_kinds(studio("시흥 한스헨즈 음악연습실", category="댄스연습실, 악기연습실")), [])
        # 글자로 댄스가 있으면 음악 표현이 있어도 dance
        self.assertIn("dance", classify_kinds(studio("음악 댄스연습실", category="댄스연습실")))

    def test_mixed_kinds_keep_order(self):
        k = classify_kinds(studio("방구석 뮤지션의 합주실", options="드럼, 피아노, 보컬, 녹음실, 댄스"))
        self.assertEqual(k, ["band", "drum", "piano", "vocal", "recording", "dance"])

    def test_no_expression(self):
        self.assertEqual(classify_kinds(studio("스튜디오 A", options="주차가능, 단독홀")), [])
        self.assertEqual(classify_kinds({}), [])


class Rank(unittest.TestCase):
    def test_band_rank(self):
        self.assertEqual(band_rank(["band"]), 0)
        self.assertEqual(band_rank(["drum", "dance"]), 0)
        self.assertEqual(band_rank(["piano", "dance"]), 1)  # 피아노가 있으면 댄스 전용 아님
        self.assertEqual(band_rank(["vocal"]), 1)
        self.assertEqual(band_rank([]), 1)
        self.assertEqual(band_rank(["dance"]), 2)
        self.assertEqual(band_rank(["vocal", "dance"]), 2)  # 스펙: band·drum·piano가 없으면 댄스 전용


if __name__ == "__main__":
    unittest.main()
