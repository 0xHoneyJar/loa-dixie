#!/usr/bin/env bats
# =============================================================================
# compliance-hook.bats — ADVISORY compliance hook tests (FR-7)
# =============================================================================
# Tests the implement-gate.sh hook against various .run/ state scenarios.
# Part of cycle-049: Upstream Platform Alignment.

setup() {
    export PROJECT_ROOT=$(mktemp -d)
    export HOOKS_DIR="$BATS_TEST_DIRNAME/../../.claude/hooks/compliance"
    mkdir -p "$PROJECT_ROOT/.run"
}

teardown() {
    rm -rf "$PROJECT_ROOT"
}

# Helper: write sprint-plan state
write_sprint_state() {
    local state="$1"
    local plan_id="${2:-plan-test-123}"
    local last_activity="${3:-$(date -u +%Y-%m-%dT%H:%M:%SZ)}"
    cat > "$PROJECT_ROOT/.run/sprint-plan-state.json" << EOF
{
  "plan_id": "$plan_id",
  "state": "$state",
  "timestamps": {
    "started": "2026-03-18T00:00:00Z",
    "last_activity": "$last_activity"
  }
}
EOF
}

# =========================================================================
# T1: State file absent → ask (fail-ask for App Zone)
# =========================================================================

@test "App Zone write with no state files returns ask decision" {
    # No state files exist
    run bash -c 'echo "{\"tool_input\":{\"file_path\":\"src/index.ts\"}}" | PROJECT_ROOT="$1" "$2"' _ "$PROJECT_ROOT" "$HOOKS_DIR/implement-gate.sh"
    [ "$status" -eq 0 ]
    echo "$output" | grep -q "ADVISORY"
}

# =========================================================================
# T2: RUNNING + valid state → allow
# =========================================================================

@test "App Zone write with RUNNING state returns allow" {
    write_sprint_state "RUNNING"
    run bash -c 'echo "{\"tool_input\":{\"file_path\":\"src/index.ts\"}}" | PROJECT_ROOT="$1" "$2"' _ "$PROJECT_ROOT" "$HOOKS_DIR/implement-gate.sh"
    [ "$status" -eq 0 ]
    # Should NOT contain ADVISORY (silent allow)
    ! echo "$output" | grep -q "ADVISORY"
}

# =========================================================================
# T3: JACKED_OUT → ask
# =========================================================================

@test "App Zone write with JACKED_OUT state returns ask" {
    write_sprint_state "JACKED_OUT"
    run bash -c 'echo "{\"tool_input\":{\"file_path\":\"src/index.ts\"}}" | PROJECT_ROOT="$1" "$2"' _ "$PROJECT_ROOT" "$HOOKS_DIR/implement-gate.sh"
    [ "$status" -eq 0 ]
    echo "$output" | grep -q "ADVISORY"
}

# =========================================================================
# T4: HALTED → ask
# =========================================================================

@test "App Zone write with HALTED state returns ask" {
    write_sprint_state "HALTED"
    run bash -c 'echo "{\"tool_input\":{\"file_path\":\"src/index.ts\"}}" | PROJECT_ROOT="$1" "$2"' _ "$PROJECT_ROOT" "$HOOKS_DIR/implement-gate.sh"
    [ "$status" -eq 0 ]
    echo "$output" | grep -q "ADVISORY"
}

# =========================================================================
# T5: Stale state (>24h) → ask (integrity check)
# =========================================================================

@test "App Zone write with stale RUNNING state returns ask" {
    write_sprint_state "RUNNING" "plan-test-123" "2026-03-16T00:00:00Z"
    run bash -c 'echo "{\"tool_input\":{\"file_path\":\"src/index.ts\"}}" | PROJECT_ROOT="$1" "$2"' _ "$PROJECT_ROOT" "$HOOKS_DIR/implement-gate.sh"
    [ "$status" -eq 0 ]
    echo "$output" | grep -q "ADVISORY"
}

# =========================================================================
# T6: Missing plan_id → ask (integrity check, Red Team ATK-005)
# =========================================================================

@test "App Zone write with missing plan_id returns ask" {
    cat > "$PROJECT_ROOT/.run/sprint-plan-state.json" << 'EOF'
{
  "state": "RUNNING",
  "timestamps": {
    "last_activity": "2026-03-18T00:00:00Z"
  }
}
EOF
    run bash -c 'echo "{\"tool_input\":{\"file_path\":\"src/index.ts\"}}" | PROJECT_ROOT="$1" "$2"' _ "$PROJECT_ROOT" "$HOOKS_DIR/implement-gate.sh"
    [ "$status" -eq 0 ]
    echo "$output" | grep -q "ADVISORY"
}

# =========================================================================
# T7: Non-App-Zone write → always allow (no check)
# =========================================================================

@test "Non-App-Zone write always allowed regardless of state" {
    # No state files, writing to grimoires (State Zone)
    run bash -c 'echo "{\"tool_input\":{\"file_path\":\"grimoires/loa/notes.md\"}}" | PROJECT_ROOT="$1" "$2"' _ "$PROJECT_ROOT" "$HOOKS_DIR/implement-gate.sh"
    [ "$status" -eq 0 ]
    ! echo "$output" | grep -q "ADVISORY"
}
