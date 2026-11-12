"""
카드뉴스 캡션 파싱 (순수 함수 — 파일·DB·네트워크 없음). scripts/import_cardnews.py와 테스트가 같이 쓴다.

caption.txt 모양(슬롯마다 조금씩 다름):
  첫 줄 = 제목 / 본문 / "출처: …"(·"보도: …") / "사진: …"(·"이미지:", "사진·재킷:", "표지 사진:", "비주얼:" 등) / 해시태그 줄
원칙: 문장은 고치지 않는다. 줄을 제목·본문·출처·저작자·해시태그로 나누기만 한다.
"""

import re
from urllib.parse import urlparse

# "라벨: 내용" — 라벨은 짧고(25자 이하) URL이 아니다. 전각 콜론도 허용
LABEL_RE = re.compile(r"^\s*([^:：/]{1,25}?)\s*[:：]\s*(.*)$")
URL_RE = re.compile(r"https?://[^\s<>\"')\]]+")
HASHTAG_RE = re.compile(r"#[^\s#]+")

# 이미지 표기로 인정하는 라벨(2026-11-12 사용자 결정: 변형 표기 인정 — 사진·이미지·비주얼과 재킷·포스터 등 공식 자료 표기).
# 이 중 하나라도 있어야 가져온다. 표기가 전혀 없으면 건너뛴다
CREDIT_KEYS = ("사진", "이미지", "비주얼", "재킷", "포스터", "썸네일", "아트워크", "일러스트", "그래픽")
SOURCE_KEYS = ("출처", "보도")


def _label(line: str) -> str | None:
    m = LABEL_RE.match(line)
    if not m or URL_RE.match(line.strip()):
        return None
    return m.group(1)


def is_hashtag_line(line: str) -> bool:
    tokens = line.split()
    return bool(tokens) and all(t.startswith("#") and len(t) > 1 for t in tokens)


def is_credit_line(line: str) -> bool:
    label = _label(line)
    return bool(label) and any(k in label for k in CREDIT_KEYS)


# 이미지 출처 분류(news_posts.image_source_kind). 섞여 있으면 공식 자료(official)가 이긴다 — 나중에 official만 내리기 위해
OFFICIAL_RE = re.compile(r"공식|홍보|보도\s*사진|기사\s*이미지|게재|재킷|포스터|MV|캡처|썸네일|스틸|커버|official|press", re.I)
CC_RE = re.compile(r"wikimedia|commons|위키미디어|크리에이티브\s*커먼즈|\bCC\b|CC[ -]?BY|CC0|public\s*domain|퍼블릭\s*도메인", re.I)
ORIGINAL_RE = re.compile(r"MUSIC\s*SPOT|뮤직스팟|오리지널|자체", re.I)


def classify_credit(credit: str) -> str:
    """'cc'(Wikimedia·CC·퍼블릭 도메인 사진) | 'original'(MUSIC SPOT 자체 그래픽) | 'official'(레이블·밴드 공식 자료·재킷·포스터, 그 밖의 보도 사진)"""
    if OFFICIAL_RE.search(credit):
        return "official"
    if CC_RE.search(credit):
        return "cc"
    if ORIGINAL_RE.search(credit):
        return "original"
    return "official"


def is_source_line(line: str) -> bool:
    label = _label(line)
    # "출처·사진: …"처럼 둘 다면 저작자 표기 쪽으로 보낸다(출처 목록에는 URL만 따로 모음)
    return bool(label) and any(k in label for k in SOURCE_KEYS) and not is_credit_line(line)


def is_bare_url_line(line: str) -> bool:
    s = line.strip()
    return bool(URL_RE.fullmatch(s))


def parse_caption(text: str) -> dict:
    """caption.txt 원문 → {title, body, credit, source_lines, hashtags, urls}. credit이 ''이면 저작자 표기 없음"""
    text = text.replace("\r\n", "\n").replace("﻿", "")
    lines = text.split("\n")
    nonempty = [i for i, l in enumerate(lines) if l.strip()]
    if not nonempty:
        return {"title": "", "body": "", "credit": "", "source_lines": [], "hashtags": [], "urls": []}

    title_idx = nonempty[0]
    title = lines[title_idx].strip()
    hashtags: list[str] = []
    credit: list[str] = []
    sources: list[str] = []
    body: list[str] = []

    for i, raw in enumerate(lines):
        if i == title_idx:
            continue
        line = raw.strip()
        if not line:
            body.append("")
            continue
        if is_hashtag_line(line):
            for tag in HASHTAG_RE.findall(line):
                if tag not in hashtags:
                    hashtags.append(tag)
            continue
        if is_credit_line(line):
            credit.append(line)
            continue
        if is_source_line(line) or is_bare_url_line(line):
            sources.append(line)
            continue
        body.append(raw.rstrip())

    return {
        "title": title,
        "body": _squeeze_blank(body),
        "credit": "\n".join(credit),
        "source_lines": sources,
        "hashtags": hashtags,
        "urls": _unique(URL_RE.findall(text)),
    }


def _squeeze_blank(lines: list[str]) -> str:
    """앞뒤 빈 줄 제거, 연속 빈 줄은 하나로"""
    out: list[str] = []
    for l in lines:
        if not l.strip() and (not out or not out[-1].strip()):
            continue
        out.append(l)
    while out and not out[-1].strip():
        out.pop()
    return "\n".join(out)


def _unique(items: list[str]) -> list[str]:
    seen, out = set(), []
    for x in items:
        x = x.rstrip(".,")
        if x not in seen:
            seen.add(x)
            out.append(x)
    return out


def build_sources(parsed: dict, sources_md: str) -> list[dict]:
    """출처 jsonb: 캡션의 출처 줄(text) + 캡션·sources.md의 링크(url, label=도메인). 인스타 링크는 뺀다"""
    out: list[dict] = [{"text": l} for l in parsed["source_lines"] if not is_bare_url_line(l)]
    urls = _unique(parsed["urls"] + URL_RE.findall(sources_md or ""))
    for u in urls:
        host = urlparse(u).netloc.lower()
        if not host or "instagram.com" in host:
            continue
        out.append({"url": u, "label": host.removeprefix("www.")})
    return out


def slugify(text: str, max_words: int = 6, max_len: int = 60) -> str:
    """영문·숫자 단어만 남긴 소문자 하이픈 요약. 숫자만인 단어(날짜·개수)는 뺀다. 없으면 ''"""
    words = [w for w in re.findall(r"[a-z0-9]+", (text or "").lower()) if not w.isdigit()]
    out = ""
    for w in words[:max_words]:
        nxt = f"{out}-{w}" if out else w
        if len(nxt) > max_len:
            break
        out = nxt
    return out


# 매 글에 붙는 계정 공통 태그 — 요약에 쓰지 않는다
GENERIC_TAGS = {"musicspot", "band", "bandnews", "rock", "jrock", "jpop", "kpop"}


def make_slug(date: str, slot: str, topic: str | None, title: str, hashtags: list[str] | None = None) -> str:
    """<날짜>-<요약>. 요약은 manifest topic(영문) → 제목의 영문 → 영문 해시태그 → 슬롯 이름 순"""
    tags = " ".join(t.lstrip("#") for t in (hashtags or []) if t.lstrip("#").lower() not in GENERIC_TAGS)
    summary = slugify(topic or "") or slugify(title) or slugify(tags, max_words=3) or slugify(slot)
    return f"{date}-{summary}"
