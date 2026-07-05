#!/usr/bin/env bash
# One-command repository validation (#220, #235).
#
# Makes the root-vs-app validation boundary explicit: the ROOT section covers
# repo-level artifacts (docs parity is enforced from app tests but checked
# against root docs/); the APP section runs the dixie-bff toolchain. CI runs
# the same commands — this script is the local equivalent and the evidence
# artifact for "root-versus-app validation" review asks.
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

echo "=== ROOT: repository-level checks ==="
echo "--- dependency provenance (full-SHA GitHub refs)"
(cd app && npm run --silent check:dependency-provenance)

echo
echo "=== APP: dixie-bff (app/) checks ==="
echo "--- typecheck"
(cd app && npm run --silent typecheck)
echo "--- lint"
(cd app && npm run --silent lint)
echo "--- build"
(cd app && npm run --silent build)
echo "--- unit + integration tests (includes docs/topology/protocol parity against root docs/)"
(cd app && npm test)

echo
echo "validate.sh: ALL CHECKS PASSED"
echo "Note: E2E staging smoke is a separate, staging-dependent surface —"
echo "see docs/deployment-smoke-checklist.md and the advisory e2e workflow."
