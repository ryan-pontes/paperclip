/**
 * ConnectClaudeButton — UI flow pra autenticar Claude CLI dentro do container
 * via OAuth, sem precisar abrir terminal.
 *
 * Fluxo:
 *   1. Click "Connect Claude" -> chama POST /api/adapters/claude-local/auth/init
 *   2. Backend spawn `claude auth login`, captura URL, retorna
 *   3. UI mostra URL clicável + botão "Copy" + input pro code
 *   4. User abre URL, autoriza, recebe code
 *   5. Cola code, clica Submit -> POST /submit
 *   6. Status refresh, banner desaparece
 */

import { useState, useEffect, useCallback } from "react";
import { Loader2, ExternalLink, Copy, CheckCircle2, XCircle, RefreshCw } from "lucide-react";

interface AuthStatus {
  loggedIn?: boolean;
  authMethod?: string;
  apiProvider?: string;
  raw?: string;
  exitCode?: number | null;
}

type FlowState =
  | { kind: "idle" }
  | { kind: "starting" }
  | { kind: "awaiting_code"; url: string }
  | { kind: "submitting" }
  | { kind: "success" }
  | { kind: "error"; message: string };

async function api<T = unknown>(
  path: string,
  init?: RequestInit,
): Promise<{ ok: boolean; data: T; status: number }> {
  const res = await fetch(path, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data: data as T, status: res.status };
}

export function ConnectClaudeButton() {
  const [status, setStatus] = useState<AuthStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [flow, setFlow] = useState<FlowState>({ kind: "idle" });
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);

  const refreshStatus = useCallback(async () => {
    setStatusLoading(true);
    try {
      const { ok, data } = await api<AuthStatus>(
        "/api/adapters/claude-local/auth/status",
      );
      if (ok) setStatus(data);
    } catch (e) {
      // ignore
    } finally {
      setStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  const startFlow = async () => {
    setFlow({ kind: "starting" });
    const { ok, data, status: code } = await api<{ url?: string; error?: string }>(
      "/api/adapters/claude-local/auth/init",
      { method: "POST", body: JSON.stringify({ mode: "claudeai" }) },
    );
    if (!ok || !data.url) {
      setFlow({
        kind: "error",
        message: data.error || `Failed to start auth flow (HTTP ${code})`,
      });
      return;
    }
    setFlow({ kind: "awaiting_code", url: data.url });
  };

  const submitCode = async () => {
    if (!code.trim()) return;
    setFlow({ kind: "submitting" });
    const { ok, data, status: httpStatus } = await api<{
      status?: string;
      error?: string;
      stderr?: string;
    }>("/api/adapters/claude-local/auth/submit", {
      method: "POST",
      body: JSON.stringify({ code: code.trim() }),
    });
    if (ok && data.status === "success") {
      setFlow({ kind: "success" });
      setCode("");
      await refreshStatus();
      setTimeout(() => setFlow({ kind: "idle" }), 2500);
      return;
    }
    setFlow({
      kind: "error",
      message:
        data.error ||
        data.stderr ||
        `Login failed (HTTP ${httpStatus})`,
    });
  };

  const reset = () => {
    setFlow({ kind: "idle" });
    setCode("");
  };

  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  const isLoggedIn = status?.loggedIn === true;

  return (
    <div className="rounded-lg border border-border bg-card p-4 mb-4">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <h4 className="text-sm font-semibold mb-1">Claude Code authentication</h4>
          <p className="text-xs text-muted-foreground">
            Connect Claude Code (CLI inside this Paperclip container) to your Anthropic account.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {statusLoading ? (
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          ) : isLoggedIn ? (
            <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              <CheckCircle2 className="size-4" />
              Connected ({status?.authMethod || "claudeai"})
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-medium">
              <XCircle className="size-4" />
              Not connected
            </span>
          )}
          <button
            type="button"
            onClick={refreshStatus}
            className="p-1 rounded hover:bg-muted text-muted-foreground"
            title="Refresh status"
          >
            <RefreshCw className="size-3.5" />
          </button>
        </div>
      </div>

      {flow.kind === "idle" && (
        <button
          type="button"
          onClick={startFlow}
          className="text-sm px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:opacity-90 inline-flex items-center gap-2"
        >
          {isLoggedIn ? "Reconnect Claude" : "Connect Claude"}
        </button>
      )}

      {flow.kind === "starting" && (
        <div className="text-sm text-muted-foreground inline-flex items-center gap-2">
          <Loader2 className="size-4 animate-spin" />
          Starting auth flow...
        </div>
      )}

      {flow.kind === "awaiting_code" && (
        <div className="space-y-3">
          <div className="text-sm">
            <p className="mb-2">Open this URL in your browser and authorize:</p>
            <div className="flex items-center gap-2 bg-muted rounded-md p-2">
              <a
                href={flow.url}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-primary truncate flex-1 inline-flex items-center gap-1"
              >
                <ExternalLink className="size-3 shrink-0" />
                <span className="truncate">{flow.url}</span>
              </a>
              <button
                type="button"
                onClick={() => copyUrl(flow.url)}
                className="text-xs px-2 py-1 rounded hover:bg-background"
                title="Copy URL"
              >
                {copied ? <CheckCircle2 className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Paste authorization code:</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="ory_at_..."
                className="flex-1 rounded-md border border-border px-2.5 py-1.5 bg-transparent outline-none text-sm font-mono"
                autoFocus
              />
              <button
                type="button"
                onClick={submitCode}
                disabled={!code.trim()}
                className="text-sm px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Submit
              </button>
              <button
                type="button"
                onClick={reset}
                className="text-sm px-3 py-1.5 rounded-md border border-border hover:bg-muted"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {flow.kind === "submitting" && (
        <div className="text-sm text-muted-foreground inline-flex items-center gap-2">
          <Loader2 className="size-4 animate-spin" />
          Completing login...
        </div>
      )}

      {flow.kind === "success" && (
        <div className="text-sm text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-2">
          <CheckCircle2 className="size-4" />
          Claude connected successfully!
        </div>
      )}

      {flow.kind === "error" && (
        <div className="space-y-2">
          <div className="text-sm text-red-600 dark:text-red-400 inline-flex items-start gap-2">
            <XCircle className="size-4 shrink-0 mt-0.5" />
            <span className="break-all">{flow.message}</span>
          </div>
          <button
            type="button"
            onClick={reset}
            className="text-xs px-2 py-1 rounded-md border border-border hover:bg-muted"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
