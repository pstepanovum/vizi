#!/usr/bin/env bash
# Archive, sign, and upload Vizi to TestFlight — fully local, no EAS.
#
# Requires: Xcode, an App Store Connect API key (.p8) with App Manager access.
#
# Usage:
#   ASC_ISSUER_ID=<issuer-uuid> ./scripts/testflight-ios.sh
#
# Optional overrides:
#   ASC_KEY_ID    (default: YJFTFN8T6L)
#   ASC_KEY_PATH  (default: ../vizi-assets/apple/AuthKey_$ASC_KEY_ID.p8)
#
# The Issuer ID lives in App Store Connect → Users and Access → Integrations.
# Bump "buildNumber" in app.json before each upload — TestFlight rejects reused
# build numbers for the same version.
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ASC_KEY_ID="${ASC_KEY_ID:-YJFTFN8T6L}"
ASC_KEY_PATH="${ASC_KEY_PATH:-$APP_DIR/../vizi-assets/apple/AuthKey_${ASC_KEY_ID}.p8}"
: "${ASC_ISSUER_ID:?Set ASC_ISSUER_ID (App Store Connect → Users and Access → Integrations)}"

[ -f "$ASC_KEY_PATH" ] || { echo "API key not found: $ASC_KEY_PATH" >&2; exit 1; }

cd "$APP_DIR"

if [ ! -d ios ]; then
  npx expo prebuild --platform ios
fi

ARCHIVE_PATH="$APP_DIR/ios/build/Vizi.xcarchive"
EXPORT_PLIST="$APP_DIR/ios/build/export-options.plist"

mkdir -p "$APP_DIR/ios/build"
cat > "$EXPORT_PLIST" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>method</key><string>app-store-connect</string>
  <key>destination</key><string>upload</string>
  <key>signingStyle</key><string>automatic</string>
</dict>
</plist>
PLIST

AUTH_ARGS=(
  -allowProvisioningUpdates
  -authenticationKeyPath "$ASC_KEY_PATH"
  -authenticationKeyID "$ASC_KEY_ID"
  -authenticationKeyIssuerID "$ASC_ISSUER_ID"
)

xcodebuild -workspace ios/Vizi.xcworkspace -scheme Vizi -configuration Release \
  -destination 'generic/platform=iOS' -archivePath "$ARCHIVE_PATH" \
  "${AUTH_ARGS[@]}" archive

xcodebuild -exportArchive -archivePath "$ARCHIVE_PATH" \
  -exportOptionsPlist "$EXPORT_PLIST" -exportPath "$APP_DIR/ios/build/export" \
  "${AUTH_ARGS[@]}"

echo "Uploaded. Track processing in App Store Connect → TestFlight."
