import { describe, expect, it } from "vitest";
import { type AssembledContext, DEFAULT_SECTIONS } from "../src/assembler";
import { renderHandoff } from "../src/renderer";

function minimalContext(overrides: Partial<AssembledContext> = {}): AssembledContext {
  return {
    projectName: "test-app",
    timestamp: "2026-05-18 12:00:00",
    git: null,
    stack: {
      framework: "Next.js",
      frameworkConfidence: 0.98,
      language: "TypeScript",
      packageManager: "pnpm",
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
    ...overrides,
  };
}

describe("renderHandoff", () => {
  it("includes header, right now, and stack", () => {
    const md = renderHandoff(minimalContext());
    expect(md).toContain("# HANDOFF — test-app");
    expect(md).toContain("## Stack");
    expect(md).toContain("handoff-spec: 2");
  });

  it("includes warnings section when present", () => {
    const md = renderHandoff(minimalContext({ warnings: ["Command failed: git log (timeout)"] }));
    expect(md).toContain("## Warnings");
    expect(md).toContain("git log");
  });

  it("omits framework in compact when low confidence", () => {
    const md = renderHandoff(
      minimalContext({
        format: "compact",
        stack: {
          framework: "React",
          frameworkConfidence: 0.5,
          language: "TypeScript",
          packageManager: "npm",
        },
      }),
    );
    expect(md).not.toContain("React +");
    expect(md).toContain("TypeScript");
  });
});
