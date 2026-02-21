#!/usr/bin/env bash
# Knowledge Corpus Coverage Report
# Reports source count by tag, repo coverage, and token budget utilization.
# Output is structured text suitable for inclusion in bridge reviews.
#
# Usage: ./scripts/knowledge-coverage.sh [--json]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SOURCES_JSON="$PROJECT_ROOT/knowledge/sources.json"
SOURCES_DIR="$PROJECT_ROOT/knowledge/sources"

if [[ ! -f "$SOURCES_JSON" ]]; then
  echo "ERROR: sources.json not found at $SOURCES_JSON" >&2
  exit 1
fi

# Parse sources.json
corpus_version=$(jq -r '.corpus_version // 0' "$SOURCES_JSON")
total_sources=$(jq '.sources | length' "$SOURCES_JSON")
required_sources=$(jq '[.sources[] | select(.required == true)] | length' "$SOURCES_JSON")
total_budget=$(jq '.default_budget_tokens' "$SOURCES_JSON")

# Tag distribution
echo "════════════════════════════════════════════════════════════"
echo "  Knowledge Corpus Coverage Report"
echo "  Corpus Version: $corpus_version"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "Sources: $total_sources total ($required_sources required)"
echo ""

echo "── By Tag ──────────────────────────────────────────────────"
# Get unique tags and count sources per tag
jq -r '[.sources[].tags[]] | group_by(.) | map({tag: .[0], count: length}) | sort_by(-.count) | .[] | "  \(.tag): \(.count) sources"' "$SOURCES_JSON"
echo ""

# Repository coverage — which repos have dedicated code-reality files
echo "── Repository Coverage ─────────────────────────────────────"
KNOWN_REPOS=("loa" "loa-finn" "loa-freeside" "loa-hounfour" "loa-dixie")

for repo in "${KNOWN_REPOS[@]}"; do
  # Check for code-reality file
  short_name="${repo#loa-}"
  if [[ "$repo" == "loa" ]]; then
    short_name="loa"
  fi

  cr_file="$SOURCES_DIR/code-reality-${short_name}.md"
  arch_file="$SOURCES_DIR/${short_name}-architecture.md"
  dixie_arch="$SOURCES_DIR/dixie-architecture.md"

  if [[ -f "$cr_file" ]]; then
    echo "  $repo: code-reality ✓"
  elif [[ -f "$arch_file" ]]; then
    echo "  $repo: architecture ✓"
  elif [[ "$short_name" == "dixie" && -f "$dixie_arch" ]]; then
    echo "  $repo: architecture ✓"
  else
    echo "  $repo: NO DEDICATED SOURCE ✗"
  fi
done
echo ""

# Token budget utilization
echo "── Token Budget ────────────────────────────────────────────"
total_max_tokens=$(jq '[.sources[].maxTokens] | add' "$SOURCES_JSON")
total_actual_tokens=0

while IFS= read -r source_path; do
  filename=$(basename "$source_path")
  filepath="$SOURCES_DIR/$filename"
  if [[ -f "$filepath" ]]; then
    chars=$(wc -c < "$filepath")
    tokens=$(( (chars + 3) / 4 )) # rough: 4 chars per token
    total_actual_tokens=$((total_actual_tokens + tokens))
  fi
done < <(jq -r '.sources[].path' "$SOURCES_JSON")

echo "  Budget: $total_budget tokens"
echo "  Max allocated: $total_max_tokens tokens"
echo "  Actual estimated: $total_actual_tokens tokens"

if [[ $total_budget -gt 0 ]]; then
  utilization=$(( (total_actual_tokens * 100) / total_budget ))
  echo "  Utilization: ${utilization}%"
fi
echo ""

# Freshness summary
echo "── Freshness ───────────────────────────────────────────────"
today=$(date +%Y-%m-%d)
today_epoch=$(date -d "$today" +%s 2>/dev/null || date -j -f "%Y-%m-%d" "$today" +%s 2>/dev/null || echo "0")

healthy=0
stale=0

while IFS=$'\t' read -r id last_updated max_age; do
  if [[ -z "$last_updated" || "$last_updated" == "null" ]]; then
    stale=$((stale + 1))
    continue
  fi
  lu_epoch=$(date -d "$last_updated" +%s 2>/dev/null || date -j -f "%Y-%m-%d" "$last_updated" +%s 2>/dev/null || echo "0")
  age_days=$(( (today_epoch - lu_epoch) / 86400 ))
  if [[ $age_days -gt $max_age ]]; then
    stale=$((stale + 1))
  else
    healthy=$((healthy + 1))
  fi
done < <(jq -r '.sources[] | [.id, .last_updated, .max_age_days] | @tsv' "$SOURCES_JSON")

echo "  Healthy: $healthy"
echo "  Stale: $stale"
echo ""
echo "════════════════════════════════════════════════════════════"
