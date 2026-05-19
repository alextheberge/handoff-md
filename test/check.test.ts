import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { describe, expect, it } from "vitest";
import { runCheck } from "../src/check";
import { runHandoff, writeHandoff } from "../src/handoff";

describe("runCheck", () => {
  it("passes on freshly generated HANDOFF", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "handoff-check-"));
    fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({ name: "check-fixture" }));

    const result = runHandoff({ cwd: dir, noGit: true, frozenTime: "2026-01-01 00:00:00" });
    writeHandoff(result.meta.outputPath, result.markdown);

    const check = runCheck({ cwd: dir, noTokenLimit: true });
    expect(check.ok).toBe(true);
    expect(check.checks.find((c) => c.name === "section:## Right now")?.passed).toBe(true);
  });
});
