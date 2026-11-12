"""
수집 데이터(price_info 원문)에서 값을 뽑는 규칙. import_merged.py 와 fix_studio_data.py 가 함께 쓴다.
앱 쪽 같은 규칙: lib/studio-price.ts hourlyPrice
"""

import re

HOURLY_PRICE_RE = re.compile(r"^시간당 ([\d,]+)원")
# 월 단위 신호: 월세·보증금·'월 30'·'월 대여'·'월,'로 시작·'58만원' 같은 만원 단위 금액(시간당 요금은 만원 단위로 안 씀)·장기
MONTHLY_RE = re.compile(r"월세|보증금|월\s*\d|월\s*대여|^월\s*,|\d\s*만\s*원|장기")
MONTHLY_NEGATED_RE = re.compile(r"월\s*대여\s*(?:는\s*)?불가")
HOURLY_RE = re.compile(r"시간당|시간|/h", re.IGNORECASE)


def parse_hourly_price(price_info) -> int | None:
    """'시간당 5,000원~ / 패키지 …' → 5000. 시간당으로 시작하지 않으면 None"""
    m = HOURLY_PRICE_RE.match(str(price_info or "").strip())
    if not m:
        return None
    won = int(m.group(1).replace(",", "") or 0)
    return won if won > 0 else None


def classify_room_type(source, price_info) -> str | None:
    """T=시간 단위, M=월 단위, both=둘 다. 스페이스클라우드는 전부 시간 단위.
    예전 규칙은 '시간' 글자만 있으면 T, '월'이 없으면(보증금만) 분류 못 함 → 뮬 59곳 누락·6곳 오분류"""
    if source == "spacecloud":
        return "T"
    price = str(price_info or "")
    monthly = bool(MONTHLY_RE.search(price)) and not MONTHLY_NEGATED_RE.search(price)
    hourly = bool(HOURLY_RE.search(price))
    if monthly and hourly:
        return "both"
    if monthly:
        return "M"
    if hourly:
        return "T"
    return None


# ─── 연습실 종류 분류 (2026-11-12) ─────────────────────────────
# 종류: band(밴드 합주 가능) · drum · piano · vocal · recording · dance
# 재료: 이름·options·notes·price_info 글자 + category(스페이스클라우드 태그) + has_drum
# band_rank: 0 = band 또는 drum / 1 = 그 외 / 2 = 댄스 전용(dance가 있고 band·drum·piano가 없음)
# 앱 정렬·필터·배지·noindex가 이 값을 쓴다(studios.kinds·band_rank, supabase/18_studio_kinds.sql)

KIND_ORDER = ("band", "drum", "piano", "vocal", "recording", "dance")

# 글자 표현. category 태그는 모든 곳에 '악기연습실'이 붙어 있어 band 판단에는 쓰지 않는다
KIND_TEXT_RE = {
    "band": re.compile(r"합주|밴드"),
    "drum": re.compile(r"드럼"),
    "piano": re.compile(r"피아노|건반|업라이트"),
    "vocal": re.compile(r"보컬|성악|노래"),
    "recording": re.compile(r"녹음|레코딩"),
    "dance": re.compile(r"댄스|안무|발레|무용|춤\s*연습|전신\s*거울"),
}
KIND_CATEGORY = {"vocal": "보컬연습실", "recording": "녹음실", "dance": "댄스연습실"}
# 부정 표현: "드럼 없음", "합주 불가", "밴드 연습 불가" — 같은 구절(쉼표·|·/ 전까지) 안에서만 본다
NEGATED_RE = {
    "band": re.compile(r"(?:합주|밴드)[^,|/\n]{0,8}(?:불가|금지|안\s*됨|안됩|없음|없어)"),
    "drum": re.compile(r"드럼[^,|/\n]{0,8}(?:불가|금지|안\s*됨|안됩|없음|없어|미보유)"),
}
# category의 '댄스연습실' 태그는 음악 연습실에도 붙어 있다 → 글자에 음악 표현이 있으면 태그만으로 dance로 보지 않는다
MUSIC_TEXT_RE = re.compile(r"음악|악기|노래|보컬|녹음|성악|뮤직|디제이|디제잉|DJ|오케스트라|합창", re.IGNORECASE)
# 밴드가 아닌 '합주': 현악·클래식·앙상블 합주
NOT_BAND_RE = re.compile(r"(?:현악|클래식|관현악|앙상블)\s*(?:앙상블\s*)?합주")


def _studio_text(studio: dict) -> str:
    return " ".join(str(studio.get(k) or "") for k in ("name", "options", "notes", "price_info"))


def _has_kind(kind: str, text: str) -> bool:
    if kind == "band":
        text = NOT_BAND_RE.sub(" ", text)
    neg = NEGATED_RE.get(kind)
    if neg:
        text = neg.sub(" ", text)
    return bool(KIND_TEXT_RE[kind].search(text))


def classify_kinds(studio: dict) -> list[str]:
    """연습실 한 곳 → 종류 목록(KIND_ORDER 순). has_drum이 참이면 band·drum"""
    text = _studio_text(studio)
    category = str(studio.get("category") or "")
    kinds = set()
    for kind in KIND_ORDER:
        if _has_kind(kind, text):
            kinds.add(kind)
        elif KIND_CATEGORY.get(kind) and KIND_CATEGORY[kind] in category:
            if kind == "dance" and MUSIC_TEXT_RE.search(text):
                continue
            kinds.add(kind)
    if studio.get("has_drum") is True:
        kinds.update(("band", "drum"))
    return [k for k in KIND_ORDER if k in kinds]


def band_rank(kinds: list[str]) -> int:
    if "band" in kinds or "drum" in kinds:
        return 0
    if "dance" in kinds and "piano" not in kinds:
        return 2
    return 1
