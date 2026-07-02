# Dependency Provenance Policy

> Issues: #218, #233, #240

GitHub-hosted dependencies are part of Dixie's production supply chain.
Release audits need exact provenance, so `github:` refs are held to a strict
pinning policy.

## Policy

1. **Full commit SHAs only.** Every `github:owner/repo#ref` dependency in
   `app/package.json` MUST pin a full 40-character commit SHA. Tags, branch
   names, and short SHAs are rejected — tags and branches can move, and short
   refs are ambiguous in audits.
2. **Enforced in CI.** `npm run check:dependency-provenance`
   (`app/scripts/check-dependency-provenance.mjs`) fails on any non-SHA ref.
   It runs in `.github/workflows/ci.yml` before typecheck and inside the
   root `scripts/validate.sh`.
3. **PR evidence.** A PR that adds or moves a `github:` ref must state, in
   the PR description: the repository, the exact SHA, the tag/release the SHA
   corresponds to (if any), and why the dependency changed. See the
   "Dependency provenance" section of the PR template.
4. **Release notes.** Release notes must list current external repo refs
   (repo + SHA) for `github:` dependencies.

## Current pins

| Package | Ref (SHA) | Corresponds to |
|---------|-----------|----------------|
| `@0xhoneyjar/loa-hounfour` | `c041cdd4c0fc44aab34720a2721760cd828ff2df` | tag `v8.6.0` |
| `@loa/straylight` | `34bfff8de67500849b1f5fed4c82ddae5cc278d6` | pinned commit |

To verify a tag↔SHA correspondence:

```bash
git ls-remote https://github.com/0xHoneyJar/loa-hounfour 'refs/tags/v8.6.0*'
```

## Updating a pinned dependency

```bash
# 1. Resolve the new full SHA
git ls-remote https://github.com/<owner>/<repo> refs/tags/<tag>

# 2. Update app/package.json with the full SHA, then refresh the lockfile
cd app && npm install

# 3. Verify
npm run check:dependency-provenance

# 4. Record repo, SHA, corresponding tag, and reason in the PR description,
#    and update the "Current pins" table above.
```
