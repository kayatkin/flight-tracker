#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DATE="$(date +%Y%m%d)"
ARCHIVE="$(dirname "$ROOT")/flight-tracker-backup-${DATE}.tar.gz"

cd "$ROOT"

echo "Creating git tag v2.0.0-stable (if missing)..."
git tag -f v2.0.0-stable fda3ac7 2>/dev/null || true

echo "Creating archive: $ARCHIVE"
tar -czf "$ARCHIVE" \
  --exclude=node_modules \
  --exclude=dist \
  --exclude=build \
  --exclude=.git \
  -C "$(dirname "$ROOT")" "$(basename "$ROOT")"

echo "Done."
echo "  Tag:    v2.0.0-stable @ fda3ac7"
echo "  Branch: backup/pre-monetization-2026-05-19"
echo "  File:   $ARCHIVE"
