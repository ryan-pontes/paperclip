import { describe, expect, it, vi } from "vitest";

// Avoid loading the heavyweight heartbeat module graph; the job injects its
// clone step in tests so the real implementation is never reached.
vi.mock("../services/heartbeat.js", () => ({
  ensureManagedProjectWorkspace: vi.fn(),
}));
vi.mock("../middleware/logger.js", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
// Avoid loading the embedded-postgres client (the `@paperclipai/db` barrel) and
// the real query builder — the test `db` fully fakes query results, so the table
// handle and `eq()` output are never inspected.
vi.mock("@paperclipai/db", () => ({ projectWorkspaces: { id: "project_workspaces.id" } }));
vi.mock("drizzle-orm", () => ({ eq: (...args: unknown[]) => ({ __eq: args }) }));

import { materializeProjectWorkspace } from "../services/project-workspace-materialization.js";
import { ManagedWorkspaceCloneError } from "../services/managed-workspace-clone.js";

type Row = Record<string, unknown> | null;

function makeDb(row: Row) {
  const updates: Array<Record<string, unknown>> = [];
  const db = {
    select: () => ({
      from: () => ({
        where: () => Promise.resolve(row ? [row] : []),
      }),
    }),
    update: () => ({
      set: (payload: Record<string, unknown>) => {
        updates.push(payload);
        return { where: () => Promise.resolve(undefined) };
      },
    }),
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { db: db as any, updates };
}

const gitRepoRow = {
  id: "ws-1",
  companyId: "co-1",
  projectId: "proj-1",
  sourceType: "git_repo",
  repoUrl: "https://github.com/acme/repo.git",
  repoRef: null,
  defaultRef: "main",
};

const NOW = new Date("2026-06-15T00:00:00.000Z");

describe("materializeProjectWorkspace", () => {
  it("clones a managed git checkout and marks it ready (acceptance #1)", async () => {
    const { db, updates } = makeDb(gitRepoRow);
    const ensureWorkspace = vi.fn().mockResolvedValue({ cwd: "/managed/repo", warning: null });

    const result = await materializeProjectWorkspace(db, "ws-1", {
      ensureWorkspace,
      now: () => NOW,
    });

    expect(result).toEqual({ status: "ready", cwd: "/managed/repo", warning: null });
    expect(ensureWorkspace).toHaveBeenCalledWith({
      companyId: "co-1",
      projectId: "proj-1",
      repoUrl: "https://github.com/acme/repo.git",
      repoRef: null,
      defaultRef: "main",
    });
    expect(updates[0]).toMatchObject({ materializationStatus: "cloning", materializationError: null });
    expect(updates[1]).toMatchObject({
      materializationStatus: "ready",
      materializationError: null,
      materializedAt: NOW,
    });
  });

  it("records a structured error on clone failure without throwing (acceptance #5)", async () => {
    const { db, updates } = makeDb(gitRepoRow);
    const ensureWorkspace = vi.fn().mockRejectedValue(
      new ManagedWorkspaceCloneError({
        code: "auth_failed",
        repoUrl: "https://github.com/acme/repo.git",
        cwd: "/managed/repo",
        message: 'Failed to clone "https://github.com/acme/repo.git": authentication failed',
      }),
    );

    // Must resolve (not reject) — it is a fire-and-forget job.
    const result = await materializeProjectWorkspace(db, "ws-1", {
      ensureWorkspace,
      now: () => NOW,
    });

    expect(result.status).toBe("failed");
    if (result.status === "failed") {
      expect(result.error).toMatch(/^auth_failed: /);
    }
    expect(updates[0]).toMatchObject({ materializationStatus: "cloning" });
    expect(updates[1]).toMatchObject({ materializationStatus: "failed" });
    expect(updates[1]?.materializationError).toContain("auth_failed");
  });

  it("marks non-git workspaces not_applicable and never clones", async () => {
    const { db, updates } = makeDb({ ...gitRepoRow, sourceType: "local_path", repoUrl: null });
    const ensureWorkspace = vi.fn();

    const result = await materializeProjectWorkspace(db, "ws-1", {
      ensureWorkspace,
      now: () => NOW,
    });

    expect(result).toEqual({ status: "skipped", reason: "not_applicable" });
    expect(ensureWorkspace).not.toHaveBeenCalled();
    expect(updates[0]).toMatchObject({ materializationStatus: "not_applicable" });
  });

  it("skips a missing workspace", async () => {
    const { db, updates } = makeDb(null);
    const result = await materializeProjectWorkspace(db, "missing", {
      ensureWorkspace: vi.fn(),
      now: () => NOW,
    });
    expect(result).toEqual({ status: "skipped", reason: "not_found" });
    expect(updates).toHaveLength(0);
  });
});
