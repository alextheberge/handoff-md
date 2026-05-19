import { describe, expect, it } from "vitest";
import type { AssembledContext } from "../src/assembler";
import { DEFAULT_SECTIONS } from "../src/assembler";
import { parseChangedPath, synthesizeNow } from "../src/synthesis/now";

function ctx(partial: Partial<AssembledContext>): AssembledContext {
  return {
    projectName: "test",
    timestamp: "2026-01-01 00:00:00",
    git: null,
    stack: {
      framework: "unknown",
      frameworkConfidence: 0,
      language: "TypeScript",
      packageManager: "npm",
    },
    structure: { tree: [], entryPoints: [], conventions: [], todos: [], envVars: [] },
    config: null,
    workspace: null,
    ci: null,
    scripts: null,
    github: null,
    overlay: null,
    format: "standard",
    warnings: [],
    sections: DEFAULT_SECTIONS,
    specVersion: 2,
    shrinkLevel: 0,
    ...partial,
  };
}

describe("parseChangedPath", () => {
  it("parses standard porcelain lines", () => {
    expect(parseChangedPath(" M README.md")).toBe("README.md");
    expect(parseChangedPath("MM src/foo.ts")).toBe("src/foo.ts");
    expect(parseChangedPath("?? new-file.ts")).toBe("new-file.ts");
  });

  it("handles renames", () => {
    expect(parseChangedPath("R  old.ts -> new.ts")).toBe("new.ts");
  });
});

describe("synthesizeNow", () => {
  it("reports merge conflicts with highest priority", () => {
    const bullets = synthesizeNow(
      ctx({
        git: {
          currentBranch: "main",
          recentCommits: [],
          uncommittedChanges: [],
          activeBranches: [],
          lastMerge: null,
          conflictFiles: ["src/a.ts"],
        },
      }),
    );
    expect(bullets[0].text).toContain("Merge conflicts");
  });

  it("reports active edits", () => {
    const bullets = synthesizeNow(
      ctx({
        git: {
          currentBranch: "feat/x",
          recentCommits: [],
          uncommittedChanges: [" M src/payment.ts"],
          activeBranches: [],
          lastMerge: null,
          conflictFiles: [],
        },
      }),
    );
    expect(bullets.some((b) => b.text.includes("Active edits"))).toBe(true);
  });

  it("caps at 5 bullets", () => {
    const bullets = synthesizeNow(
      ctx({
        git: {
          currentBranch: "main",
          aheadBehind: "2 ahead",
          recentCommits: [{ hash: "abc", message: "fix", author: "a", date: "2026-05-18" }],
          uncommittedChanges: [" M a.ts", " M b.ts"],
          activeBranches: [],
          lastMerge: { hash: "m1", message: "merge", author: "a", date: "2026-05-18" },
          conflictFiles: ["c.ts"],
        },
      }),
    );
    expect(bullets.length).toBeLessThanOrEqual(5);
  });

  it("always returns at least one bullet without git", () => {
    const bullets = synthesizeNow(ctx({ git: null }));
    expect(bullets.length).toBeGreaterThan(0);
    expect(bullets[0].text).toContain("git");
  });
});
