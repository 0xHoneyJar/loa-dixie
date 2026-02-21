#!/usr/bin/env bash
#
# corpus-diff.sh — "git log --stat for knowledge"
#
# Compares current knowledge corpus against a git ref to show what changed.
# Reports: sources added/removed/updated, corpus_version delta, new events.
#
# Usage:
#   ./scripts/corpus-diff.sh [--ref COMMIT] [--json]
#
# Exit code: always 0 (informational, not a gate)
#
# See: Sprint 17.3, deep-review build-next-2 extension

set -euo pipefail

REF="HEAD~1"
JSON_OUTPUT=false
SOURCES_JSON="knowledge/sources.json"
EVENTS_JSON="knowledge/corpus-events.json"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    --ref)
      REF="$2"
      shift 2
      ;;
    --json)
      JSON_OUTPUT=true
      shift
      ;;
    -h|--help)
      echo "Usage: $0 [--ref COMMIT] [--json]"
      echo ""
      echo "Options:"
      echo "  --ref COMMIT  Git ref to compare against (default: HEAD~1)"
      echo "  --json        Output machine-readable JSON"
      echo ""
      echo "Compares current corpus against a git ref."
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      exit 2
      ;;
  esac
done

# Get current and ref versions of sources.json
current_sources=$(cat "$SOURCES_JSON" 2>/dev/null || echo '{"sources":[]}')
ref_sources=$(git show "$REF:$SOURCES_JSON" 2>/dev/null || echo '{"sources":[]}')

# Extract source IDs
current_ids=$(echo "$current_sources" | jq -r '.sources[].id' 2>/dev/null | sort)
ref_ids=$(echo "$ref_sources" | jq -r '.sources[].id' 2>/dev/null | sort)

# Diff
added=$(comm -23 <(echo "$current_ids") <(echo "$ref_ids") 2>/dev/null || true)
removed=$(comm -13 <(echo "$current_ids") <(echo "$ref_ids") 2>/dev/null || true)

# Version delta
current_version=$(echo "$current_sources" | jq -r '.corpus_version // 0')
ref_version=$(echo "$ref_sources" | jq -r '.corpus_version // 0')

# Budget delta
current_budget=$(echo "$current_sources" | jq -r '.default_budget_tokens // 0')
ref_budget=$(echo "$ref_sources" | jq -r '.default_budget_tokens // 0')

# Updated sources (last_updated changed)
updated=""
for id in $(comm -12 <(echo "$current_ids") <(echo "$ref_ids") 2>/dev/null); do
  current_date=$(echo "$current_sources" | jq -r --arg id "$id" '.sources[] | select(.id == $id) | .last_updated // ""')
  ref_date=$(echo "$ref_sources" | jq -r --arg id "$id" '.sources[] | select(.id == $id) | .last_updated // ""')
  if [[ "$current_date" != "$ref_date" ]]; then
    updated="${updated}${id} (${ref_date} → ${current_date})\n"
  fi
done

# New events since ref
current_events=$(cat "$EVENTS_JSON" 2>/dev/null || echo '{"events":[]}')
ref_events=$(git show "$REF:$EVENTS_JSON" 2>/dev/null || echo '{"events":[]}')
ref_max_seq=$(echo "$ref_events" | jq '[.events[].seq] | max // 0')
new_events=$(echo "$current_events" | jq --argjson maxseq "$ref_max_seq" '[.events[] | select(.seq > $maxseq)]')
new_event_count=$(echo "$new_events" | jq 'length')

# Output
if $JSON_OUTPUT; then
  added_json=$(echo "$added" | jq -R -s 'split("\n") | map(select(. != ""))')
  removed_json=$(echo "$removed" | jq -R -s 'split("\n") | map(select(. != ""))')

  cat <<JSONEOF
{
  "ref": "$REF",
  "corpus_version": {"from": $ref_version, "to": $current_version},
  "default_budget_tokens": {"from": $ref_budget, "to": $current_budget},
  "sources_added": $added_json,
  "sources_removed": $(echo "$removed" | jq -R -s 'split("\n") | map(select(. != ""))'),
  "sources_updated_count": $(echo -e "$updated" | grep -c . 2>/dev/null || echo 0),
  "new_events": $new_events,
  "new_event_count": $new_event_count
}
JSONEOF
else
  echo "Corpus Diff: current vs $REF"
  echo "=============================="
  echo ""

  if [[ "$current_version" != "$ref_version" ]]; then
    echo "Version: $ref_version → $current_version"
  else
    echo "Version: $current_version (unchanged)"
  fi

  if [[ "$current_budget" != "$ref_budget" ]]; then
    echo "Budget: $ref_budget → $current_budget tokens"
  fi

  echo ""

  if [[ -n "$added" ]]; then
    echo "Sources Added:"
    echo "$added" | while read -r id; do
      [[ -n "$id" ]] && echo "  + $id"
    done
    echo ""
  fi

  if [[ -n "$removed" ]]; then
    echo "Sources Removed:"
    echo "$removed" | while read -r id; do
      [[ -n "$id" ]] && echo "  - $id"
    done
    echo ""
  fi

  if [[ -n "$updated" ]]; then
    echo "Sources Updated:"
    echo -e "$updated" | while read -r line; do
      [[ -n "$line" ]] && echo "  ~ $line"
    done
    echo ""
  fi

  if [[ "$new_event_count" -gt 0 ]]; then
    echo "New Events ($new_event_count):"
    echo "$new_events" | jq -r '.[] | "  [seq \(.seq)] \(.type): \(.detail[0:80])"'
    echo ""
  fi

  total_added=$(echo "$added" | grep -c . 2>/dev/null || echo 0)
  total_removed=$(echo "$removed" | grep -c . 2>/dev/null || echo 0)
  total_updated=$(echo -e "$updated" | grep -c . 2>/dev/null || echo 0)

  echo "Summary: +$total_added -$total_removed ~$total_updated sources, $new_event_count new events"
fi

exit 0
