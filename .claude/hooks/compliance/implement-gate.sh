#!/usr/bin/env bash
# =============================================================================
# implement-gate.sh — ADVISORY compliance hook for App Zone writes (FR-7)
# =============================================================================
# Checks whether Write/Edit to App Zone files occurs within an active
# /implement or /bug skill invocation by reading .run/ state files.
#
# This is an ADVISORY hook — detection relies on heuristic state files,
# not authoritative platform context. Labeled ADVISORY in all output.
#
# Failure mode: FAIL-ASK for App Zone writes (not fail-open).
# Non-App-Zone writes always allowed.
#
# IMPORTANT: No set -euo pipefail — hook must never crash-block.
# Parse/read errors on App Zone writes → ask (not allow).
#
# Part of cycle-049: Upstream Platform Alignment (FR-7)
# Red Team findings addressed: ATK-005 (state tampering), ATK-006 (fail-open),
#   ATK-007 (prompt injection via file path)
# =============================================================================

# Read tool input from stdin
input=$(cat 2>/dev/null) || input=""

# Extract file path from tool input (Write or Edit)
file_path=$(echo "$input" | jq -r '.tool_input.file_path // empty' 2>/dev/null) || file_path=""

# If we can't determine the file path, allow (can't evaluate)
if [[ -z "$file_path" ]]; then
    exit 0
fi

# ---------------------------------------------------------------------------
# Zone check: Is this an App Zone write?
# App Zone: src/, lib/, app/ (relative paths)
# ---------------------------------------------------------------------------
is_app_zone=false
case "$file_path" in
    src/*|lib/*|app/*)
        is_app_zone=true
        ;;
    */src/*|*/lib/*|*/app/*)
        is_app_zone=true
        ;;
esac

# Non-App-Zone writes always allowed
if [[ "$is_app_zone" == "false" ]]; then
    exit 0
fi

# ---------------------------------------------------------------------------
# State check: Is an /implement or /bug skill currently active?
# Check .run/sprint-plan-state.json and .run/simstim-state.json
# ---------------------------------------------------------------------------
PROJECT_ROOT="${PROJECT_ROOT:-$(pwd)}"
RUN_DIR="$PROJECT_ROOT/.run"

check_implementation_active() {
    # Check sprint-plan state
    if [[ -f "$RUN_DIR/sprint-plan-state.json" ]]; then
        local state plan_id last_activity
        state=$(jq -r '.state // empty' "$RUN_DIR/sprint-plan-state.json" 2>/dev/null) || return 1
        plan_id=$(jq -r '.plan_id // empty' "$RUN_DIR/sprint-plan-state.json" 2>/dev/null) || true

        # Integrity: must have plan_id
        if [[ -z "$plan_id" ]]; then
            return 1
        fi

        # Integrity: check staleness (24h = 86400s)
        # Portable date-to-epoch: try GNU date -d, then macOS date -jf, then skip
        last_activity=$(jq -r '.timestamps.last_activity // empty' "$RUN_DIR/sprint-plan-state.json" 2>/dev/null) || true
        if [[ -n "$last_activity" ]]; then
            local now last_epoch
            now=$(date +%s 2>/dev/null) || now=0
            last_epoch=$(date -d "$last_activity" +%s 2>/dev/null ||
                         date -jf '%Y-%m-%dT%H:%M:%SZ' "$last_activity" +%s 2>/dev/null) || last_epoch=0
            if [[ $now -gt 0 && $last_epoch -gt 0 ]]; then
                local age=$((now - last_epoch))
                if [[ $age -gt 86400 ]]; then
                    return 1  # Stale state (>24h)
                fi
            fi
        fi

        if [[ "$state" == "RUNNING" ]]; then
            return 0
        fi
    fi

    # Check simstim state
    if [[ -f "$RUN_DIR/simstim-state.json" ]]; then
        local phase
        phase=$(jq -r '.phase // empty' "$RUN_DIR/simstim-state.json" 2>/dev/null) || return 1
        if [[ "$phase" == "implementation" ]]; then
            return 0
        fi
    fi

    # Check run state
    if [[ -f "$RUN_DIR/state.json" ]]; then
        local run_state
        run_state=$(jq -r '.state // empty' "$RUN_DIR/state.json" 2>/dev/null) || return 1
        if [[ "$run_state" == "RUNNING" ]]; then
            return 0
        fi
    fi

    return 1
}

# ---------------------------------------------------------------------------
# Decision: allow or ask
# ---------------------------------------------------------------------------
if check_implementation_active; then
    # Implementation is active — allow the write
    exit 0
else
    # No active implementation detected — ADVISORY ask
    echo "[ADVISORY] App Zone write to '$file_path' detected outside active /implement or /bug." >&2
    echo "No RUNNING state found in .run/ state files. This may bypass review gates." >&2
    echo '{"decision":"ask","reason":"[ADVISORY] App Zone write outside active implementation. Verify this is intentional."}'
    exit 0
fi
