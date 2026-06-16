import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

/**
 * Entries that paperclip itself creates inside a managed workspace and which do
 * NOT constitute a real git checkout. A workspace dir containing only these is
 * still effectively empty from git's point of view and must be (re-)cloned.
 */
const PAPERCLIP_MANAGED_WORKSPACE_ENTRIES = new Set([".paperclip"]);

function isPaperclipManagedWorkspaceEntry(entry: string): boolean {
  return PAPERCLIP_MANAGED_WORKSPACE_ENTRIES.has(entry);
}

/** Filesystem primitives, injectable so tests can drive them deterministically. */
export interface ReconcileManagedWorkspaceDeps {
  readdir: (dir: string) => Promise<string[]>;
  rename: (from: string, to: string) => Promise<void>;
  rm: (target: string) => Promise<void>;
  /** Generates the unique stash dir suffix; injectable for deterministic tests. */
  uniqueSuffix: () => string;
}

const defaultDeps: ReconcileManagedWorkspaceDeps = {
  readdir: (dir) => fs.readdir(dir),
  rename: (from, to) => fs.rename(from, to),
  rm: (target) => fs.rm(target, { recursive: true, force: true }),
  uniqueSuffix: () => randomUUID(),
};

export interface ReconcileExistingManagedWorkspaceInput {
  /** Existing workspace dir (already known to lack a top-level `.git`). */
  cwd: string;
  /** Performs the actual clone into `cwd`; called only when a clone is required. */
  clone: () => Promise<{ cwd: string; warning: string | null }>;
  deps?: Partial<ReconcileManagedWorkspaceDeps>;
}

/**
 * Decide whether an existing (non-`.git`) managed workspace dir can be reused
 * as-is or must be re-cloned, then perform the clone while preserving
 * paperclip-managed metadata (e.g. `.paperclip`).
 *
 * Why this exists (NODE-141): the workspace dir is created at project-setup time
 * and seeded with a `.paperclip/` metadata subdir BEFORE the repo is ever cloned.
 * A naive "dir is non-empty -> use as-is" check then treats that metadata-only
 * dir as a real checkout and skips the clone, so every agent run dies with
 * `fatal: not a git repository`. We must ignore `.paperclip` when judging
 * emptiness, and — because `git clone` requires an empty/absent target — move the
 * preserved metadata aside, clone into the fresh dir, then restore it.
 */
export async function reconcileExistingManagedWorkspace(
  input: ReconcileExistingManagedWorkspaceInput,
): Promise<{ cwd: string; warning: string | null }> {
  const deps = { ...defaultDeps, ...input.deps };
  const { cwd } = input;

  const entries = await deps.readdir(cwd).catch(() => [] as string[]);
  const realEntries = entries.filter((entry) => !isPaperclipManagedWorkspaceEntry(entry));
  if (realEntries.length > 0) {
    return {
      cwd,
      warning: `Managed workspace path "${cwd}" already exists but is not a git checkout. Using it as-is.`,
    };
  }

  const preserved = entries.filter((entry) => isPaperclipManagedWorkspaceEntry(entry));
  if (preserved.length === 0) {
    // Genuinely empty dir: git clone needs an absent/empty target.
    await deps.rm(cwd);
    return input.clone();
  }

  // Only paperclip-managed metadata is present. Move the whole dir aside so the
  // clone target is absent, clone, then restore the preserved metadata into the
  // freshly-cloned checkout so `.paperclip` survives.
  const stashDir = `${cwd}.preclone-${deps.uniqueSuffix()}`;
  await deps.rename(cwd, stashDir);

  let result: { cwd: string; warning: string | null };
  try {
    result = await input.clone();
  } catch (error) {
    // Clone failed: restore the original dir so we never lose `.paperclip`.
    await deps.rename(stashDir, cwd).catch(() => {});
    throw error;
  }

  for (const entry of preserved) {
    await deps
      .rename(path.join(stashDir, entry), path.join(cwd, entry))
      .catch(() => {});
  }
  await deps.rm(stashDir).catch(() => {});
  return result;
}
