# Sprint Plan: Tag Release v2.0.0

**Cycle**: cycle-004
**PRD**: v4.0.0 — Tag Release v2.0.0
**SDD**: v4.0.0 — Release Process
**Sprints**: 1 (single release sprint)
**Strategy**: Merge → bump → changelog → tag → release → update command center

---

## Sprint 1: Tag Release v2.0.0

**Goal**: Merge PR #7, bump version to 2.0.0, generate CHANGELOG, create annotated tag, publish GitHub Release, update command center.

**FR Coverage**: FR-1 through FR-6 (all requirements in single sprint)

### Tasks

**Task 1.1: Merge PR #7 to main**
- Merge `feature/dixie-phase2` into `main` via `gh pr merge 7`
- Verify CI passes post-merge
- Run full test suite on main: `cd app && npx vitest run`
- **AC**: PR #7 merged. 1011 tests pass on main. Zero regressions.

**Task 1.2: Version bump to 2.0.0**
- Edit `app/package.json`: `"version": "1.0.0"` → `"version": "2.0.0"`
- Commit: `chore: bump version to 2.0.0`
- **AC**: `app/package.json` shows `"version": "2.0.0"`. Commit on main.

**Task 1.3: CHANGELOG entry for v2.0.0**
- Add `## [2.0.0]` section to `CHANGELOG.md` above existing entries
- Categorize changes from cycle-002 (23 sprints) and cycle-003 (12 sprints)
- Use Keep a Changelog format: Added, Changed, Architecture sections
- Commit: `docs: add CHANGELOG entry for v2.0.0`
- **AC**: CHANGELOG.md has v2.0.0 entry. Covers both cycles. Follows KaC format.

**Task 1.4: Create annotated tag v2.0.0**
- `git tag -a v2.0.0 -m "v2.0.0 — Constitutional Architecture"`
- `git push origin v2.0.0`
- **AC**: Tag `v2.0.0` exists on remote. Annotated (not lightweight).

**Task 1.5: Create GitHub Release**
- Use `gh release create v2.0.0` with structured release notes
- Include: summary, highlights, per-cycle features, test metrics, breaking changes, migration notes
- **AC**: GitHub Release exists for v2.0.0. Notes are structured and comprehensive.

**Task 1.6: Update command center (loa-finn#66)**
- Post comment on loa-finn issue #66 marking Phase 0 complete
- Include: version tag, release URL, what shipped, next phase activation
- **AC**: Comment posted on issue #66. Phase 0 marked done.
