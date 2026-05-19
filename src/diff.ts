import * as fs from "fs";
import * as path from "path";
import {
  type HandoffCache,
  cacheFilePath,
  fingerprintCi,
  fingerprintConfig,
  fingerprintGit,
  fingerprintScripts,
  fingerprintStack,
  fingerprintStructure,
  fingerprintWorkspace,
  loadCache,
} from "./cache";
import { execWithWarning } from "./utils/exec";

export function saveHandoffCache(cwd: string, outputPath: string, tokenEstimate: number): void {
  const cache = loadCache(cwd) ?? { version: 1, fingerprints: {}, payload: {} };
  cache.lastRun = {
    timestamp: new Date().toISOString(),
    outputPath,
    tokenEstimate,
  };
  const dir = path.join(cwd, ".handoff");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(cacheFilePath(cwd), JSON.stringify(cache, null, 2), "utf-8");
}

function extractSection(content: string, heading: string): string[] {
  const lines = content.split("\n");
  const start = lines.findIndex((l) => l.startsWith(heading));
  if (start < 0) return [];
  const out: string[] = [];
  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i].startsWith("## ")) break;
    out.push(lines[i]);
  }
  return out;
}

function diffLines(before: string[], after: string[]): string[] {
  const b = new Set(before.map((l) => l.trim()).filter(Boolean));
  const added = after.filter((l) => l.trim() && !b.has(l.trim()));
  return added;
}

export function runDiff(cwd: string, outputPath: string): void {
  const cache = loadCache(cwd);
  const sections: string[] = ["# Changes since last handoff\n"];

  if (cache?.lastRun) {
    sections.push(`Last generated: ${cache.lastRun.timestamp}`);
    if (cache.lastRun.head) {
      sections.push(`Last HEAD: \`${cache.lastRun.head}\`\n`);
    }
  } else {
    sections.push("No cache found. Run `handoff-md` first.\n");
  }

  const current: Record<string, string | undefined> = {
    git: fingerprintGit(cwd),
    stack: fingerprintStack(cwd),
    structure: fingerprintStructure(cwd),
    config: fingerprintConfig(cwd),
    workspace: fingerprintWorkspace(cwd),
    ci: fingerprintCi(cwd),
    scripts: fingerprintScripts(cwd),
  };

  sections.push("## Analyzer freshness\n");
  for (const [name, fp] of Object.entries(current)) {
    const cached = cache?.fingerprints[name as keyof HandoffCache["fingerprints"]];
    const status = cached && cached === fp ? "cached (unchanged)" : "would re-run";
    sections.push(`- ${name}: ${status}`);
  }
  sections.push("");

  const status = execWithWarning("git status --porcelain", cwd);
  if (status.stdout) {
    sections.push("## Git changes\n");
    sections.push(`${status.stdout}\n`);
  } else if (!status.warning) {
    sections.push("## Git changes\nWorking tree clean.\n");
  }

  if (cache?.lastRun?.head) {
    const diff = execWithWarning(`git diff --stat ${cache.lastRun.head}..HEAD 2>/dev/null`, cwd);
    if (diff.stdout) {
      sections.push("## Commits since last handoff\n");
      sections.push(`${diff.stdout}\n`);
    }
  }

  if (fs.existsSync(outputPath)) {
    const content = fs.readFileSync(outputPath, "utf-8");
    const stat = fs.statSync(outputPath);
    sections.push(`## HANDOFF file (mtime ${stat.mtime.toISOString()})\n`);

    const nowBefore = extractSection(content, "## Right now");
    sections.push("### Right now (stored file)\n");
    sections.push(nowBefore.slice(0, 8).join("\n") || "(empty)\n");
  }

  console.log(sections.join("\n"));
}
