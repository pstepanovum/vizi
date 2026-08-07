#!/usr/bin/env bash
# One command: bump the version, build a signed Release archive, and upload it
# to App Store Connect (TestFlight). Fully local — no EAS.
#
#   npm run release            # same version, next build number
#   npm run release:patch      # 1.0.0 -> 1.0.1
#   npm run release:minor      # 1.0.0 -> 1.1.0
#   npm run release:major      # 1.0.0 -> 2.0.0
#
# Requires once in your shell (or a .env.release file next to this script):
#   ASC_ISSUER_ID   App Store Connect > Users and Access > Integrations
# Optional:
#   ASC_KEY_ID      defaults to YJFTFN8T6L
#   ASC_KEY_PATH    defaults to ../vizi-assets/apple/AuthKey_$ASC_KEY_ID.p8
#   SKIP_GIT=1      don't commit/tag/push the version bump
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
REPO_DIR="$(cd "$APP_DIR/.." && pwd)"
BUMP="${1:-build}"

# Optional local secrets file (gitignored) so the issuer id isn't retyped.
if [ -f "$APP_DIR/scripts/.env.release" ]; then
  # shellcheck disable=SC1091
  set -a && . "$APP_DIR/scripts/.env.release" && set +a
fi

ASC_KEY_ID="${ASC_KEY_ID:-YJFTFN8T6L}"
ASC_KEY_PATH="${ASC_KEY_PATH:-$REPO_DIR/vizi-assets/apple/AuthKey_${ASC_KEY_ID}.p8}"

: "${ASC_ISSUER_ID:?Set ASC_ISSUER_ID (App Store Connect > Users and Access > Integrations), or put it in vizi-mobile/scripts/.env.release}"
[ -f "$ASC_KEY_PATH" ] || { echo "API key not found: $ASC_KEY_PATH" >&2; exit 1; }

cd "$APP_DIR"

# A dirty tree means the archive would not match the tagged commit.
if [ "${SKIP_GIT:-0}" != "1" ] && [ -n "$(git -C "$REPO_DIR" status --porcelain)" ]; then
  echo "Working tree has uncommitted changes — commit or stash first (or SKIP_GIT=1)." >&2
  exit 1
fi

echo "==> Bumping version ($BUMP)"
read -r VERSION BUILD <<<"$(node scripts/bump-version.js "$BUMP")"
echo "    $VERSION (build $BUILD)"

echo "==> Syncing native project"
npx expo prebuild --platform ios

ARCHIVE_PATH="$APP_DIR/ios/build/Vizi.xcarchive"
EXPORT_DIR="$APP_DIR/ios/build/export"
EXPORT_PLIST="$APP_DIR/ios/build/export-options.plist"
mkdir -p "$APP_DIR/ios/build"
rm -rf "$ARCHIVE_PATH" "$EXPORT_DIR"

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

echo "==> Archiving (Release)"
xcodebuild -workspace ios/Vizi.xcworkspace -scheme Vizi -configuration Release \
  -destination 'generic/platform=iOS' -archivePath "$ARCHIVE_PATH" \
  "${AUTH_ARGS[@]}" archive

echo "==> Uploading to App Store Connect"
xcodebuild -exportArchive -archivePath "$ARCHIVE_PATH" \
  -exportOptionsPlist "$EXPORT_PLIST" -exportPath "$EXPORT_DIR" \
  "${AUTH_ARGS[@]}"

if [ "${SKIP_GIT:-0}" != "1" ]; then
  echo "==> Recording the release in git"
  git -C "$REPO_DIR" add vizi-mobile/app.json
  git -C "$REPO_DIR" commit -m "Release $VERSION (build $BUILD)"
  git -C "$REPO_DIR" tag "v$VERSION-$BUILD"
  git -C "$REPO_DIR" push
  git -C "$REPO_DIR" push --tags
fi

echo
echo "Uploaded $VERSION (build $BUILD). Processing takes a few minutes —"
echo "track it in App Store Connect > TestFlight."
