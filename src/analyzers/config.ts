import * as fs from "fs";
import * as path from "path";

export interface ConfigEntry {
  source: string;
  lines: string[];
}

export interface ConfigData {
  entries: ConfigEntry[];
  /** @deprecated use entries */
  existingInstructions: string[];
  /** @deprecated use entries */
  configSource: string;
}

const CONFIG_FILES = [
  { file: "CLAUDE.md", name: "CLAUDE.md" },
  { file: "AGENTS.md", name: "AGENTS.md" },
  { file: ".cursorrules", name: ".cursorrules" },
  { file: ".windsurfrules", name: ".windsurfrules" },
  { file: ".github/copilot-instructions.md", name: "copilot-instructions.md" },
  { file: ".clinerules", name: ".clinerules" },
  { file: ".aider.conf.yml", name: ".aider.conf.yml" },
  { file: "CONTRIBUTING.md", name: "CONTRIBUTING.md" },
  { file: "ARCHITECTURE.md", name: "ARCHITECTURE.md" },
];

const MAX_LINES_PER_FILE = 20;
const MAX_TOTAL_LINES = 40;

function extractLines(content: string, maxLines: number): string[] {
  return content
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .filter((l) => !l.startsWith("#") || l.startsWith("## "))
    .slice(0, maxLines);
}

function readFileLines(cwd: string, file: string, name: string): ConfigEntry | null {
  const fullPath = path.join(cwd, file);
  if (!fs.existsSync(fullPath)) return null;
  try {
    const content = fs.readFileSync(fullPath, "utf-8").trim();
    if (!content) return null;
    const lines = extractLines(content, MAX_LINES_PER_FILE);
    if (lines.length === 0) return null;
    return { source: name, lines };
  } catch {
    return null;
  }
}

function readCursorRules(cwd: string): ConfigEntry[] {
  const rulesDir = path.join(cwd, ".cursor", "rules");
  if (!fs.existsSync(rulesDir)) return [];

  const entries: ConfigEntry[] = [];
  try {
    const files = fs
      .readdirSync(rulesDir)
      .filter((f) => f.endsWith(".md") || f.endsWith(".mdc"))
      .slice(0, 5);

    for (const file of files) {
      const fullPath = path.join(rulesDir, file);
      try {
        const content = fs.readFileSync(fullPath, "utf-8").trim();
        if (!content) continue;
        const lines = extractLines(content, 15);
        if (lines.length > 0) {
          entries.push({ source: `.cursor/rules/${file}`, lines });
        }
      } catch {
        // ignore
      }
    }
  } catch {
    // ignore
  }
  return entries;
}

export function readConfigs(cwd: string, extraFiles?: string[]): ConfigData | null {
  const entries: ConfigEntry[] = [];

  for (const { file, name } of CONFIG_FILES) {
    const entry = readFileLines(cwd, file, name);
    if (entry) entries.push(entry);
  }

  entries.push(...readCursorRules(cwd));

  if (extraFiles) {
    for (const pattern of extraFiles) {
      if (pattern.includes("*")) continue;
      const entry = readFileLines(cwd, pattern, pattern);
      if (entry) entries.push(entry);
    }
  }

  if (entries.length === 0) return null;

  let totalLines = 0;
  const trimmed: ConfigEntry[] = [];
  for (const entry of entries) {
    const remaining = MAX_TOTAL_LINES - totalLines;
    if (remaining <= 0) break;
    const lines = entry.lines.slice(0, remaining);
    trimmed.push({ source: entry.source, lines });
    totalLines += lines.length;
  }

  const flat = trimmed.flatMap((e) => e.lines);

  return {
    entries: trimmed,
    existingInstructions: flat,
    configSource: trimmed.map((e) => e.source).join(", "),
  };
}
