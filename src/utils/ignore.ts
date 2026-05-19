import * as path from "path";
import { exec } from "./exec";

const FALLBACK_IGNORE = new Set([
  "node_modules",
  ".git",
  ".next",
  "dist",
  "build",
  "coverage",
  "target",
  "__pycache__",
  ".handoff",
]);

const ALLOWED_DOT_DIRS = new Set([".github", ".cursor"]);

export function isIgnored(
  cwd: string,
  relativePath: string,
  isDir: boolean,
  extraIgnoreDirs: string[] = [],
  useGit = true,
): boolean {
  const base = path.basename(relativePath);

  if (FALLBACK_IGNORE.has(base) || extraIgnoreDirs.includes(base)) {
    return true;
  }

  if (base.startsWith(".") && base !== ".env.example" && !ALLOWED_DOT_DIRS.has(base)) {
    return true;
  }

  if (!useGit) return false;

  const quoted = relativePath.replace(/"/g, '\\"');
  const result = exec(`git check-ignore -q -- "${quoted}"`, cwd);
  if (result.ok) return true;

  if (isDir) {
    const nested = exec(`git check-ignore -q -- "${quoted}/"`, cwd);
    return nested.ok;
  }
  return false;
}

export function shouldSkipEntry(
  cwd: string,
  dir: string,
  entryName: string,
  isDirectory: boolean,
  extraIgnoreDirs: string[] = [],
): boolean {
  const full = path.join(dir, entryName);
  const rel = path.relative(cwd, full) || entryName;
  return isIgnored(cwd, rel, isDirectory, extraIgnoreDirs);
}
