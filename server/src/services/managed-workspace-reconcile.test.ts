import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { reconcileExistingManagedWorkspace } from "./managed-workspace-reconcile.js";

describe("reconcileExistingManagedWorkspace (injected fs)", () => {
  it("clones when the dir holds ONLY .paperclip and restores the metadata (NODE-141)", async () => {
    const cwd = "/tmp/workspace";
    const renames: Array<[string, string]> = [];
    const removed: string[] = [];
    let cloneCalls = 0;

    const result = await reconcileExistingManagedWorkspace({
      cwd,
      clone: async () => {
        cloneCalls += 1;
        return { cwd, warning: null };
      },
      deps: {
        readdir: async () => [".paperclip"],
        rename: async (from, to) => {
          renames.push([from, to]);
        },
        rm: async (target) => {
          removed.push(target);
        },
        uniqueSuffix: () => "fixed",
      },
    });

    // The clone MUST run — a .paperclip-only dir is not a real checkout.
    expect(cloneCalls).toBe(1);
    expect(result.warning).toBeNull();

    // The dir is moved aside before cloning...
    expect(renames[0]).toEqual([cwd, `${cwd}.preclone-fixed`]);
    // ...and .paperclip is restored into the freshly-cloned checkout.
    expect(renames).toContainEqual([
      path.join(`${cwd}.preclone-fixed`, ".paperclip"),
      path.join(cwd, ".paperclip"),
    ]);
    // The stash dir is cleaned up afterwards.
    expect(removed).toContain(`${cwd}.preclone-fixed`);
  });

  it("reuses a dir with real (non-paperclip) content as-is and does NOT clone", async () => {
    let cloneCalls = 0;
    const result = await reconcileExistingManagedWorkspace({
      cwd: "/tmp/workspace",
      clone: async () => {
        cloneCalls += 1;
        return { cwd: "/tmp/workspace", warning: null };
      },
      deps: {
        readdir: async () => [".paperclip", "package.json", "src"],
      },
    });

    expect(cloneCalls).toBe(0);
    expect(result.warning).toMatch(/already exists but is not a git checkout/);
  });

  it("removes a genuinely empty dir and clones", async () => {
    const removed: string[] = [];
    let cloneCalls = 0;
    await reconcileExistingManagedWorkspace({
      cwd: "/tmp/workspace",
      clone: async () => {
        cloneCalls += 1;
        return { cwd: "/tmp/workspace", warning: null };
      },
      deps: {
        readdir: async () => [],
        rm: async (target) => {
          removed.push(target);
        },
      },
    });

    expect(removed).toEqual(["/tmp/workspace"]);
    expect(cloneCalls).toBe(1);
  });

  it("restores the original dir when the clone fails, so .paperclip is never lost", async () => {
    const cwd = "/tmp/workspace";
    const renames: Array<[string, string]> = [];
    let error: unknown;
    try {
      await reconcileExistingManagedWorkspace({
        cwd,
        clone: async () => {
          throw new Error("clone exploded");
        },
        deps: {
          readdir: async () => [".paperclip"],
          rename: async (from, to) => {
            renames.push([from, to]);
          },
          rm: async () => {},
          uniqueSuffix: () => "fixed",
        },
      });
    } catch (caught) {
      error = caught;
    }

    expect((error as Error).message).toBe("clone exploded");
    // Moved aside, then moved back on failure.
    expect(renames[0]).toEqual([cwd, `${cwd}.preclone-fixed`]);
    expect(renames[1]).toEqual([`${cwd}.preclone-fixed`, cwd]);
  });
});

describe("reconcileExistingManagedWorkspace (real fs)", () => {
  let tmpRoot: string;

  beforeEach(async () => {
    tmpRoot = path.join(os.tmpdir(), `managed-reconcile-test-${randomUUID()}`);
    await fs.mkdir(tmpRoot, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tmpRoot, { recursive: true, force: true });
  });

  it("preserves .paperclip across a real move/clone/restore cycle", async () => {
    const cwd = path.join(tmpRoot, "nodechat-platform");
    await fs.mkdir(path.join(cwd, ".paperclip"), { recursive: true });
    await fs.writeFile(path.join(cwd, ".paperclip", "marker.json"), '{"keep":true}\n');

    const result = await reconcileExistingManagedWorkspace({
      cwd,
      // Simulate `git clone` creating the checkout at the now-absent cwd.
      clone: async () => {
        await fs.mkdir(path.join(cwd, ".git"), { recursive: true });
        await fs.writeFile(path.join(cwd, "README.md"), "cloned\n");
        return { cwd, warning: null };
      },
    });

    expect(result.warning).toBeNull();
    // Cloned content is present.
    expect((await fs.stat(path.join(cwd, ".git"))).isDirectory()).toBe(true);
    expect(await fs.readFile(path.join(cwd, "README.md"), "utf8")).toBe("cloned\n");
    // .paperclip metadata survived.
    expect(await fs.readFile(path.join(cwd, ".paperclip", "marker.json"), "utf8")).toBe(
      '{"keep":true}\n',
    );
    // No leftover stash dirs.
    const siblings = await fs.readdir(tmpRoot);
    expect(siblings.filter((entry) => entry.includes(".preclone-"))).toEqual([]);
  });
});
