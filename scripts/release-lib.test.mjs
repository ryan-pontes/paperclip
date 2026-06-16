import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const repoRoot = new URL("..", import.meta.url).pathname.replace(/\/$/, "");

function writeExecutable(path, body) {
  writeFileSync(path, body, { mode: 0o755 });
}

function runPublishHelper({ pnpmMode, npmVersionExists = false, distTag = "canary", callerPipefail = true }) {
  const fixtureDir = mkdtempSync(join(tmpdir(), "paperclip-release-lib-"));
  const binDir = join(fixtureDir, "bin");
  const stateDir = join(fixtureDir, "state");
  const callLog = join(fixtureDir, "calls.log");
  mkdirSync(binDir);
  mkdirSync(stateDir);

  writeExecutable(
    join(binDir, "pnpm"),
    `#!/usr/bin/env bash
set -euo pipefail
printf 'pnpm %s\\n' "$*" >> "$FAKE_CALL_LOG"
case "$PNPM_MODE" in
  success)
    echo "published"
    exit 0
    ;;
  tlog-then-success)
    if [ ! -f "$FAKE_STATE_DIR/pnpm-called" ]; then
      touch "$FAKE_STATE_DIR/pnpm-called"
      echo "npm error code TLOG_CREATE_ENTRY_ERROR"
      echo "npm error error creating tlog entry - (409) an equivalent entry already exists in the transparency log with UUID abc"
      exit 1
    fi
    case " $* " in
      *" --provenance=false "*)
        echo "published without provenance"
        exit 0
        ;;
      *)
        echo "retry did not disable provenance"
        exit 1
        ;;
    esac
    ;;
  tlog-always-fails)
    echo "npm error code TLOG_CREATE_ENTRY_ERROR"
    echo "npm error error creating tlog entry - (409) an equivalent entry already exists in the transparency log with UUID abc"
    exit 1
    ;;
  non-tlog-failure)
    echo "npm error code E500"
    exit 1
    ;;
esac
exit 1
`,
  );

  writeExecutable(
    join(binDir, "npm"),
    `#!/usr/bin/env bash
set -euo pipefail
printf 'npm %s\\n' "$*" >> "$FAKE_CALL_LOG"
if [ "$1" = "view" ] && [ "$NPM_VERSION_EXISTS" = "true" ]; then
  echo "1.2.3"
  exit 0
fi
exit 1
`,
  );

  const shellOptions = callerPipefail ? "set -euo pipefail" : "set -eu";
  const script = `
${shellOptions}
source "${repoRoot}/scripts/release-lib.sh"
publish_package_to_npm ${distTag} @paperclipai/example 1.2.3
`;

  let status = 0;
  let output = "";
  try {
    output = execFileSync("bash", ["-lc", script], {
      cwd: fixtureDir,
      encoding: "utf8",
      env: {
        ...process.env,
        PATH: `${binDir}:${process.env.PATH}`,
        FAKE_CALL_LOG: callLog,
        FAKE_STATE_DIR: stateDir,
        NPM_VERSION_EXISTS: npmVersionExists ? "true" : "false",
        PNPM_MODE: pnpmMode,
        REPO_ROOT: fixtureDir,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    status = error.status ?? 1;
    output = `${error.stdout ?? ""}${error.stderr ?? ""}`;
  }

  return {
    calls: readFileSync(callLog, "utf8"),
    output,
    status,
  };
}

function runAuthHelper({ dryRun = "false", env = {}, npmWhoami = "fail" } = {}) {
  const fixtureDir = mkdtempSync(join(tmpdir(), "paperclip-release-auth-"));
  const binDir = join(fixtureDir, "bin");
  mkdirSync(binDir);

  // Fake npm: `npm whoami` succeeds only when NPM_WHOAMI=ok. Everything else
  // (e.g. `npm view`) is irrelevant to the auth gate, so just succeed quietly.
  writeExecutable(
    join(binDir, "npm"),
    `#!/usr/bin/env bash
set -euo pipefail
if [ "\${1:-}" = "whoami" ]; then
  if [ "\${NPM_WHOAMI:-fail}" = "ok" ]; then
    echo "release-bot"
    exit 0
  fi
  exit 1
fi
exit 0
`,
  );

  const script = `
set -euo pipefail
source "${repoRoot}/scripts/release-lib.sh"
require_npm_publish_auth ${dryRun}
echo "SKIP=\${RELEASE_SKIP_NPM_PUBLISH}"
`;

  // Start from a clean publish context: never inherit the runner's own
  // GITHUB_* / token env, then layer the per-test overrides on top.
  const baseEnv = {
    ...process.env,
    PATH: `${binDir}:${process.env.PATH}`,
    REPO_ROOT: fixtureDir,
    NPM_WHOAMI: npmWhoami,
    GITHUB_REPOSITORY: "",
    GITHUB_ACTIONS: "",
    PUBLISH_NPM: "",
    NODE_AUTH_TOKEN: "",
  };

  let status = 0;
  let output = "";
  try {
    // Use a non-login shell so the prepended fake-bin PATH is honored; a login
    // shell can re-prioritize system bin dirs ahead of it.
    output = execFileSync("bash", ["-c", script], {
      cwd: fixtureDir,
      encoding: "utf8",
      env: { ...baseEnv, ...env },
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    status = error.status ?? 1;
    output = `${error.stdout ?? ""}${error.stderr ?? ""}`;
  }

  return { output, status };
}

test("require_npm_publish_auth skips publish (success + notice) in an unauthorized fork", () => {
  const result = runAuthHelper();

  assert.equal(result.status, 0);
  assert.match(result.output, /npm publish skipped: fork is not the @paperclipai publisher/);
  assert.match(result.output, /^SKIP=true$/m);
});

test("require_npm_publish_auth still attempts publish when GITHUB_REPOSITORY is upstream", () => {
  const result = runAuthHelper({
    env: { GITHUB_REPOSITORY: "paperclipai/paperclip", GITHUB_ACTIONS: "true" },
  });

  assert.equal(result.status, 0);
  assert.match(result.output, /trusted publishing/);
  assert.match(result.output, /^SKIP=false$/m);
});

test("require_npm_publish_auth honors PUBLISH_NPM=true with a real npm session", () => {
  const result = runAuthHelper({ env: { PUBLISH_NPM: "true" }, npmWhoami: "ok" });

  assert.equal(result.status, 0);
  assert.match(result.output, /Logged in to npm as release-bot/);
  assert.match(result.output, /^SKIP=false$/m);
});

test("require_npm_publish_auth honors a real NODE_AUTH_TOKEN", () => {
  const result = runAuthHelper({ env: { NODE_AUTH_TOKEN: "npm_realtoken" } });

  assert.equal(result.status, 0);
  assert.match(result.output, /NODE_AUTH_TOKEN/);
  assert.match(result.output, /^SKIP=false$/m);
});

test("require_npm_publish_auth fails loudly in an authorized context with no genuine auth", () => {
  const result = runAuthHelper({ env: { PUBLISH_NPM: "true" }, npmWhoami: "fail" });

  assert.notEqual(result.status, 0);
  assert.match(result.output, /npm publish auth is not available in an authorized publish context/);
});

test("require_npm_publish_auth never sets the skip flag on a dry run", () => {
  const result = runAuthHelper({ dryRun: "true" });

  assert.equal(result.status, 0);
  assert.match(result.output, /^SKIP=false$/m);
  assert.doesNotMatch(result.output, /npm publish skipped/);
});

test("publish_package_to_npm returns after a successful pnpm publish", () => {
  const result = runPublishHelper({ pnpmMode: "success" });

  assert.equal(result.status, 0);
  assert.match(result.calls, /^pnpm publish --no-git-checks --tag canary --access public$/m);
  assert.doesNotMatch(result.calls, /npm view/);
  assert.doesNotMatch(result.calls, /--provenance=false/);
});

test("publish_package_to_npm retries duplicate tlog failures without provenance", () => {
  const result = runPublishHelper({ pnpmMode: "tlog-then-success" });

  assert.equal(result.status, 0);
  assert.match(result.calls, /^npm view @paperclipai\/example@1\.2\.3 version$/m);
  assert.match(
    result.calls,
    /^pnpm publish --no-git-checks --tag canary --access public --provenance=false$/m,
  );
});

test("publish_package_to_npm treats a duplicate tlog failure as complete when npm exposes the version", () => {
  const result = runPublishHelper({ pnpmMode: "tlog-always-fails", npmVersionExists: true });

  assert.equal(result.status, 0);
  assert.match(result.calls, /^npm view @paperclipai\/example@1\.2\.3 version$/m);
  assert.doesNotMatch(result.calls, /--provenance=false/);
});

test("publish_package_to_npm does not retry unrelated publish failures", () => {
  const result = runPublishHelper({ pnpmMode: "non-tlog-failure" });

  assert.notEqual(result.status, 0);
  assert.doesNotMatch(result.calls, /npm view/);
  assert.doesNotMatch(result.calls, /--provenance=false/);
});

test("publish_package_to_npm does not mask failures when caller has no pipefail", () => {
  const result = runPublishHelper({ pnpmMode: "non-tlog-failure", callerPipefail: false });

  assert.notEqual(result.status, 0);
  assert.doesNotMatch(result.calls, /npm view/);
  assert.doesNotMatch(result.calls, /--provenance=false/);
});

test("publish_package_to_npm does not retry stable publishes without provenance", () => {
  const result = runPublishHelper({ pnpmMode: "tlog-then-success", distTag: "latest" });

  assert.notEqual(result.status, 0);
  assert.match(result.calls, /^npm view @paperclipai\/example@1\.2\.3 version$/m);
  assert.doesNotMatch(result.calls, /--provenance=false/);
});
