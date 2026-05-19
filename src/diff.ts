import * as fs from "fs";
import * as path from "path";
import { execWithWarning } from "./utils/exec";

const CACHE_DIR = ".handoff";
const CACHE_FILE = "last-run.json";

interface HandoffCache {
  timestamp: string;
  outputPath: string;
  tokenEstimate?: number;
}

function cachePath(cwd: string): string {
  return path.join(cwd, CACHE_DIR, CACHE_FILE);
}

export function saveHandoffCache(cwd: string, outputPath: string, tokenEstimate: number): void {
  const dir = path.join(cwd, CACHE_DIR);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const cache: HandoffCache = {
    timestamp: new Date().toISOString(),
    outputPath,
    tokenEstimate,
  };
  fs.writeFileSync(cachePath(cwd), JSON.stringify(cache, null, 2), "utf-8");
}

export function runDiff(cwd: string, outputPath: string): void {
  const cacheFile = cachePath(cwd);
  const sections: string[] = [];

  sections.push("# Changes since last handoff\n");

  if (fs.existsSync(cacheFile)) {
    try {
      const cache = JSON.parse(fs.readFileSync(cacheFile, "utf-8")) as HandoffCache;
      sections.push(`Last generated: ${cache.timestamp}\n`);
    } catch {
      sections.push("Could not read cache metadata.\n");
    }
  } else {
    sections.push("No cache found. Run `handoff-md` first to establish a baseline.\n");
  }

  const status = execWithWarning("git status --porcelain", cwd);
  if (status.stdout) {
    sections.push("## Git changes\n");
    sections.push(`${status.stdout}\n`);
  } else if (!status.warning) {
    sections.push("## Git changes\nWorking tree clean.\n");
  }

  if (fs.existsSync(outputPath)) {
    const stat = fs.statSync(outputPath);
    sections.push("## HANDOFF file\n");
    sections.push(`Modified: ${stat.mtime.toISOString()}\n`);
  }

  console.log(sections.join("\n"));
}
