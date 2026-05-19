import * as fs from "fs";
import * as path from "path";

function readPackageVersion(): string {
  const candidates = [
    path.join(__dirname, "..", "package.json"),
    path.join(__dirname, "..", "..", "package.json"),
  ];
  for (const pkgPath of candidates) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
      if (pkg.version) return pkg.version;
    } catch {
      // try next candidate
    }
  }
  return "0.0.0";
}

export const VERSION = readPackageVersion();
