import * as path from "path";
import { describe, expect, it } from "vitest";
import { readConfigs } from "../src/analyzers/config";

describe("readConfigs", () => {
  it("reads AGENTS.md from fixtures", () => {
    const fixtureRoot = path.join(__dirname, "fixtures", "with-agents");
    const config = readConfigs(fixtureRoot);
    expect(config).not.toBeNull();
    expect(config?.entries.some((e) => e.source === "AGENTS.md")).toBe(true);
  });
});
