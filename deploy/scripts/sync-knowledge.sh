#!/usr/bin/env bash
# sync-knowledge.sh — Sync knowledge corpus from Docker image to shared EFS volume.
# Runs as an init container at deploy time.
# Idempotent: safe to run multiple times.
set -euo pipefail

SOURCE_DIR="${KNOWLEDGE_SOURCE_DIR:-/app/knowledge/sources}"
TARGET_DIR="${KNOWLEDGE_TARGET_DIR:-/data/knowledge/oracle}"
SOURCES_JSON="${SOURCE_DIR}/../sources.json"

echo "[sync-knowledge] Starting knowledge corpus sync"
echo "[sync-knowledge] Source: ${SOURCE_DIR}"
echo "[sync-knowledge] Target: ${TARGET_DIR}"

# Create target directory
mkdir -p "${TARGET_DIR}"

# Count source files
source_count=$(find "${SOURCE_DIR}" -name '*.md' -type f | wc -l)
echo "[sync-knowledge] Found ${source_count} source files"

if [[ "${source_count}" -eq 0 ]]; then
  echo "[sync-knowledge] WARNING: No source files found in ${SOURCE_DIR}"
  exit 1
fi

# Copy source files
cp -v "${SOURCE_DIR}"/*.md "${TARGET_DIR}/"

# Copy sources.json registry
if [[ -f "${SOURCES_JSON}" ]]; then
  cp -v "${SOURCES_JSON}" "${TARGET_DIR}/../sources.json"
  echo "[sync-knowledge] Copied sources.json registry"
else
  echo "[sync-knowledge] WARNING: sources.json not found at ${SOURCES_JSON}"
fi

# Verify sync
synced_count=$(find "${TARGET_DIR}" -name '*.md' -type f | wc -l)
echo "[sync-knowledge] Synced ${synced_count} sources to ${TARGET_DIR}"

if [[ "${synced_count}" -ne "${source_count}" ]]; then
  echo "[sync-knowledge] WARNING: Source count mismatch (expected ${source_count}, got ${synced_count})"
fi

echo "[sync-knowledge] Knowledge corpus sync complete"
