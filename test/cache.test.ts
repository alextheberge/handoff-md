import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { describe, expect, it } from "vitest";
import { fingerprintStack, loadCache, saveCache } from "../src/cache";
import { runHandoff } from "../src/handoff";

describe("cache", () => {
  it("reuses stack on second run", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "handoff-cache-"));
    fs.writeFileSync(
      path.join(dir, "package.json"),
      JSON.stringify({ name: "cached-proj", dependencies: { express: "4" } }),
    );

    const r1 = runHandoff({ cwd: dir, noGit: true });
    const cache = loadCache(dir);
    expect(cache?.payload.stack).toBeDefined();

    const fp = fingerprintStack(dir);
    expect(cache?.fingerprints.stack).toBe(fp);

    const r2 = runHandoff({ cwd: dir, noGit: true, verbose: false });
    expect(r2.meta.cacheHits).toContain("stack");
    expect(r1.markdown).toBe(r2.markdown);
  });
});
