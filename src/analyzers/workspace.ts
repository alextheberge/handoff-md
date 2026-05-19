import * as fs from "fs";
import * as path from "path";

export interface WorkspaceData {
  type: string;
  packages: string[];
}

function fileExists(cwd: string, ...paths: string[]): boolean {
  return fs.existsSync(path.join(cwd, ...paths));
}

function readText(cwd: string, file: string): string | null {
  try {
    return fs.readFileSync(path.join(cwd, file), "utf-8");
  } catch {
    return null;
  }
}

export function analyzeWorkspace(cwd: string): WorkspaceData | null {
  if (fileExists(cwd, "pnpm-workspace.yaml")) {
    const content = readText(cwd, "pnpm-workspace.yaml") || "";
    const packages = content
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.startsWith("- "))
      .map((l) => l.replace(/^-\s*['"]?|['"]$/g, "").trim())
      .slice(0, 15);
    return { type: "pnpm workspace", packages };
  }

  if (fileExists(cwd, "turbo.json")) {
    const pkgDirs: string[] = [];
    if (fileExists(cwd, "packages")) {
      try {
        const entries = fs.readdirSync(path.join(cwd, "packages"), { withFileTypes: true });
        for (const e of entries) {
          if (e.isDirectory()) pkgDirs.push(`packages/${e.name}`);
        }
      } catch {
        // ignore
      }
    }
    return { type: "Turborepo", packages: pkgDirs.slice(0, 15) };
  }

  if (fileExists(cwd, "nx.json")) {
    return { type: "Nx", packages: [] };
  }

  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(cwd, "package.json"), "utf-8"));
    if (Array.isArray(pkg.workspaces)) {
      return { type: "npm/yarn workspaces", packages: pkg.workspaces.slice(0, 15) };
    }
    if (pkg.workspaces?.packages) {
      return { type: "npm/yarn workspaces", packages: pkg.workspaces.packages.slice(0, 15) };
    }
  } catch {
    // ignore
  }

  return null;
}
