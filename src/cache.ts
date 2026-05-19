import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import type { CiData } from "./analyzers/ci";
import type { ConfigData } from "./analyzers/config";
import type { GitData } from "./analyzers/git";
import type { ScriptsData } from "./analyzers/scripts";
import type { StackInfo } from "./analyzers/stack";
import type { StructureData } from "./analyzers/structure";
import type { WorkspaceData } from "./analyzers/workspace";
import { exec, execWithWarning, isGitRepo } from "./utils/exec";

const CACHE_DIR = ".handoff";
const CACHE_FILE = "cache.json";

export interface HandoffCache {
  version: number;
  lastRun?: {
    timestamp: string;
    outputPath: string;
    tokenEstimate?: number;
    head?: string;
  };
  fingerprints: {
    git?: string;
    stack?: string;
    structure?: string;
    config?: string;
    workspace?: string;
    ci?: string;
    scripts?: string;
  };
  payload: {
    git?: GitData | null;
    stack?: StackInfo;
    structure?: StructureData;
    config?: ConfigData | null;
    workspace?: WorkspaceData | null;
    ci?: CiData | null;
    scripts?: ScriptsData | null;
  };
}

export function cacheFilePath(cwd: string): string {
  return path.join(cwd, CACHE_DIR, CACHE_FILE);
}

export function loadCache(cwd: string): HandoffCache | null {
  const file = cacheFilePath(cwd);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8")) as HandoffCache;
  } catch {
    return null;
  }
}

export function saveCache(cwd: string, cache: HandoffCache): void {
  const dir = path.join(cwd, CACHE_DIR);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(cacheFilePath(cwd), JSON.stringify(cache, null, 2), "utf-8");
}

function hashContent(s: string): string {
  return crypto.createHash("sha256").update(s).digest("hex").slice(0, 16);
}

function fileSig(cwd: string, ...files: string[]): string {
  const parts: string[] = [];
  for (const f of files) {
    const p = path.join(cwd, f);
    if (fs.existsSync(p)) {
      const st = fs.statSync(p);
      parts.push(`${f}:${st.mtimeMs}`);
    }
  }
  return hashContent(parts.join("|"));
}

export function fingerprintGit(cwd: string): string | undefined {
  if (!isGitRepo(cwd)) return undefined;
  const head = execWithWarning("git rev-parse HEAD", cwd).stdout;
  const status = execWithWarning("git status --porcelain", cwd).stdout;
  return hashContent(`${head}|${status}`);
}

export function fingerprintStack(cwd: string): string {
  return fileSig(
    cwd,
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
    "yarn.lock",
    "bun.lock",
    "Cargo.toml",
    "go.mod",
    "pyproject.toml",
  );
}

export function fingerprintStructure(cwd: string): string {
  const dirs = ["src", "packages", "lib", "app"];
  const parts: string[] = [];
  for (const d of dirs) {
    const p = path.join(cwd, d);
    if (fs.existsSync(p)) {
      parts.push(`${d}:${fs.statSync(p).mtimeMs}`);
    }
  }
  parts.push(fileSig(cwd, "package.json", "tsconfig.json"));
  return hashContent(parts.join("|"));
}

export function fingerprintConfig(cwd: string): string {
  const files = ["CLAUDE.md", "AGENTS.md", ".cursorrules", path.join(".cursor", "rules")];
  const parts: string[] = [];
  for (const f of files) {
    const p = path.join(cwd, f);
    if (fs.existsSync(p)) {
      const st = fs.statSync(p);
      parts.push(`${f}:${st.mtimeMs}`);
    }
  }
  return hashContent(parts.join("|"));
}

export function fingerprintWorkspace(cwd: string): string {
  return fileSig(cwd, "pnpm-workspace.yaml", "turbo.json", "nx.json", "package.json");
}

export function fingerprintCi(cwd: string): string {
  const wf = path.join(cwd, ".github", "workflows");
  if (!fs.existsSync(wf)) return "none";
  try {
    const names = fs.readdirSync(wf).sort().join(",");
    const st = fs.statSync(wf).mtimeMs;
    return hashContent(`${names}|${st}`);
  } catch {
    return "none";
  }
}

export function fingerprintScripts(cwd: string): string {
  return fileSig(cwd, "package.json");
}

export interface CacheHitLog {
  git?: boolean;
  stack?: boolean;
  structure?: boolean;
  config?: boolean;
  workspace?: boolean;
  ci?: boolean;
  scripts?: boolean;
}

export function mergeWithCache<T>(
  key: keyof HandoffCache["fingerprints"],
  cwd: string,
  fingerprint: string | undefined,
  cache: HandoffCache | null,
  compute: () => T,
): { value: T; fromCache: boolean } {
  if (!cache || !fingerprint || cache.fingerprints[key] !== fingerprint) {
    return { value: compute(), fromCache: false };
  }
  const cached = cache.payload[key as keyof HandoffCache["payload"]];
  if (cached !== undefined) {
    return { value: cached as T, fromCache: true };
  }
  return { value: compute(), fromCache: false };
}
