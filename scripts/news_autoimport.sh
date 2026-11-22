#!/bin/bash
# 인스타 게시가 끝난 카드뉴스를 /news에 자동 반영 (맥 launchd가 30분마다 실행)
# 설치·해제·문제 해결: docs/NEWS_PUBLISH.md "자동 반영"
# Cowork 카드뉴스 세션에는 musicspot_app 폴더가 연결돼 있지 않아 게시 직후 명령을 돌릴 수 없다 → 맥에서 돈다
set -u
APP="/Users/jaejunlee/Desktop/Music-Spot/musicspot_app"
SRC="/Users/jaejunlee/Desktop/musicSpot_cardnews/_active/daily"
PY="/Library/Frameworks/Python.framework/Versions/3.13/bin/python3"
LOG="$HOME/Library/Logs/musicspot-news-import.log"

notify() {  # 맥 알림 — 반영됐거나 실패했을 때만
  /usr/bin/osascript -e "display notification \"$2\" with title \"Music Spot 뉴스\" subtitle \"$1\"" >/dev/null 2>&1 || true
}

cd "$APP" || { echo "$(date '+%F %T') 실패: $APP 폴더에 들어갈 수 없음(전체 디스크 접근 권한 확인)" >>"$LOG"; notify "자동 반영 실패" "앱 폴더 접근 불가 — 로그 확인"; exit 1; }

OUT=$("$PY" scripts/import_cardnews.py --src "$SRC" --new-only --apply 2>&1)
CODE=$?
STAMP=$(date '+%F %T')

if [ $CODE -ne 0 ]; then
  { echo "$STAMP 실패(exit $CODE)"; echo "$OUT" | tail -15; } >>"$LOG"
  notify "자동 반영 실패" "$(echo "$OUT" | tail -1 | cut -c1-80)"
  exit $CODE
fi

if echo "$OUT" | grep -q "새로 올릴 글 없음"; then
  echo "$STAMP 새 글 없음" >>"$LOG"
else
  { echo "$STAMP 반영"; echo "$OUT" | grep "✓"; } >>"$LOG"
  notify "웹 반영 완료" "$(echo "$OUT" | grep -c "✓")개 글이 /news에 올라갔어요"
fi

# 로그는 최근 2000줄만
tail -n 2000 "$LOG" >"$LOG.tmp" 2>/dev/null && mv "$LOG.tmp" "$LOG"
