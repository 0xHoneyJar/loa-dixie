# Engineer Feedback — Sprints 105-107 (Cycle-050)

**Reviewer**: Senior Tech Lead (adversarial review)
**Date**: 2026-03-20
**Verdict**: **Changes required**

---

## Overall Assessment

The implementation delivers meaningful infrastructure: a capability taxonomy for multi-model permission architecture, validation tooling, and complete SKILL.md annotation. The architectural intent is sound and the SDD alignment is good. However, the review uncovered **3 critical bugs**, **1 acceptance-criteria failure**, and several non-trivial consistency issues that must be addressed before merge.

All 14 unit tests pass, both scripts execute, and 25/25 skills are annotated with `schema_version: 1`. The foundation is solid but the edge cases are where security properties break down.

---

## Critical Issues (Must Fix)

### CRIT-1: `has_tool()` substring matching vulnerability — security bypass

**File**: `.claude/scripts/validate-skill-capabilities.sh:104-107`
**Severity**: Critical (security)

```bash
has_tool() {
    local allowed="$1" tool="$2"
    echo "$allowed" | grep -qiF "$tool"
}
```

`grep -qiF` matches **substrings**, not whole words. If a future tool is named `WriteConfig`, `EditHistory`, or `WebSearchExtended`, the validator would produce false positives, masking real security violations.

Demonstrated:
```
echo "Read, WriteConfig, Glob" | grep -qiF "Write"  # MATCHES (false positive)
echo "Read, EditConfig, Glob" | grep -qiF "Edit"     # MATCHES (false positive)
```

While no current tool names trigger this (today's tool set is `Read`, `Write`, `Edit`, `Grep`, `Glob`, `WebFetch`, `WebSearch`, `Bash`, `AskUserQuestion`, `Agent`, `TaskCreate`, `TaskUpdate`), the validator is designed to enforce **security invariants**. A substring-matching security gate is a latent vulnerability.

**Fix**: Use word-boundary matching. Replace `grep -qiF "$tool"` with `grep -qiwF "$tool"` (whole-word match with `-w`), or better yet, tokenize the comma-separated list and compare elements.

### CRIT-2: `validate_skill()` counter bug — `passed` increments even when `errors` did

**File**: `.claude/scripts/validate-skill-capabilities.sh:228-239`

The cost-profile correlation check at lines 229-235 calls `log_warning()`, which in `--strict` mode delegates to `log_error()` (incrementing the `errors` counter). However, the calling code at lines 229-235 does **not** set `has_error=true`. The check at line 237 (`if has_error == false`) then calls `log_pass()`, incrementing `passed`.

Result in `--strict` mode for `translating-for-executives`:
```json
{"total": 1, "passed": 1, "errors": 1, ...}
```

A skill cannot simultaneously pass and fail. The JSON consumer has no way to interpret this correctly.

**Fix**: After the `log_warning` call at line 233, add `has_error=true` (or restructure so `log_warning` in strict mode sets `has_error` via a return value). The same pattern should be checked for any future `log_warning` call sites.

### CRIT-3: `_date_to_epoch("")` returns current time instead of failing

**File**: `.claude/scripts/compat-lib.sh:427-455`

```bash
_date_to_epoch ""
# Returns: 1773925200 (current epoch!) with exit code 0
```

GNU `date -d ""` interprets the empty string as "now" and returns the current time. The function has no input validation, so an empty or missing timestamp produces a silently wrong result instead of an error. This will cause staleness checks in `implement-gate.sh` to compute incorrect age values when timestamps are missing from state files.

**Fix**: Add input validation at the top of `_date_to_epoch`:
```bash
if [[ -z "$timestamp" ]]; then
    echo ""
    return 1
fi
```

---

## Acceptance Criteria Failures

### AC-FAIL-1: `--strict` mode does not pass for all 25 skills

Sprint 107 acceptance criterion states: "Validation passes in --strict mode."

Actual result:
```
$ validate-skill-capabilities.sh --strict
translating-for-executives: ERROR: cost-profile: lightweight but capabilities.write_files: true
Results: 25 skills checked, 25 passed, 1 errors, 0 warnings
```

The `translating-for-executives` skill declares `cost-profile: lightweight` but `capabilities.write_files: true`. Either:
- Upgrade its `cost-profile` to `moderate` (it does write output), or
- Downgrade `write_files` to `false` (if it's truly read-only analysis that doesn't write)

Given it has `Write` in `allowed-tools`, `cost-profile: moderate` is the correct fix.

### AC-FAIL-2: Rule lifecycle validator fails against actual codebase

The 3 existing rule files (`.claude/rules/shell-conventions.md`, `zone-state.md`, `zone-system.md`) lack the `origin`, `version`, and `enacted_by` fields. Running the validator:
```
Results: 3 rules checked, 0 passed, 9 errors
```

The SDD describes these as "existing rules" that should be annotated. Either the rules need lifecycle metadata added, or the validator needs a grace period/migration flag. Without this, the validator cannot be added to CI.

---

## Non-Critical Improvements

### NC-1: `_COMPAT_LIB_VERSION` assigned twice

**File**: `.claude/scripts/compat-lib.sh:43` and `:461`

The variable is set to `"1.0.0"` at line 43 and overwritten to `"1.1.0"` at line 461. The first assignment is dead code. Remove line 43 or consolidate to a single assignment.

### NC-2: `validate-rule-lifecycle.sh` frontmatter extraction leaks body content

**File**: `.claude/scripts/validate-rule-lifecycle.sh:68-69`

The `sed -n '/^---$/,/^---$/p'` pattern captures all `---` pairs, not just the first. If a rule's markdown body contains `---` (horizontal rules, nested frontmatter examples), the sed extraction captures body content into the "frontmatter" variable. The `awk` approach in `validate-skill-capabilities.sh` (line 132) does not have this bug.

**Fix**: Use the same `awk '/^---$/{if(n++) exit; next} n'` pattern that `validate-skill-capabilities.sh` uses, or add `| head -1` logic to the sed range.

### NC-3: `validate-rule-lifecycle.sh` missing `--strict` flag

The acceptance criteria mention "both support --json" and "--strict promotes warnings to errors." The skill capabilities validator supports `--strict`, but the rule lifecycle validator does not. The rule validator only produces errors (no warnings), so `--strict` is arguably unnecessary, but the interface asymmetry is confusing.

### NC-4: Inconsistent `execute_commands` representation across skills

Three skills have commands in `allowed-tools` that are missing from `capabilities.execute_commands.allowed`:

| Skill | In `allowed-tools` | Missing from `capabilities.execute_commands.allowed` |
|-------|-------------------|------------------------------------------------------|
| `eval-running` | `Bash(evals/harness/*)` | Yes (only lists `bats`) |
| `rtfm-testing` | `Bash(.claude/scripts/rtfm-*)` | Yes (only lists `bats`, `npm`) |
| `butterfreezone-gen` | N/A | Uses paths in `command:` field |

The validator does not cross-check `Bash(...)` entries in `allowed-tools` against `execute_commands.allowed` entries. This is a coverage gap.

### NC-5: `butterfreezone-gen` violates documented grammar

The permissions reference states: "command: executable name only (no paths, no shell builtins)." But `butterfreezone-gen` uses:
```yaml
command: ".claude/scripts/butterfreezone-gen.sh"
```

This is a relative path, not an executable name. The validator does not enforce this constraint.

### NC-6: 14 skills lack `allowed-tools` entirely, bypassing consistency checks

Skills without `allowed-tools` skip the capabilities-vs-tools consistency check entirely (line 199: `if [[ -n "$allowed_tools" && ...`). This includes critical skills like `implementing-tasks`, `autonomous-agent`, `run-mode`, `run-bridge`, and `bridgebuilder-review`. The consistency check is only as strong as its coverage.

### NC-7: No test for `_date_to_epoch`

The new function added to `compat-lib.sh` has no unit test in any `.bats` file. The existing test suite does not cover it. At minimum, tests should cover: valid ISO 8601, empty string, non-date string, and timezone handling.

---

## Adversarial Analysis

### Concern 1: Validator can be trivially bypassed by omitting `allowed-tools`

The security consistency checks (lines 199-226 of `validate-skill-capabilities.sh`) only fire when `allowed-tools` is present. But 14 of 25 skills omit `allowed-tools`. An attacker (or careless developer) who declares `capabilities.write_files: false` but relies on Write tool access simply omits `allowed-tools` and the validator reports PASS. The security invariant ("capability denies what tool allows") is only enforced for skills that opt into the check.

### Concern 2: `yq eval` on untrusted YAML frontmatter without schema validation

Both validators pipe frontmatter extracted from markdown files through `yq eval`. While `yq-safe.sh` is sourced, the validators call `yq eval` directly (not `safe_yq`). If a SKILL.md contains YAML that exploits yq's expression evaluation (e.g., `capabilities: $(cat /etc/passwd)`), the `yq eval` call processes it. The `2>/dev/null` suppresses errors but doesn't prevent execution of yq expressions. In practice, mikefarah/yq's `eval` does not execute shell commands, but the inconsistency between sourcing `yq-safe.sh` and then calling raw `yq eval` suggests the safety library was intended to be used but wasn't.

### Concern 3: No schema enforcement for unknown capabilities fields

The validator checks for `schema_version`, `execute_commands` format, and a few cross-field consistency rules. But it does not reject unknown capability keys. A SKILL.md with `capabilities.root_access: true` or `capabilities.delete_everything: true` would pass validation silently. Schema-closed validation (reject unknown keys) would catch typos and prevent capability creep.

### Challenged Assumption: "Lightweight skills don't write"

The correlation check assumes `lightweight` cost-profile is incompatible with `write_files: true`. But `translating-for-executives` genuinely writes output (translated documents) while being token-cheap. The cost-profile taxonomy conflates token cost with capability scope. A "lightweight" skill that writes a single output file is cheaper than a "moderate" skill that reads 50 files. Consider whether cost-profile should be independent of capability scope, or whether the taxonomy needs refinement.

### Alternative Approach: JSON Schema validation instead of bash parsing

The current bash/awk/yq/jq pipeline is ~280 lines of shell that reimplements a subset of JSON Schema validation. An alternative: convert YAML frontmatter to JSON, validate against a `.json-schema` file using `ajv` (already mentioned in the codebase for pack manifest validation). This would provide: closed-schema validation (reject unknown keys), type checking, required-field enforcement, enum validation, and conditional rules -- all declaratively. The bash scripts would reduce to ~30 lines (extract frontmatter, convert to JSON, call ajv). The downside is adding an `ajv` dependency, but the codebase already uses it.

---

## Test Coverage Gaps

| Missing Test | Priority | Description |
|-------------|----------|-------------|
| Empty SKILL.md file | Medium | What happens when SKILL.md exists but is empty? |
| SKILL.md with no closing `---` | Medium | Malformed frontmatter edge case |
| `_date_to_epoch` unit tests | High | Zero test coverage for new function |
| `--json` with errors | Low | Verify JSON shape when multiple errors exist |
| `execute_commands: true` (boolean) valid | Medium | Unrestricted skills use boolean `true` but no test covers it |
| `execute_commands.deny_raw_shell` absent | Medium | What if `deny_raw_shell` is missing from structured form? |
| `validate-rule-lifecycle.sh --json` output | Low | JSON output not tested |
| Concurrent validator execution | Low | Multiple runs writing to same jq pipeline |

---

## Summary

| Category | Count |
|----------|-------|
| Critical bugs | 3 |
| Acceptance criteria failures | 2 |
| Non-critical improvements | 7 |
| Test coverage gaps | 8 |
| Adversarial concerns | 3 |

The implementation is architecturally sound and the annotation coverage (25/25) is complete. However, the substring matching bug in `has_tool()` is a security-layer defect that undermines the validator's stated purpose, the counter bug produces contradictory JSON output, and the empty-string date bug will cause silent staleness-check failures. These three issues plus the two acceptance-criteria failures must be resolved before merge.
