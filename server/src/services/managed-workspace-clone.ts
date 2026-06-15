import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";

const execFile = promisify(execFileCallback);

export const MANAGED_WORKSPACE_GIT_CLONE_TIMEOUT_MS = 10 * 60 * 1000;

export type ManagedWorkspaceCloneErrorCode = "auth_failed" | "not_found" | "timeout" | "unknown";

export class ManagedWorkspaceCloneError extends Error {
  readonly code: ManagedWorkspaceCloneErrorCode;
  /** Repo URL with any embedded credentials stripped — safe to log. */
  readonly repoUrl: string;
  readonly cwd: string;

  constructor(input: {
    code: ManagedWorkspaceCloneErrorCode;
    repoUrl: string;
    cwd: string;
    message: string;
  }) {
    super(input.message);
    this.name = "ManagedWorkspaceCloneError";
    this.code = input.code;
    this.repoUrl = input.repoUrl;
    this.cwd = input.cwd;
  }
}

type RunGit = (
  args: string[],
  options: { env: NodeJS.ProcessEnv; timeout: number },
) => Promise<{ stdout: string; stderr: string }>;

export interface CloneManagedRepoInput {
  repoUrl: string;
  cwd: string;
  /** Preferred branch to clone (e.g. default_ref ?? repo_ref). Null clones the remote default. */
  ref?: string | null;
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
  /** Explicit token override; defaults to GH_TOKEN ?? GITHUB_TOKEN from the effective env. */
  token?: string | null;
  /** Injectable git runner for tests. */
  runGit?: RunGit;
}

const defaultRunGit: RunGit = async (args, options) => {
  const result = await execFile("git", args, options);
  return { stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
};

/** Strip userinfo (credentials) from a URL so it is safe to log or persist. */
function sanitizeRepoUrl(repoUrl: string): string {
  try {
    const parsed = new URL(repoUrl);
    parsed.username = "";
    parsed.password = "";
    return parsed.toString();
  } catch {
    return repoUrl;
  }
}

/** Build an in-memory authenticated clone URL for github.com only. Never logged. */
function buildAuthenticatedUrl(repoUrl: string, token: string | null): string {
  if (!token) return repoUrl;
  let parsed: URL;
  try {
    parsed = new URL(repoUrl);
  } catch {
    return repoUrl;
  }
  if (parsed.protocol !== "https:" || parsed.hostname.toLowerCase() !== "github.com") {
    return repoUrl;
  }
  return `https://x-access-token:${token}@github.com${parsed.pathname}${parsed.search}`;
}

function redactToken(text: string, token: string | null): string {
  if (!token) return text;
  return text.split(token).join("***");
}

function gitErrorText(error: unknown): string {
  if (typeof error === "object" && error) {
    const candidate = error as { stderr?: unknown; stdout?: unknown; message?: unknown };
    const parts = [candidate.stderr, candidate.stdout, candidate.message]
      .map((value) => (typeof value === "string" ? value : ""))
      .filter(Boolean);
    if (parts.length > 0) return parts.join("\n");
  }
  return error instanceof Error ? error.message : String(error);
}

function isTimeout(error: unknown): boolean {
  if (typeof error !== "object" || !error) return false;
  const candidate = error as { killed?: unknown; signal?: unknown; code?: unknown };
  if (candidate.code === "ETIMEDOUT") return true;
  return candidate.killed === true && typeof candidate.signal === "string";
}

function isRemoteBranchNotFound(text: string): boolean {
  return /remote branch .* not found/i.test(text);
}

function classifyGitError(text: string): ManagedWorkspaceCloneErrorCode {
  const normalized = text.toLowerCase();
  if (
    normalized.includes("authentication failed") ||
    normalized.includes("invalid username or password") ||
    normalized.includes("could not read username") ||
    normalized.includes("could not read password") ||
    normalized.includes("terminal prompts disabled") ||
    normalized.includes("permission denied")
  ) {
    return "auth_failed";
  }
  if (
    normalized.includes("repository not found") ||
    normalized.includes("not found") ||
    normalized.includes("does not exist")
  ) {
    return "not_found";
  }
  return "unknown";
}

/**
 * Clone a managed project repo into `cwd`, injecting GH_TOKEN auth in-memory for
 * github.com so private repos succeed. The token is never written to disk: after the
 * clone we reset `origin` to the credential-free URL so worktrees reading `.git/config`
 * cannot leak it. Throws a structured {@link ManagedWorkspaceCloneError} on failure.
 */
export async function cloneManagedRepo(
  input: CloneManagedRepoInput,
): Promise<{ cwd: string; warning: string | null }> {
  const baseEnv = input.env ?? process.env;
  const token = input.token ?? baseEnv.GH_TOKEN ?? baseEnv.GITHUB_TOKEN ?? null;
  const timeout = input.timeoutMs ?? MANAGED_WORKSPACE_GIT_CLONE_TIMEOUT_MS;
  const runGit = input.runGit ?? defaultRunGit;

  const cleanUrl = sanitizeRepoUrl(input.repoUrl);
  const authUrl = buildAuthenticatedUrl(input.repoUrl, token);
  // GIT_TERMINAL_PROMPT=0 makes auth failures fail fast instead of hanging on a prompt.
  const env: NodeJS.ProcessEnv = { ...baseEnv, GIT_TERMINAL_PROMPT: "0" };

  const ref = input.ref?.trim() || null;
  let warning: string | null = null;

  const runClone = async (args: string[]) => {
    await runGit(["clone", ...args, authUrl, input.cwd], { env, timeout });
  };

  try {
    if (ref) {
      await runClone(["--branch", ref]);
    } else {
      await runClone([]);
    }
  } catch (error) {
    const text = redactToken(gitErrorText(error), token);

    // Stale/missing branch: retry cloning the remote default branch.
    if (ref && isRemoteBranchNotFound(text)) {
      try {
        await runClone([]);
        warning = `Branch "${ref}" not found for "${cleanUrl}"; cloned the default branch instead.`;
      } catch (retryError) {
        throw toCloneError(retryError, token, cleanUrl, input.cwd);
      }
    } else {
      throw toCloneError(error, token, cleanUrl, input.cwd);
    }
  }

  // Strip the token from the persisted remote so worktrees never read it from .git/config.
  try {
    await runGit(["-C", input.cwd, "remote", "set-url", "origin", cleanUrl], { env, timeout });
  } catch (error) {
    const text = redactToken(gitErrorText(error), token);
    throw new ManagedWorkspaceCloneError({
      code: "unknown",
      repoUrl: cleanUrl,
      cwd: input.cwd,
      message: `Cloned "${cleanUrl}" but failed to reset origin remote: ${text}`,
    });
  }

  return { cwd: input.cwd, warning };
}

function toCloneError(
  error: unknown,
  token: string | null,
  cleanUrl: string,
  cwd: string,
): ManagedWorkspaceCloneError {
  if (isTimeout(error)) {
    return new ManagedWorkspaceCloneError({
      code: "timeout",
      repoUrl: cleanUrl,
      cwd,
      message: `Timed out cloning "${cleanUrl}".`,
    });
  }
  const text = redactToken(gitErrorText(error), token);
  return new ManagedWorkspaceCloneError({
    code: classifyGitError(text),
    repoUrl: cleanUrl,
    cwd,
    message: `Failed to clone "${cleanUrl}": ${text}`,
  });
}
