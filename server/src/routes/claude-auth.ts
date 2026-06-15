/**
 * @fileoverview Connect Claude — OAuth flow via UI (web-driven CLI auth)
 *
 * Permite que admin da instance autentique o Claude Code CLI (que vive dentro
 * do container Paperclip) sem precisar abrir terminal e rodar `claude auth login`.
 *
 * Fluxo:
 *   1. UI chama POST /init -> backend spawn `claude auth login`, captura URL,
 *      retorna pra UI.
 *   2. User abre URL no browser, autoriza, recebe code.
 *   3. UI chama POST /submit com code -> backend escreve no stdin do child,
 *      aguarda exit, retorna sucesso.
 *   4. GET /status retorna estado atual (`claude auth status` parseado).
 *
 * @module server/routes/claude-auth
 */

import { Router, type Request, type Response } from "express";
import { spawn, type ChildProcess } from "node:child_process";
import { logger } from "../middleware/logger.js";
import { assertBoardOrgAccess, assertInstanceAdmin } from "./authz.js";

// ---------------------------------------------------------------------------
// State (in-memory; flow expira em 10min)
// ---------------------------------------------------------------------------

interface ActiveFlow {
  child: ChildProcess;
  url: string | null;
  startedAt: number;
  stdout: string;
  stderr: string;
  exitCode: number | null;
}

const flows = new Map<string, ActiveFlow>();
const FLOW_TIMEOUT_MS = 10 * 60 * 1000;
const URL_WAIT_MS = 15_000;
const SUBMIT_WAIT_MS = 30_000;

function extractAuthUrl(text: string): string | null {
  // Claude CLI imprime URL no stdout. Captura URLs do dominio Anthropic.
  const match = text.match(
    /https:\/\/(?:claude\.ai|console\.anthropic\.com|auth\.anthropic\.com)\/[^\s'"]+/
  );
  return match ? match[0] : null;
}

function actorKey(req: Request): string {
  const actor = (req as any).actor;
  if (actor?.type === "board" && actor.userId) return `board:${actor.userId}`;
  return "default";
}

function cleanupExpired() {
  const now = Date.now();
  for (const [key, flow] of flows.entries()) {
    if (now - flow.startedAt > FLOW_TIMEOUT_MS) {
      try { flow.child.kill("SIGTERM"); } catch { /* ignore */ }
      flows.delete(key);
    }
  }
}

async function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

export function claudeAuthRoutes(): Router {
  const router = Router();

  // POST /api/adapters/claude-local/auth/init
  // Inicia fluxo OAuth: spawn `claude auth login`, captura URL, retorna.
  router.post("/adapters/claude-local/auth/init", async (req: Request, res: Response) => {
    assertInstanceAdmin(req);
    cleanupExpired();

    const key = actorKey(req);
    const existing = flows.get(key);
    if (existing?.url && existing.exitCode === null) {
      return res.json({ url: existing.url, status: "pending", reused: true });
    }

    const mode = req.body?.mode === "console" ? "--console" : "--claudeai";
    const args: string[] = ["auth", "login", mode];
    if (typeof req.body?.email === "string" && req.body.email.length > 0) {
      args.push("--email", req.body.email);
    }

    logger.info({ args }, "claude-auth.init: spawning");

    const child = spawn("claude", args, {
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, FORCE_COLOR: "0" },
    });

    const flow: ActiveFlow = {
      child,
      url: null,
      startedAt: Date.now(),
      stdout: "",
      stderr: "",
      exitCode: null,
    };
    flows.set(key, flow);

    child.stdout?.on("data", (chunk: Buffer) => {
      const text = chunk.toString("utf8");
      flow.stdout += text;
      if (!flow.url) {
        const url = extractAuthUrl(text);
        if (url) flow.url = url;
      }
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      flow.stderr += chunk.toString("utf8");
    });
    child.on("exit", (code) => { flow.exitCode = code; });
    child.on("error", (err) => {
      logger.error({ err }, "claude-auth.init: spawn error");
    });

    const deadline = Date.now() + URL_WAIT_MS;
    while (!flow.url && Date.now() < deadline) {
      await sleep(200);
      if (flow.exitCode !== null) break;
    }

    if (!flow.url) {
      try { child.kill("SIGTERM"); } catch { /* ignore */ }
      flows.delete(key);
      logger.error(
        { stdout: flow.stdout.slice(0, 500), stderr: flow.stderr.slice(0, 500) },
        "claude-auth.init: no URL captured"
      );
      return res.status(500).json({
        error: "Failed to capture Claude auth URL",
        stdout: flow.stdout.slice(0, 500),
        stderr: flow.stderr.slice(0, 500),
        exitCode: flow.exitCode,
      });
    }

    res.json({ url: flow.url, status: "pending", reused: false });
  });

  // POST /api/adapters/claude-local/auth/submit
  // Envia code recebido pra completar login.
  router.post("/adapters/claude-local/auth/submit", async (req: Request, res: Response) => {
    assertInstanceAdmin(req);

    const key = actorKey(req);
    const flow = flows.get(key);
    if (!flow) {
      return res.status(404).json({ error: "no active flow - call /init first" });
    }

    const code = String(req.body?.code ?? "").trim();
    if (!code) {
      return res.status(400).json({ error: "code required" });
    }

    if (flow.exitCode !== null) {
      flows.delete(key);
      return res.status(410).json({ error: "flow already terminated", exitCode: flow.exitCode });
    }

    try {
      flow.child.stdin?.write(code + "\n");
      flow.child.stdin?.end();
    } catch (err) {
      logger.error({ err }, "claude-auth.submit: stdin write failed");
      return res.status(500).json({ error: "stdin write failed" });
    }

    const deadline = Date.now() + SUBMIT_WAIT_MS;
    while (flow.exitCode === null && Date.now() < deadline) {
      await sleep(200);
    }

    flows.delete(key);

    if (flow.exitCode === 0) {
      return res.json({
        status: "success",
        output: flow.stdout.slice(-2000),
      });
    }

    return res.status(500).json({
      status: "error",
      exitCode: flow.exitCode,
      stdout: flow.stdout.slice(-2000),
      stderr: flow.stderr.slice(-2000),
    });
  });

  // GET /api/adapters/claude-local/auth/status
  // Retorna estado atual de auth do Claude CLI.
  router.get("/adapters/claude-local/auth/status", async (req: Request, res: Response) => {
    assertBoardOrgAccess(req);

    const child = spawn("claude", ["auth", "status"]);
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (c) => { stdout += c.toString("utf8"); });
    child.stderr?.on("data", (c) => { stderr += c.toString("utf8"); });

    const exitPromise = new Promise<number | null>((resolve) => {
      child.on("exit", resolve);
      setTimeout(() => {
        try { child.kill("SIGTERM"); } catch { /* ignore */ }
        resolve(null);
      }, 5_000);
    });
    const exitCode = await exitPromise;

    try {
      const status = JSON.parse(stdout);
      return res.json({ ...status, exitCode });
    } catch {
      return res.json({
        loggedIn: false,
        raw: stdout,
        stderr,
        exitCode,
      });
    }
  });

  return router;
}
