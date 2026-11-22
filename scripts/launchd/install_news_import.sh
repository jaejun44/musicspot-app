#!/bin/bash
# 카드뉴스 → /news 자동 반영 설치(다시 실행해도 됨). 해제: 맨 아래 주석
# 맥 보안 때문에 launchd가 바탕화면 폴더를 직접 못 읽는다(Operation not permitted).
# bash·python에 전체 디스크 권한을 주는 대신, 이 일만 하는 작은 앱을 만들어 그 앱에만 "바탕화면 폴더" 접근을 허용한다.
set -eu
APP_DIR="$HOME/Applications/MusicSpotNewsImport.app"
SCRIPT="/Users/jaejunlee/Desktop/Music-Spot/musicspot_app/scripts/news_autoimport.sh"
PLIST_SRC="$(cd "$(dirname "$0")" && pwd)/com.musicspot.news-import.plist"
PLIST="$HOME/Library/LaunchAgents/com.musicspot.news-import.plist"
LABEL="com.musicspot.news-import"

mkdir -p "$HOME/Applications"
rm -rf "$APP_DIR"
/usr/bin/osacompile -o "$APP_DIR" -e "do shell script \"/bin/bash '$SCRIPT'\""
# 독(Dock)에 안 뜨게
/usr/libexec/PlistBuddy -c "Add :LSUIElement bool true" "$APP_DIR/Contents/Info.plist" 2>/dev/null || true
/usr/bin/codesign --force --sign - "$APP_DIR"

launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
cp "$PLIST_SRC" "$PLIST"
launchctl bootstrap "gui/$(id -u)" "$PLIST"
echo "설치 완료. 처음 한 번 'MusicSpotNewsImport이(가) 데스크탑 폴더에 접근하려고 합니다' 창이 뜨면 [허용]"
echo "로그: ~/Library/Logs/musicspot-news-import.log"

# 해제:
#   launchctl bootout gui/$(id -u)/com.musicspot.news-import
#   rm ~/Library/LaunchAgents/com.musicspot.news-import.plist
#   rm -rf ~/Applications/MusicSpotNewsImport.app
