#!/usr/bin/env bash
#
# Ensure BOTH macOS architectures' sharp binaries (x64 + arm64) are present in
# node_modules, so `npm run build:mac` can package an Intel and an Apple Silicon
# app. sharp ships prebuilt, architecture-specific binaries and `npm install`
# only fetches the ones matching the current machine — this fills in the other.
#
# Idempotent: packages already present are skipped, so it's a no-op (and needs
# no network) once both arches are in place. A later `npm install` prunes the
# non-host binaries, so this re-adds them on the next run.
#
set -euo pipefail

cd "$(dirname "$0")/.."

IMG_DIR="node_modules/@img"

if [ ! -d "node_modules/sharp" ]; then
  echo "sharp is not installed. Run 'npm install' first." >&2
  exit 1
fi

# The exact @img versions sharp expects, for both darwin architectures.
read_versions() {
  node -e '
    const opt = require("./node_modules/sharp/package.json").optionalDependencies || {};
    for (const n of [
      "@img/sharp-darwin-x64",
      "@img/sharp-darwin-arm64",
      "@img/sharp-libvips-darwin-x64",
      "@img/sharp-libvips-darwin-arm64",
    ]) if (opt[n]) console.log(n + " " + opt[n]);
  '
}

mkdir -p "$IMG_DIR"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

added=0
while read -r name version; do
  [ -z "$name" ] && continue
  short="${name#@img/}"                       # e.g. sharp-darwin-x64

  if [ -d "$IMG_DIR/$short" ]; then
    echo "  ok   $short (already present)"
    continue
  fi

  echo "  add  $name@$version"
  ( cd "$TMP" && npm pack "$name@$version" >/dev/null 2>&1 )
  tgz="$(ls "$TMP"/img-"$short"-*.tgz 2>/dev/null | head -1)"
  if [ -z "$tgz" ]; then
    echo "  !! failed to download $name@$version" >&2
    exit 1
  fi
  rm -rf "$TMP/package"
  tar -xzf "$tgz" -C "$TMP"
  rm -rf "$IMG_DIR/$short"
  mv "$TMP/package" "$IMG_DIR/$short"
  rm -f "$tgz"
  added=$((added + 1))
done < <(read_versions)

echo ""
echo "macOS sharp binaries ready ($added added). Present in $IMG_DIR:"
ls "$IMG_DIR" | grep -E 'sharp-(darwin|libvips-darwin)' | sed 's/^/  - /'
