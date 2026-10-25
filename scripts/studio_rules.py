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
