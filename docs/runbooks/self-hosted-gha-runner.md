# Runbook — Self-hosted GitHub Actions runner on the Oracle VM (NODE-235)

> **Approach:** Docker-compose (board decision 2026-06-19). Previous systemd/binary approach
> superseded. Consistent with the rest of the stack on this host.
>
> **Audience:** the human operator (Ryan), who is the only actor with root/SSH on the
> Oracle VM host. Paperclip agents run in an isolated container and **cannot** perform
> the install. Everything below is copy-paste for a root shell on the host.
>
> **Goal:** stop paying for GitHub-hosted Actions on `ryan-pontes/*` repos by running a
> self-hosted runner on the Oracle Ampere VM (idle CPU/disk, zero marginal cost).
> Board context: paid GHA was rejected (approval `33a23f6a`, 2026-06-16).

## 0. Facts that correct the original issue spec

| Issue assumed | Reality (verified) | Impact |
|---|---|---|
| `ryan-pontes` is an **org** | `ryan-pontes` is a **User** account (`gh api users/ryan-pontes → type:User`) | **No org-level runners.** Register **per-repo**. URL must be `https://github.com/ryan-pontes/<repo>`. |
| Token generated in GitHub UI (expires 1h) | Mint via `gh api` (see §2) | No UI step needed; token valid immediately. |

VM arch confirmed: `aarch64` (Ampere). The `myoung34/github-runner` image auto-selects
arm64 — no manual tarball selection needed.

Repos in scope (both **private**):
- `ryan-pontes/paperclip` — runner name `oracle-runner-01`
- `ryan-pontes/painel-envios-livraria` — runner name `oracle-runner-02`

## 1. Create the runner directory on the host

```bash
sudo mkdir -p /opt/gha-runner
sudo chmod 700 /opt/gha-runner
```

## 2. Mint a registration token (no UI, no 1h expiry problem)

The `gh` CLI mints a short-lived registration token that is used once during `docker compose up`.
Run this immediately before starting the container so the token is fresh.

```bash
# For paperclip:
RUNNER_TOKEN=$(gh api -X POST repos/ryan-pontes/paperclip/actions/runners/registration-token --jq .token)
echo "Token: $RUNNER_TOKEN"   # copy this value into the .env below
```

For the second runner (`painel-envios-livraria`), change the repo path:
```bash
RUNNER_TOKEN_PAINEL=$(gh api -X POST repos/ryan-pontes/painel-envios-livraria/actions/runners/registration-token --jq .token)
```

## 3. Create the docker-compose file

Save this at `/opt/gha-runner/docker-compose.yml`:

```bash
sudo tee /opt/gha-runner/docker-compose.yml >/dev/null <<'EOF'
version: "3.8"
services:
  gha-runner-paperclip:
    image: myoung34/github-runner:latest
    restart: unless-stopped
    environment:
      RUNNER_NAME: oracle-runner-01
      RUNNER_LABELS: self-hosted,linux,arm64,oracle
      GITHUB_URL: https://github.com/ryan-pontes/paperclip
      RUNNER_TOKEN: ${RUNNER_TOKEN_PAPERCLIP}
      RUNNER_SCOPE: repo
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - runner_work_paperclip:/home/runner/_work

  gha-runner-painel:
    image: myoung34/github-runner:latest
    restart: unless-stopped
    environment:
      RUNNER_NAME: oracle-runner-02
      RUNNER_LABELS: self-hosted,linux,arm64,oracle
      GITHUB_URL: https://github.com/ryan-pontes/painel-envios-livraria
      RUNNER_TOKEN: ${RUNNER_TOKEN_PAINEL}
      RUNNER_SCOPE: repo
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - runner_work_painel:/home/runner/_work

volumes:
  runner_work_paperclip:
  runner_work_painel:
EOF
```

## 4. Create the .env file with tokens

```bash
# Paste the tokens you minted in §2:
sudo tee /opt/gha-runner/.env >/dev/null <<EOF
RUNNER_TOKEN_PAPERCLIP=<paste RUNNER_TOKEN from §2>
RUNNER_TOKEN_PAINEL=<paste RUNNER_TOKEN_PAINEL from §2>
EOF
sudo chmod 600 /opt/gha-runner/.env
```

> The `myoung34/github-runner` image registers the runner on first boot using the token,
> then discards it. If you restart the container later it re-uses the existing registration
> (the token in `.env` is only needed for the initial `up`). If the runner gets de-registered
> (e.g. after >30 days offline), mint a new token and `docker compose up --force-recreate`.

## 5. Start the runners

```bash
cd /opt/gha-runner
docker compose up -d

# Tail logs to confirm registration succeeded:
docker compose logs -f gha-runner-paperclip
docker compose logs -f gha-runner-painel
# Look for: "Runner registration succeeded" and "Listening for Jobs"
```

## 6. Verify runners are Online

Open in browser (or use `gh`):

```
https://github.com/ryan-pontes/paperclip/settings/actions/runners
https://github.com/ryan-pontes/painel-envios-livraria/settings/actions/runners
```

Both `oracle-runner-01` and `oracle-runner-02` must show **Online**.

Via CLI:
```bash
gh api repos/ryan-pontes/paperclip/actions/runners --jq '.runners[] | {name, status}'
gh api repos/ryan-pontes/painel-envios-livraria/actions/runners --jq '.runners[] | {name, status}'
```

## 7. Security notes

The `myoung34/github-runner` container runs as a non-root user internally. However, the
`/var/run/docker.sock` mount gives it docker daemon access (equivalent to root on the host).

**Keep this in mind:**
- Only mount `docker.sock` because it is needed for job containers. Remove it if you later
  confirm jobs do not need Docker.
- The runners serve **private repos only** (`ryan-pontes/*`). Fork PR protection is still
  required (see §8) to prevent malicious PRs from running on our VM.

## 8. Security: gate fork PRs

Untrusted PR code must NOT auto-run on our VM. For each repo:

```bash
for REPO in ryan-pontes/paperclip ryan-pontes/painel-envios-livraria; do
  gh api -X PUT repos/$REPO/actions/permissions/workflow \
    -f default_workflow_permissions=read -F can_approve_pull_request_reviews=false
done
```

> Also verify in GitHub UI: Settings → Actions → General → "Fork pull request workflows
> from outside collaborators" → **Require approval for all outside collaborators**.
> Both repos are private, which already blocks anonymous forks, but set this as defense
> in depth.

## 9. Weekly disk cleanup

```bash
sudo tee /etc/cron.weekly/gha-runner-clean >/dev/null <<'EOF'
#!/bin/sh
# NODE-235: keep self-hosted runner disk bounded
docker system prune -f 2>/dev/null || true
EOF
sudo chmod +x /etc/cron.weekly/gha-runner-clean
```

## 10. Switch workflows to self-hosted — ONLY AFTER runners show Online

Switching `runs-on` before runners are Online makes every job queue forever. Do this as
the **last** step, once §6 confirms both runners **Online**.

In `ryan-pontes/paperclip` `.github/workflows/pr.yml` (and `ci.yml` if present):
```yaml
# Before:
runs-on: ubuntu-latest

# After:
runs-on: [self-hosted, linux, arm64]
```

Same change for `ryan-pontes/painel-envios-livraria` `.github/workflows/ci.yml`.

> Leave `docker.yml`, `release.yml`, `release-smoke.yml`, `agent-runtime-images.yml`,
> `e2e.yml` on `ubuntu-latest` for now — they need Docker buildx / more isolation.
> Moving them is a separate decision that requires a dedicated security review.

## 11. Validation checklist (acceptance criteria)

- [ ] `docker compose ps` shows both containers **Up**
- [ ] Both runners **Online** on the GitHub repo settings pages (§6)
- [ ] `paperclip` PR runs `pr.yml`; `Set up job` log shows `Runner name: oracle-runner-01`
- [ ] Build time ≤ 2× old GHA-hosted time (Ampere arm64 should be faster; note the value)
- [ ] `painel-envios-livraria` `ci.yml` runs green on `oracle-runner-02`
- [ ] After `docker compose restart`, runners come back Online within ~30s
- [ ] Fork PR approval policy set (§8)

## 12. Maintenance

- **Runner version updates:** `docker compose pull && docker compose up -d` (image auto-updates
  to latest release).
- **Re-registration after long offline:** mint new tokens (§2) → update `/opt/gha-runner/.env`
  → `docker compose up --force-recreate -d`.
- **Concurrency:** 1 container = 1 concurrent job. Add more services to `docker-compose.yml`
  with `--name oracle-runner-03` if the squad floods PRs.
- **Plan-B:** if the runner destabilizes the Oracle VM, move to a DigitalOcean Basic droplet
  ($4/mo) — same `docker-compose.yml`, different host.

## 13. Quick-reference commands

```bash
# Start / stop
cd /opt/gha-runner
docker compose up -d
docker compose down

# Logs
docker compose logs -f gha-runner-paperclip
docker compose logs -f gha-runner-painel

# Status
docker compose ps

# Restart after config change
docker compose up --force-recreate -d

# Weekly cleanup (run manually if needed)
docker system prune -f
```
