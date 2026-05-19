import { execSync } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { describe, expect, it } from "vitest";
import { buildTree } from "../src/analyzers/structure";
import { isIgnored } from "../src/utils/ignore";

describe("isIgnored", () => {
  it("allows .github/workflows paths", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "handoff-ignore-"));
    runGit(dir, "git init");
    fs.writeFileSync(path.join(dir, ".gitignore"), "secret/\n");
    fs.mkdirSync(path.join(dir, ".github", "workflows"), { recursive: true });
    fs.writeFileSync(path.join(dir, ".github", "workflows", "ci.yml"), "name: ci\n");
    fs.mkdirSync(path.join(dir, "secret"));
    fs.writeFileSync(path.join(dir, "secret", "x.txt"), "x");

    expect(isIgnored(dir, ".github/workflows/ci.yml", false)).toBe(false);
    expect(isIgnored(dir, "secret/x.txt", false)).toBe(true);
  });

  it("buildTree includes .github children", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "handoff-tree-"));
    runGit(dir, "git init");
    fs.mkdirSync(path.join(dir, ".github", "workflows"), { recursive: true });
    fs.writeFileSync(path.join(dir, ".github", "workflows", "ci.yml"), "x");

    const tree = buildTree(dir, 2);
    const names = tree.map((e) => e.name);
    expect(names).toContain(".github/");
  });
});

function runGit(cwd: string, cmd: string): void {
  execSync(cmd, { cwd, stdio: "pipe" });
}
