# Branch Protection Configuration

This document describes the recommended GitHub branch protection rules for the `loa-dixie` repository.

## Required Settings for `main` Branch

Navigate to: **Settings > Branches > Branch protection rules > Add rule**

### Basic Settings

- **Branch name pattern**: `main`
- **Require a pull request before merging**: Enabled
  - **Required approving reviews**: 1
  - **Dismiss stale pull request approvals when new commits are pushed**: Enabled

### Status Checks

- **Require status checks to pass before merging**: Enabled
- **Require branches to be up to date before merging**: Enabled

**Required status checks** (must pass):

| Check Name | Workflow | Purpose |
|------------|----------|---------|
| `CI` | `ci.yml` | Typecheck, lint, unit tests, build |

**Advisory status checks** (informational, not required):

| Check Name | Workflow | Purpose |
|------------|----------|---------|
| `Staging Smoke Tests (Advisory)` | `e2e.yml` | E2E smoke tests against live staging (needs infra) |

### Additional Protection

- **Require conversation resolution before merging**: Recommended
- **Do not allow bypassing the above settings**: Recommended

## CI Workflow Details

### CI (`ci.yml`) — Required

Runs on every PR targeting `main` and on push to `main` (for `app/` changes):

1. **Typecheck** — `tsc --noEmit`
2. **Lint** — `eslint src/ tests/`
3. **Unit tests** — `vitest run`
4. **Build** — `tsc`

Node 22, working directory: `app/`.

### E2E Smoke Tests (`e2e.yml`) — Advisory

Runs staging smoke tests. Marked `continue-on-error: true` because these tests
require live staging infrastructure (database, Redis, NATS) that is not available
in CI-only context. Once staging is deployed, these tests will validate the full
integration path.

## Verification

After configuring branch protection:

1. Create a test branch with a change in `app/`
2. Open a PR to `main`
3. Verify the `CI` check runs and passes
4. Verify `Staging Smoke Tests (Advisory)` runs (may fail — this is expected)
5. Confirm only `CI` is required for merge
