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

export function isIgnored(
  cwd: string,
  name: string,
  isDir: boolean,
  extraIgnoreDirs: string[] = [],
  useGit = true,
): boolean {
  if (name.startsWith(".") && name !== ".env.example") {
    if (name !== ".github") return true;
  }
  if (FALLBACK_IGNORE.has(name) || extraIgnoreDirs.includes(name)) return true;

  if (!useGit) return false;

  const relative = name;
  const result = exec(`git check-ignore -q -- "${relative}"`, cwd);
  if (result.ok) return true;

  if (isDir) {
    const nested = exec(`git check-ignore -q -- "${relative}/"`, cwd);
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
