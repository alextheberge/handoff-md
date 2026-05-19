import { execSync } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { describe, expect, it } from "vitest";
import { analyzeGit } from "../src/analyzers/git";

function runGit(cwd: string, cmd: string): void {
  execSync(cmd, { cwd, stdio: "pipe" });
}

describe("analyzeGit", () => {
  it("parses commits with pipe in subject using field separator", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "handoff-git-"));
    runGit(dir, "git init");
    runGit(dir, 'git config user.email "test@example.com"');
    runGit(dir, 'git config user.name "Test"');
    fs.writeFileSync(path.join(dir, "readme.txt"), "hello");
    runGit(dir, "git add .");
    runGit(dir, 'git commit -m "fix: a|b|c"');

    const { data, warnings } = analyzeGit(dir);
    expect(warnings).toEqual([]);
    expect(data).not.toBeNull();
    expect(data?.recentCommits[0].message).toBe("fix: a|b|c");
  });

  it("returns null for non-git directory", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "handoff-nogit-"));
    const { data } = analyzeGit(dir);
    expect(data).toBeNull();
  });
});
