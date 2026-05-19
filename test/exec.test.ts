import { describe, expect, it } from "vitest";
import { exec, execWithWarning } from "../src/utils/exec";

describe("exec", () => {
  it("returns failure for invalid command", () => {
    const result = exec("this-command-does-not-exist-xyz");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeTruthy();
    }
  });

  it("execWithWarning surfaces warning on failure", () => {
    const { stdout, warning } = execWithWarning("false");
    expect(stdout).toBe("");
    expect(warning).toContain("Command failed");
  });
});
