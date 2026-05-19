import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { describe, expect, it } from "vitest";
import { analyzeStack } from "../src/analyzers/stack";

describe("analyzeStack", () => {
  it("detects Next.js from package.json", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "handoff-stack-"));
    fs.writeFileSync(
      path.join(dir, "package.json"),
      JSON.stringify({
        dependencies: { next: "14.0.0", react: "18.0.0" },
      }),
    );
    fs.writeFileSync(path.join(dir, "tsconfig.json"), "{}");

    const stack = analyzeStack(dir);
    expect(stack.framework).toBe("Next.js");
    expect(stack.frameworkConfidence).toBeGreaterThan(0.9);
    expect(stack.language).toBe("TypeScript");
  });
});
