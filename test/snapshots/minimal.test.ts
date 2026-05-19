import * as path from "path";
import { describe, expect, it } from "vitest";
import { runHandoff } from "../../src/handoff";

describe("snapshot stability", () => {
  it("produces identical output with frozen time", () => {
    const fixture = path.join(__dirname, "..", "fixtures", "minimal");
    const frozen = "2026-06-01 12:00:00";
    const a = runHandoff({ cwd: fixture, frozenTime: frozen, noGit: true, noCache: true });
    const b = runHandoff({ cwd: fixture, frozenTime: frozen, noGit: true, noCache: true });
    expect(a.markdown).toBe(b.markdown);
    expect(a.markdown).toContain("handoff-spec: 2");
    expect(a.markdown).toContain("## Stack");
  });
});
