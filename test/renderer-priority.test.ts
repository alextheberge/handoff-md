import { describe, expect, it } from "vitest";
import type { AssembledContext } from "../src/assembler";
import { DEFAULT_SECTIONS, estimateTokens } from "../src/assembler";
import { renderHandoff } from "../src/renderer";
import { FORMAT_TOTAL_TOKEN_CAP } from "../src/spec";

function heavyContext(): AssembledContext {
  const bigTree = Array.from({ length: 30 }, (_, i) => ({
    name: `dir${i}/`,
    type: "dir" as const,
    children: [{ name: "file.ts", type: "file" as const }],
  }));
  return {
    projectName: "big",
    timestamp: "2026-01-01 00:00:00",
    git: {
      currentBranch: "main",
      recentCommits: Array.from({ length: 20 }, (_, i) => ({
        hash: `h${i}`,
        message: `commit ${i}`,
        author: "a",
        date: "2026-01-01",
      })),
      uncommittedChanges: [],
      activeBranches: [],
      lastMerge: null,
      conflictFiles: [],
    },
    stack: {
      framework: "Next.js",
      frameworkConfidence: 0.98,
      language: "TypeScript",
      packageManager: "npm",
    },
    structure: {
      tree: bigTree,
      entryPoints: ["src/index.ts"],
      conventions: [{ category: "Naming", pattern: "kebab" }],
      todos: [],
      envVars: [],
    },
    config: null,
    workspace: { type: "monorepo", packages: ["a", "b"] },
    ci: { workflows: ["ci.yml"], jobs: ["test", "lint"] },
    scripts: { scripts: [{ name: "dev", command: "next dev" }] },
    github: null,
    overlay: null,
    format: "compact",
    warnings: [],
    sections: DEFAULT_SECTIONS,
    specVersion: 2,
    shrinkLevel: 0,
  };
}

describe("renderHandoff priority", () => {
  it("stays under compact token cap", () => {
    const md = renderHandoff(heavyContext());
    expect(estimateTokens(md)).toBeLessThanOrEqual(FORMAT_TOTAL_TOKEN_CAP.compact + 50);
    expect(md).toContain("## Right now");
    expect(md).toContain("## Stack");
  });

  it("drops structure before stack under pressure", () => {
    const md = renderHandoff(heavyContext());
    if (estimateTokens(md) > FORMAT_TOTAL_TOKEN_CAP.compact - 100) {
      expect(md).not.toContain("## Structure");
    }
  });
});
