import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { VERSION } from "../src/version";

describe("VERSION", () => {
  it("matches package.json version", () => {
    const pkg = JSON.parse(readFileSync(join(__dirname, "..", "package.json"), "utf-8"));
    expect(VERSION).toBe(pkg.version);
  });
});
