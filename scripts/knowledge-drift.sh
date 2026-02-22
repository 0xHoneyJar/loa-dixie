#!/usr/bin/env bash
#
# knowledge-drift.sh — "ArgoCD for knowledge"
#
# Parses <!-- upstream-source --> markers from knowledge source files
# and reports drift (days since last sync).
#
# Usage:
#   ./scripts/knowledge-drift.sh [--threshold DAYS] [--date YYYY-MM-DD] [--json]
#
# Exit codes:
#   0 — all files within threshold
#   1 — one or more files exceed drift threshold
#
# See: Sprint 17.1, deep-review build-next-3

set -euo pipefail

THRESHOLD=30
JSON_OUTPUT=false
SOURCES_DIR="$(cd "$(dirname "$0")/../knowledge/sources" && pwd)"
TODAY=""

# Parse arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    --threshold)
      THRESHOLD="$2"
      shift 2
      ;;
    --date)
      TODAY="$2"
      shift 2
      ;;
    --json)
      JSON_OUTPUT=true
      shift
      ;;
    -h|--help)
      echo "Usage: $0 [--threshold DAYS] [--date YYYY-MM-DD] [--json]"
      echo ""
      echo "Options:"
      echo "  --threshold DAYS      Maximum allowed drift in days (default: 30)"
      echo "  --date YYYY-MM-DD     Override today's date for deterministic testing"
      echo "  --json                Output machine-readable JSON"
      echo ""
      echo "Parses <!-- upstream-source --> markers and reports drift."
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      exit 2
      ;;
  esac
done

# Default to system date if --date not provided
if [[ -z "$TODAY" ]]; then
  TODAY=$(date -u +%Y-%m-%d)
fi

# Compute days between two dates (YYYY-MM-DD)
days_between() {
  local d1="$1" d2="$2"
  local s1 s2

  # Use portable date calculation
  if date --version >/dev/null 2>&1; then
    # GNU date
    s1=$(date -d "$d1" +%s)
    s2=$(date -d "$d2" +%s)
  else
    # BSD/macOS date
    s1=$(date -j -f "%Y-%m-%d" "$d1" +%s 2>/dev/null || echo 0)
    s2=$(date -j -f "%Y-%m-%d" "$d2" +%s 2>/dev/null || echo 0)
  fi

  echo $(( (s2 - s1) / 86400 ))
}

# Collect results
declare -a results=()
has_stale=false
total=0
stale_count=0

# Scan all markdown files for upstream-source markers
for file in "$SOURCES_DIR"/*.md; do
  [[ -f "$file" ]] || continue

  # Extract upstream-source marker
  marker=$(grep -o '<!-- upstream-source: [^>]*-->' "$file" 2>/dev/null || true)
  [[ -z "$marker" ]] && continue

  total=$((total + 1))
  filename=$(basename "$file")

  # Parse marker: <!-- upstream-source: REPO:BRANCH | generated: BOOL | last-synced: DATE -->
  repo=$(echo "$marker" | sed 's/.*upstream-source: \([^|]*\)|.*/\1/' | xargs)
  last_synced=$(echo "$marker" | grep -o 'last-synced: [0-9-]*' | sed 's/last-synced: //')

  if [[ -z "$last_synced" ]]; then
    drift_days=-1
    status="unknown"
  else
    drift_days=$(days_between "$last_synced" "$TODAY")
    if [[ $drift_days -gt $THRESHOLD ]]; then
      status="stale"
      has_stale=true
      stale_count=$((stale_count + 1))
    else
      status="ok"
    fi
  fi

  results+=("$filename|$repo|$last_synced|$drift_days|$status")
done

# Output
if $JSON_OUTPUT; then
  echo "{"
  echo "  \"threshold\": $THRESHOLD,"
  echo "  \"today\": \"$TODAY\","
  echo "  \"total\": $total,"
  echo "  \"stale\": $stale_count,"
  echo "  \"ok\": $((total - stale_count)),"
  echo "  \"files\": ["

  first=true
  for result in "${results[@]}"; do
    IFS='|' read -r fname repo synced drift stat <<< "$result"
    $first || echo ","
    first=false
    printf '    {"file": "%s", "repo": "%s", "last_synced": "%s", "drift_days": %s, "status": "%s"}' \
      "$fname" "$repo" "$synced" "$drift" "$stat"
  done

  echo ""
  echo "  ]"
  echo "}"
else
  echo "Knowledge Drift Report"
  echo "======================"
  echo "Threshold: $THRESHOLD days"
  echo "Date: $TODAY"
  echo ""
  printf "%-35s %-40s %-12s %8s %8s\n" "FILE" "REPO" "LAST-SYNCED" "DRIFT" "STATUS"
  printf "%-35s %-40s %-12s %8s %8s\n" "----" "----" "-----------" "-----" "------"

  for result in "${results[@]}"; do
    IFS='|' read -r fname repo synced drift stat <<< "$result"
    if [[ "$stat" == "stale" ]]; then
      printf "%-35s %-40s %-12s %6sd  \033[31m%s\033[0m\n" "$fname" "$repo" "$synced" "$drift" "$stat"
    else
      printf "%-35s %-40s %-12s %6sd  \033[32m%s\033[0m\n" "$fname" "$repo" "$synced" "$drift" "$stat"
    fi
  done

  echo ""
  echo "Summary: $((total - stale_count))/$total within threshold ($stale_count stale)"
fi

# Exit code
if $has_stale; then
  exit 1
else
  exit 0
fi
