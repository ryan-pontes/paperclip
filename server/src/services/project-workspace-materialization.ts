import { eq } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { projectWorkspaces } from "@paperclipai/db";
import { logger } from "../middleware/logger.js";
import { ensureManagedProjectWorkspace } from "./heartbeat.js";
import { ManagedWorkspaceCloneError } from "./managed-workspace-clone.js";

/**
 * NODE-127 Camada C — proactive materialization of a managed git checkout.
 *
 * Designed to run as an in-process fire-and-forget job triggered on project
 * create (see `routes/projects.ts`). It transitions the workspace through
 * `cloning` → `ready` (or `failed`), persisting a structured error rather than
 * throwing, since the caller does not await it. It is idempotent: re-running on
 * an already-materialized checkout is a cheap no-op via
 * {@link ensureManagedProjectWorkspace}.
 */

export interface MaterializeProjectWorkspaceDeps {
  /** Injectable clone/ensure step for tests. */
  ensureWorkspace?: typeof ensureManagedProjectWorkspace;
  /** Injectable clock for deterministic tests. */
  now?: () => Date;
}

export type MaterializeProjectWorkspaceResult =
  | { status: "ready"; cwd: string; warning: string | null }
  | { status: "failed"; error: string }
  | { status: "skipped"; reason: "not_found" | "not_applicable" };

export async function materializeProjectWorkspace(
  db: Db,
  workspaceId: string,
  deps: MaterializeProjectWorkspaceDeps = {},
): Promise<MaterializeProjectWorkspaceResult> {
  const ensureWorkspace = deps.ensureWorkspace ?? ensureManagedProjectWorkspace;
  const now = deps.now ?? (() => new Date());

  const workspace = await db
    .select()
    .from(projectWorkspaces)
    .where(eq(projectWorkspaces.id, workspaceId))
    .then((rows) => rows[0] ?? null);

  if (!workspace) {
    logger.warn({ workspaceId }, "materializeProjectWorkspace: workspace not found");
    return { status: "skipped", reason: "not_found" };
  }

  if (workspace.sourceType !== "git_repo" || !workspace.repoUrl) {
    // Nothing to clone — reconcile the status so callers see a terminal value.
    await db
      .update(projectWorkspaces)
      .set({ materializationStatus: "not_applicable", updatedAt: now() })
      .where(eq(projectWorkspaces.id, workspaceId));
    return { status: "skipped", reason: "not_applicable" };
  }

  await db
    .update(projectWorkspaces)
    .set({ materializationStatus: "cloning", materializationError: null, updatedAt: now() })
    .where(eq(projectWorkspaces.id, workspaceId));

  try {
    const result = await ensureWorkspace({
      companyId: workspace.companyId,
      projectId: workspace.projectId,
      repoUrl: workspace.repoUrl,
      repoRef: workspace.repoRef,
      defaultRef: workspace.defaultRef,
    });
    const materializedAt = now();
    await db
      .update(projectWorkspaces)
      .set({
        materializationStatus: "ready",
        materializationError: null,
        materializedAt,
        updatedAt: materializedAt,
      })
      .where(eq(projectWorkspaces.id, workspaceId));
    logger.info(
      { workspaceId, projectId: workspace.projectId, warning: result.warning },
      "materializeProjectWorkspace: ready",
    );
    return { status: "ready", cwd: result.cwd, warning: result.warning };
  } catch (error) {
    const message = formatMaterializationError(error);
    await db
      .update(projectWorkspaces)
      .set({ materializationStatus: "failed", materializationError: message, updatedAt: now() })
      .where(eq(projectWorkspaces.id, workspaceId));
    // Fire-and-forget job: never rethrow — the failure is surfaced via
    // materialization_error + this structured log.
    logger.error(
      { workspaceId, projectId: workspace.projectId, err: error },
      "materializeProjectWorkspace: failed",
    );
    return { status: "failed", error: message };
  }
}

/** Build a stable `<code>: <message>` string from a clone failure. */
function formatMaterializationError(error: unknown): string {
  if (error instanceof ManagedWorkspaceCloneError) {
    return `${error.code}: ${error.message}`;
  }
  if (error instanceof Error) {
    return `unknown: ${error.message}`;
  }
  return `unknown: ${String(error)}`;
}
