# Dependency Management Runbook

## Routine: monthly sweep (1st Monday of each month)

1. Check open Dependabot alerts: `gh api /repos/3node-app/paperclip/dependabot/alerts?state=open --jq 'length'`
2. Review any accumulated major-version alerts that the auto-merge workflow cannot handle.
3. For transitively-vulnerable packages, add a `pnpm.overrides` entry in the root `package.json` pinning to the fixed range (`>=X.Y.Z`). CI regenerates the lockfile automatically.
4. For direct dependencies, bump the version range in the relevant workspace `package.json`.
5. Open a single `chore(deps): monthly sweep — <month>` PR and let CI green before merging.

## Auto-merge policy

Minor and patch PRs opened by `dependabot[bot]` merge automatically once CI passes (`.github/workflows/dependabot-auto-merge.yml`). Major version bumps are excluded by `.github/dependabot.yml` (`ignore: version-update:semver-major`) and require manual review.

## Dismissing not-applicable alerts

Use `not_used` when the vulnerability is ecosystem-specific and provably doesn't apply:

```bash
gh api -X PATCH /repos/3node-app/paperclip/dependabot/alerts/<id> \
  -f state=dismissed \
  -f dismissed_reason=not_used \
  -f dismissed_comment="<reason>"
```

Example: kysely SQLi (GHSA-*) is MySQL-specific; paperclip uses Postgres exclusively.

## pnpm overrides for transitives

When a transitive dependency has a CVE and the direct parent hasn't released a fix yet, add an override to root `package.json`:

```json
"pnpm": {
  "overrides": {
    "vulnerable-package": ">=fixed.version"
  }
}
```

Do **not** commit `pnpm-lock.yaml` — CI regenerates it from the manifest change.

## Resolving the refresh-lockfile PR

After merging a manifest change to master, `refresh-lockfile.yml` opens a `chore/refresh-lockfile` PR automatically. This PR is safe to merge as soon as its CI passes.
