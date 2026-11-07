#!/usr/bin/env bash
# Builds Seedwall.app (Apple silicon) into mac/build/.
#   ./build.sh                      ad-hoc signed, for local use
#   SIGN_ID="Developer ID Application: …" ./build.sh   signed for distribution (then notarise)
set -euo pipefail
cd "$(dirname "$0")"
# SwiftUI macros ship with Xcode, not the Command Line Tools.
if [ -z "${DEVELOPER_DIR:-}" ] && [ -d /Applications/Xcode.app ]; then export DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer; fi

swift build -c release --arch arm64
BIN="$(swift build -c release --arch arm64 --show-bin-path)/SeedwallBar"

APP=build/Seedwall.app
rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"
cp "$BIN" "$APP/Contents/MacOS/SeedwallBar"
cp Info.plist "$APP/Contents/Info.plist"

codesign --force --options runtime --timestamp=none --sign "${SIGN_ID:--}" "$APP"
echo "Built $APP"
echo "Zip for release:  ditto -c -k --keepParent $APP build/Seedwall.zip"
