#!/usr/bin/env bash
#
# Downloads the MaxMind GeoLite2 City database into backend/data/.
#
# The .mmdb is not committed -- MaxMind's licence forbids redistributing it --
# so a deployed instance has no geolocation data unless it fetches its own copy
# at build time. Without it utils/geoip.py falls back to simulated locations,
# which is fine locally but makes the attack map meaningless in production.
#
# Requires a free MaxMind account:
#   https://www.maxmind.com/en/geolite2/signup
# Then set MAXMIND_LICENSE_KEY in the service's environment.
#
# No key set is not an error: the build continues and the app runs in
# simulated-location mode.
set -uo pipefail

DEST_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/data"
DEST="$DEST_DIR/GeoLite2-City.mmdb"

if [ -z "${MAXMIND_LICENSE_KEY:-}" ]; then
  echo "[geoip] MAXMIND_LICENSE_KEY not set - skipping download."
  echo "[geoip] The app will run with simulated attack locations."
  exit 0
fi

if [ -f "$DEST" ]; then
  echo "[geoip] $DEST already present - skipping download."
  exit 0
fi

mkdir -p "$DEST_DIR"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

URL="https://download.maxmind.com/app/geoip_download?edition_id=GeoLite2-City&license_key=${MAXMIND_LICENSE_KEY}&suffix=tar.gz"

echo "[geoip] Downloading GeoLite2-City..."
if ! curl -fsSL "$URL" -o "$TMP/geoip.tar.gz"; then
  echo "[geoip] Download failed (bad key, or rate limited)." >&2
  echo "[geoip] Continuing with simulated locations." >&2
  exit 0
fi

tar -xzf "$TMP/geoip.tar.gz" -C "$TMP"

FOUND="$(find "$TMP" -name 'GeoLite2-City.mmdb' -print -quit)"
if [ -z "$FOUND" ]; then
  echo "[geoip] Archive did not contain GeoLite2-City.mmdb." >&2
  exit 0
fi

mv "$FOUND" "$DEST"
echo "[geoip] Installed $DEST ($(du -h "$DEST" | cut -f1))"
