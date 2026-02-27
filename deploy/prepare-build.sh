#!/usr/bin/env bash
# prepare-build.sh — Prepare loa-hounfour build artifacts for Docker context.
#
# Copies dist/, package.json, and package-lock.json from the sibling
# loa-hounfour directory into .hounfour-build/ at the project root.
# The Dockerfile COPYs this directory into the build context.
#
# Usage:
#   ./deploy/prepare-build.sh           # Build artifacts
#   ./deploy/prepare-build.sh --clean   # Remove artifacts

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
HOUNFOUR_SRC="$PROJECT_ROOT/../loa-hounfour"
HOUNFOUR_DEST="$PROJECT_ROOT/.hounfour-build"
EXPECTED_VERSION="${HOUNFOUR_VERSION:-8.2.0}"

# Safety: guard rm -rf target
guard_rm_target() {
  local target="$1"
  if [[ "$target" != *".hounfour-build" ]]; then
    echo "ERROR: rm -rf target '$target' does not end with .hounfour-build — aborting"
    exit 1
  fi
}

# Clean mode
if [[ "${1:-}" == "--clean" ]]; then
  guard_rm_target "$HOUNFOUR_DEST"
  rm -rf "$HOUNFOUR_DEST"
  echo "Cleaned $HOUNFOUR_DEST"
  exit 0
fi

# Validate hounfour source exists
if [[ ! -d "$HOUNFOUR_SRC" ]]; then
  echo "ERROR: loa-hounfour not found at $HOUNFOUR_SRC"
  echo "  Expected sibling directory: ../loa-hounfour"
  exit 1
fi

# Validate hounfour version
ACTUAL_VERSION=$(node -e "console.log(require('$HOUNFOUR_SRC/package.json').version)" 2>/dev/null)
if [[ "$ACTUAL_VERSION" != "$EXPECTED_VERSION" ]]; then
  echo "ERROR: loa-hounfour version mismatch"
  echo "  Expected: $EXPECTED_VERSION"
  echo "  Actual:   $ACTUAL_VERSION"
  echo "  Override: HOUNFOUR_VERSION=$ACTUAL_VERSION ./deploy/prepare-build.sh"
  exit 1
fi

# Clean previous build
guard_rm_target "$HOUNFOUR_DEST"
rm -rf "$HOUNFOUR_DEST"
mkdir -p "$HOUNFOUR_DEST"

# Copy package metadata
cp "$HOUNFOUR_SRC/package.json" "$HOUNFOUR_DEST/"
[[ -f "$HOUNFOUR_SRC/package-lock.json" ]] && cp "$HOUNFOUR_SRC/package-lock.json" "$HOUNFOUR_DEST/"

# Copy dist/ if it exists, otherwise build from source
if [[ -d "$HOUNFOUR_SRC/dist" ]]; then
  cp -r "$HOUNFOUR_SRC/dist" "$HOUNFOUR_DEST/dist"
  echo "Copied pre-built dist/ from loa-hounfour v$ACTUAL_VERSION"
else
  echo "No dist/ found — building from source..."

  # Verify Node version for build compatibility
  NODE_MAJOR=$(node -v | sed 's/v\([0-9]*\).*/\1/')
  if [[ "$NODE_MAJOR" -lt 22 ]]; then
    echo "WARNING: Node.js $NODE_MAJOR detected, build may require Node 22+"
  fi

  # Copy source for in-place build
  cp -r "$HOUNFOUR_SRC/src" "$HOUNFOUR_DEST/src"
  [[ -f "$HOUNFOUR_SRC/tsconfig.json" ]] && cp "$HOUNFOUR_SRC/tsconfig.json" "$HOUNFOUR_DEST/"

  # Install and build (correct ordering: install → build → cleanup)
  pushd "$HOUNFOUR_DEST" > /dev/null
  if [[ -f "package-lock.json" ]]; then
    npm ci --ignore-scripts
  else
    npm install --ignore-scripts
  fi
  npm run build
  popd > /dev/null

  # Remove source files and node_modules (keep only dist + metadata)
  rm -rf "$HOUNFOUR_DEST/src" "$HOUNFOUR_DEST/tsconfig.json" "$HOUNFOUR_DEST/node_modules"
  echo "Built from source and cleaned up"
fi

# Verify output
if [[ ! -d "$HOUNFOUR_DEST/dist" ]]; then
  echo "ERROR: Build failed — no dist/ in $HOUNFOUR_DEST"
  exit 1
fi

SIZE=$(du -sh "$HOUNFOUR_DEST" | cut -f1)
echo "✓ .hounfour-build/ ready ($SIZE) — loa-hounfour v$ACTUAL_VERSION"
