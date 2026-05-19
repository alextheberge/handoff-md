import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { describe, expect, it } from "vitest";
import { runHandoff } from "../src/handoff";
import { readOverlay } from "../src/overlay";

describe("overlay", () => {
  it("reads overlay file", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "handoff-overlay-"));
    fs.writeFileSync(path.join(dir, ".handoff.overlay.md"), "## Human\n- Migration in progress\n");
    expect(readOverlay(dir)).toContain("Migration");
  });

  it("renders Notes section", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "handoff-overlay-"));
    fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({ name: "x" }));
    fs.writeFileSync(path.join(dir, ".handoff.overlay.md"), "Team uses pnpm only.\n");
    const r = runHandoff({ cwd: dir, noGit: true, frozenTime: "2026-01-01 00:00:00" });
    expect(r.markdown).toContain("## Notes");
    expect(r.markdown).toContain("pnpm only");
  });
});
