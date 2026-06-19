#!/usr/bin/env bash
# cleanup-worktrees.sh — Remove git worktrees for done/cancelled Paperclip issues
#
# For each repo found under the company projects directory, scans .paperclip/worktrees/
# and removes worktrees whose corresponding Paperclip issue is done or cancelled,
# or whose branch is already merged to master AND has had no commits in >STALE_DAYS days.
# Runs git gc --prune=now on each repo that had removals.
#
# Usage:
#   scripts/cleanup-worktrees.sh [options]
#
# Options:
#   --dry-run               Print what would be removed; make no changes
#   --stale-days N          Days of inactivity after which a merged branch is removed (default: 7)
#   --projects-base PATH    Base directory containing company project repos
#                           (default: auto-derived from PAPERCLIP_COMPANY_ID)
#   --company-id ID         Company ID (default: $PAPERCLIP_COMPANY_ID)
#   --api-url URL           Paperclip API URL (default: http://localhost:3100)
#   -h, --help              Show this help

set -euo pipefail

# ── Parse args ────────────────────────────────────────────────────────────────

DRY_RUN=0
STALE_DAYS=7
PROJECTS_BASE=""
COMPANY_ID="${PAPERCLIP_COMPANY_ID:-}"
API_URL="http://localhost:3100"
API_KEY="${PAPERCLIP_API_KEY:-}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=1; shift ;;
    --stale-days) STALE_DAYS="${2:?--stale-days requires a value}"; shift 2 ;;
    --projects-base) PROJECTS_BASE="${2:?--projects-base requires a value}"; shift 2 ;;
    --company-id) COMPANY_ID="${2:?--company-id requires a value}"; shift 2 ;;
    --api-url) API_URL="${2:?--api-url requires a value}"; shift 2 ;;
    --api-key) API_KEY="${2:?--api-key requires a value}"; shift 2 ;;
    -h|--help) grep '^#' "$0" | head -20 | sed 's/^# \?//'; exit 0 ;;
    *) printf 'Unknown argument: %s\n' "$1" >&2; exit 1 ;;
  esac
done

# ── Derive projects base ───────────────────────────────────────────────────────

if [[ -z "$PROJECTS_BASE" ]]; then
  if [[ -n "$COMPANY_ID" ]]; then
    PROJECTS_BASE="/paperclip/instances/default/projects/$COMPANY_ID"
  else
    # Fallback: derive from script location (scripts/ → repo root → project → company)
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    # script is at <repo>/scripts/ → repo root is one level up → project 2 up → company 3 up
    PROJECTS_BASE="$(cd "$SCRIPT_DIR/../../.." && pwd)"
  fi
fi

# ── Require commands ───────────────────────────────────────────────────────────

for cmd in git jq curl du; do
  command -v "$cmd" >/dev/null 2>&1 || { printf 'Missing required command: %s\n' "$cmd" >&2; exit 1; }
done

if [[ -z "$API_KEY" ]]; then
  printf 'PAPERCLIP_API_KEY is not set\n' >&2
  exit 1
fi

if [[ ! -d "$PROJECTS_BASE" ]]; then
  printf 'Projects base not found: %s\n' "$PROJECTS_BASE" >&2
  exit 1
fi

# ── Helpers ───────────────────────────────────────────────────────────────────

NOW="$(date +%s)"
STALE_SECONDS=$(( STALE_DAYS * 86400 ))

# Resolve the current working directory so we can skip the active worktree
CURRENT_WORKTREE="$(pwd -P 2>/dev/null || pwd)"

log() { printf '[cleanup-worktrees] %s\n' "$*"; }

get_issue_status() {
  local identifier="$1"
  local response
  response="$(
    curl -sS \
      "$API_URL/api/companies/$COMPANY_ID/issues?q=$(echo -n "$identifier" | jq -sRr @uri)" \
      -H "Authorization: Bearer $API_KEY" \
      2>/dev/null
  )" || { echo ""; return; }
  echo "$response" | jq -r --arg id "$identifier" \
    'if type == "array" then .[] | select(.identifier == $id) | .status // empty else empty end' 2>/dev/null | head -1
}

dir_size_kb() {
  du -sk "$1" 2>/dev/null | awk '{print $1}' || echo 0
}

# ── Per-repo cleanup ──────────────────────────────────────────────────────────

TOTAL_REMOVED=0
TOTAL_KB_FREED=0

cleanup_repo() {
  local repo_dir="$1"
  local worktrees_dir="$repo_dir/.paperclip/worktrees"
  [[ -d "$worktrees_dir" ]] || return 0

  local repo_name
  repo_name="$(basename "$repo_dir")"
  local removed=0 kb_freed=0

  # Determine the main branch name
  local main_branch
  main_branch="$(git -C "$repo_dir" symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's|refs/remotes/origin/||')" || true
  [[ -z "$main_branch" ]] && main_branch="master"

  log "── $repo_name (main: $main_branch)"

  for wt_dir in "$worktrees_dir"/*/; do
    [[ -d "$wt_dir" ]] || continue
    local wt_name
    wt_name="$(basename "$wt_dir")"

    # Extract issue identifier (e.g. NODE-259) — must be at the start of the name
    # Skip the worktree we are currently running from
    local wt_abs
    wt_abs="$(cd "$wt_dir" && pwd -P 2>/dev/null || true)"
    if [[ -n "$wt_abs" && "$wt_abs" == "$CURRENT_WORKTREE"* ]]; then
      log "  SKIP $wt_name — active worktree (current session)"
      continue
    fi

    local issue_id
    issue_id="$(echo "$wt_name" | grep -oE '^[A-Z]+-[0-9]+' || true)"
    if [[ -z "$issue_id" ]]; then
      log "  SKIP $wt_name — no issue identifier"
      continue
    fi

    local should_remove=0 reason=""

    # Query issue status from Paperclip
    local status
    status="$(get_issue_status "$issue_id")"

    if [[ "$status" == "done" || "$status" == "cancelled" ]]; then
      should_remove=1
      reason="issue $issue_id is $status"
    elif [[ -z "$status" ]]; then
      log "  SKIP $wt_name — status unknown (API error or issue not found)"
      continue
    else
      # Check if the branch is merged into main
      local branch_merged=0
      if git -C "$repo_dir" branch --merged "$main_branch" 2>/dev/null | grep -qF "$wt_name"; then
        branch_merged=1
      fi

      if [[ "$branch_merged" -eq 1 ]]; then
        # Only remove if also stale (no commits in >STALE_DAYS days)
        local last_commit_ts
        last_commit_ts="$(git -C "$wt_dir" log -1 --format="%ct" 2>/dev/null || echo 0)"
        local age=$(( NOW - last_commit_ts ))
        local age_days=$(( age / 86400 ))
        if [[ "$age" -gt "$STALE_SECONDS" ]]; then
          should_remove=1
          reason="branch merged + inactive ${age_days}d (issue: $status)"
        else
          log "  KEEP $wt_name — merged but active ${age_days}d ago (issue: $status)"
        fi
      else
        log "  KEEP $wt_name — issue $issue_id is $status, unmerged branch"
      fi
    fi

    if [[ "$should_remove" -eq 1 ]]; then
      local size_kb
      size_kb="$(dir_size_kb "$wt_dir")"
      if [[ "$DRY_RUN" -eq 1 ]]; then
        log "  DRY-RUN remove $wt_name (~${size_kb}KB) — $reason"
        removed=$(( removed + 1 ))
        kb_freed=$(( kb_freed + size_kb ))
      else
        log "  REMOVE $wt_name (~${size_kb}KB) — $reason"
        if git -C "$repo_dir" worktree remove --force "$wt_dir" 2>/dev/null; then
          :
        else
          # Fallback: remove dir and prune
          rm -rf "$wt_dir"
          git -C "$repo_dir" worktree prune 2>/dev/null || true
        fi
        removed=$(( removed + 1 ))
        kb_freed=$(( kb_freed + size_kb ))
      fi
    fi
  done

  if [[ "$DRY_RUN" -eq 0 && "$removed" -gt 0 ]]; then
    log "  git gc on $repo_name…"
    git -C "$repo_dir" gc --prune=now --quiet 2>&1 || true
  fi

  TOTAL_REMOVED=$(( TOTAL_REMOVED + removed ))
  TOTAL_KB_FREED=$(( TOTAL_KB_FREED + kb_freed ))
  log "  → $removed removed, ~$(( kb_freed / 1024 ))MB freed"
}

# ── Discover repos ────────────────────────────────────────────────────────────

log "Projects base: $PROJECTS_BASE"
[[ "$DRY_RUN" -eq 1 ]] && log "(dry-run mode — no changes will be made)"

# Repos are at depth 2: <projects_base>/<project_id>/<repo>
# worktrees at depth 3 relative to projects_base: <project_id>/<repo>/.paperclip/worktrees
repos_found=0
while IFS= read -r wt_path; do
  repo_dir="$(dirname "$(dirname "$wt_path")")"
  [[ -d "$repo_dir/.git" || -f "$repo_dir/.git" ]] || continue
  repos_found=$(( repos_found + 1 ))
  cleanup_repo "$repo_dir"
done < <(
  find "$PROJECTS_BASE" \
    -mindepth 4 -maxdepth 4 \
    -type d \
    -name "worktrees" \
    -path "*/.paperclip/worktrees" \
    2>/dev/null | sort
)

if [[ "$repos_found" -eq 0 ]]; then
  log "No repos with .paperclip/worktrees found under $PROJECTS_BASE"
fi

# ── Summary ───────────────────────────────────────────────────────────────────

log "══════════════════════════════════════"
if [[ "$DRY_RUN" -eq 1 ]]; then
  log "DRY-RUN complete: would remove $TOTAL_REMOVED worktrees (~$(( TOTAL_KB_FREED / 1024 ))MB)"
else
  log "Done: removed $TOTAL_REMOVED worktrees, freed ~$(( TOTAL_KB_FREED / 1024 ))MB"
fi
