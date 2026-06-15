import { execFile as execFileCallback } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  cloneManagedRepo,
  ManagedWorkspaceCloneError,
} from "./managed-workspace-clone.js";

const execFile = promisify(execFileCallback);
const TOKEN = "ghp_secrettoken123";

describe("cloneManagedRepo (injected git runner)", () => {
  it("injects x-access-token auth for github.com and resets origin to the clean url", async () => {
    const calls: string[][] = [];
    const result = await cloneManagedRepo({
      repoUrl: "https://github.com/acme/private-repo.git",
      cwd: "/tmp/workspace",
      token: TOKEN,
      runGit: async (args) => {
        calls.push(args);
        return { stdout: "", stderr: "" };
      },
    });

    const cloneCall = calls.find((args) => args[0] === "clone");
    expect(cloneCall).toBeDefined();
    expect(cloneCall).toContain(
      `https://x-access-token:${TOKEN}@github.com/acme/private-repo.git`,
    );

    const setUrlCall = calls.find((args) => args.includes("set-url"));
    expect(setUrlCall).toBeDefined();
    // The persisted origin must NOT contain the token.
    expect(setUrlCall?.join(" ")).not.toContain(TOKEN);
    expect(setUrlCall).toContain("https://github.com/acme/private-repo.git");

    expect(result.warning).toBeNull();
  });

  it("does not inject the token for non-github hosts", async () => {
    const calls: string[][] = [];
    await cloneManagedRepo({
      repoUrl: "https://gitlab.com/acme/repo.git",
      cwd: "/tmp/workspace",
      token: TOKEN,
      runGit: async (args) => {
        calls.push(args);
        return { stdout: "", stderr: "" };
      },
    });

    const cloneCall = calls.find((args) => args[0] === "clone");
    expect(cloneCall?.join(" ")).not.toContain(TOKEN);
    expect(cloneCall).toContain("https://gitlab.com/acme/repo.git");
  });

  it("clones without auth when no token is present", async () => {
    const calls: string[][] = [];
    await cloneManagedRepo({
      repoUrl: "https://github.com/acme/public-repo.git",
      cwd: "/tmp/workspace",
      token: null,
      env: {},
      runGit: async (args) => {
        calls.push(args);
        return { stdout: "", stderr: "" };
      },
    });

    const cloneCall = calls.find((args) => args[0] === "clone");
    expect(cloneCall).toContain("https://github.com/acme/public-repo.git");
    expect(cloneCall).not.toContain("--branch");
  });

  it("passes --branch ref and falls back to the default branch when the ref is missing", async () => {
    const calls: string[][] = [];
    const result = await cloneManagedRepo({
      repoUrl: "https://github.com/acme/repo.git",
      cwd: "/tmp/workspace",
      ref: "stale-branch",
      token: TOKEN,
      runGit: async (args) => {
        calls.push(args);
        if (args[0] === "clone" && args.includes("--branch")) {
          throw {
            stderr: "fatal: Remote branch stale-branch not found in upstream origin",
          };
        }
        return { stdout: "", stderr: "" };
      },
    });

    const cloneCalls = calls.filter((args) => args[0] === "clone");
    expect(cloneCalls).toHaveLength(2);
    expect(cloneCalls[0]).toContain("--branch");
    expect(cloneCalls[1]).not.toContain("--branch");
    expect(result.warning).toMatch(/stale-branch/);
  });

  it("throws a structured not_found error for a missing repo", async () => {
    await expect(
      cloneManagedRepo({
        repoUrl: "https://github.com/acme/missing.git",
        cwd: "/tmp/workspace",
        token: TOKEN,
        runGit: async () => {
          throw { stderr: "remote: Repository not found.\nfatal: repository not found" };
        },
      }),
    ).rejects.toMatchObject({
      name: "ManagedWorkspaceCloneError",
      code: "not_found",
      repoUrl: "https://github.com/acme/missing.git",
    });
  });

  it("throws a structured auth_failed error", async () => {
    await expect(
      cloneManagedRepo({
        repoUrl: "https://github.com/acme/private.git",
        cwd: "/tmp/workspace",
        token: TOKEN,
        runGit: async () => {
          throw {
            stderr: `fatal: Authentication failed for 'https://x-access-token:${TOKEN}@github.com/acme/private.git/'`,
          };
        },
      }),
    ).rejects.toMatchObject({ code: "auth_failed" });
  });

  it("classifies killed processes as timeouts", async () => {
    await expect(
      cloneManagedRepo({
        repoUrl: "https://github.com/acme/slow.git",
        cwd: "/tmp/workspace",
        token: TOKEN,
        runGit: async () => {
          throw { killed: true, signal: "SIGTERM" };
        },
      }),
    ).rejects.toMatchObject({ code: "timeout" });
  });

  it("never leaks the token in error messages", async () => {
    let error: unknown;
    try {
      await cloneManagedRepo({
        repoUrl: "https://github.com/acme/private.git",
        cwd: "/tmp/workspace",
        token: TOKEN,
        runGit: async () => {
          throw {
            stderr: `fatal: unable to access 'https://x-access-token:${TOKEN}@github.com/acme/private.git/'`,
          };
        },
      });
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(ManagedWorkspaceCloneError);
    expect((error as Error).message).not.toContain(TOKEN);
    expect((error as ManagedWorkspaceCloneError).repoUrl).not.toContain(TOKEN);
  });
});

describe("cloneManagedRepo (real git)", () => {
  let tmpRoot: string;

  beforeEach(async () => {
    tmpRoot = path.join(os.tmpdir(), `managed-clone-test-${randomUUID()}`);
    await fs.mkdir(tmpRoot, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tmpRoot, { recursive: true, force: true });
  });

  async function makeSourceRepo(defaultBranch: string): Promise<string> {
    const repo = path.join(tmpRoot, "source");
    await fs.mkdir(repo, { recursive: true });
    const env = { ...process.env, GIT_TERMINAL_PROMPT: "0" };
    await execFile("git", ["init", "-b", defaultBranch], { cwd: repo, env });
    await execFile("git", ["config", "user.email", "test@example.com"], { cwd: repo, env });
    await execFile("git", ["config", "user.name", "Test"], { cwd: repo, env });
    await fs.writeFile(path.join(repo, "README.md"), "hello\n");
    await execFile("git", ["add", "."], { cwd: repo, env });
    await execFile("git", ["commit", "-m", "initial"], { cwd: repo, env });
    return repo;
  }

  it("clones a private-style repo and leaves origin without credentials", async () => {
    const source = await makeSourceRepo("main");
    const dest = path.join(tmpRoot, "dest");

    const result = await cloneManagedRepo({
      repoUrl: `file://${source}`,
      cwd: dest,
      ref: "main",
    });

    expect(result.warning).toBeNull();
    const gitDir = await fs.stat(path.join(dest, ".git"));
    expect(gitDir.isDirectory()).toBe(true);

    const { stdout } = await execFile("git", ["-C", dest, "config", "remote.origin.url"]);
    expect(stdout.trim()).toBe(`file://${source}`);
    expect(stdout).not.toContain("x-access-token");
  });

  it("falls back to the default branch when the requested ref is stale", async () => {
    const source = await makeSourceRepo("trunk");
    const dest = path.join(tmpRoot, "dest-fallback");

    const result = await cloneManagedRepo({
      repoUrl: `file://${source}`,
      cwd: dest,
      ref: "main",
    });

    expect(result.warning).toMatch(/cloned the default branch/i);
    const gitDir = await fs.stat(path.join(dest, ".git"));
    expect(gitDir.isDirectory()).toBe(true);
  });

  it("raises a structured error for a non-existent repo", async () => {
    const dest = path.join(tmpRoot, "dest-missing");
    await expect(
      cloneManagedRepo({
        repoUrl: `file://${path.join(tmpRoot, "does-not-exist")}`,
        cwd: dest,
      }),
    ).rejects.toBeInstanceOf(ManagedWorkspaceCloneError);
  });
});
