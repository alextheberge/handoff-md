import * as fs from "fs";
import * as path from "path";

export interface ScriptsData {
  scripts: { name: string; command: string }[];
}

const PRIORITY = ["dev", "start", "build", "test", "lint", "format", "typecheck", "check"];

export function analyzeScripts(cwd: string): ScriptsData | null {
  const pkgPath = path.join(cwd, "package.json");
  if (!fs.existsSync(pkgPath)) return null;

  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
    const scripts = pkg.scripts as Record<string, string> | undefined;
    if (!scripts || Object.keys(scripts).length === 0) return null;

    const entries = Object.entries(scripts).map(([name, command]) => ({ name, command }));

    entries.sort((a, b) => {
      const ai = PRIORITY.indexOf(a.name);
      const bi = PRIORITY.indexOf(b.name);
      if (ai === -1 && bi === -1) return a.name.localeCompare(b.name);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });

    return { scripts: entries.slice(0, 5) };
  } catch {
    return null;
  }
}
