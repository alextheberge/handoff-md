import * as fs from "fs";
import * as path from "path";

const DEFAULT_OVERLAY = ".handoff.overlay.md";
const MAX_LINES = 30;

export function readOverlay(cwd: string, overlayPath?: string): string | null {
  const file = overlayPath || DEFAULT_OVERLAY;
  const fullPath = path.isAbsolute(file) ? file : path.join(cwd, file);
  if (!fs.existsSync(fullPath)) return null;

  try {
    const raw = fs.readFileSync(fullPath, "utf-8").trim();
    if (!raw) return null;

    const lines = raw
      .split("\n")
      .filter((l) => !l.trim().startsWith("<!--"))
      .slice(0, MAX_LINES);

    return lines.join("\n").trim() || null;
  } catch {
    return null;
  }
}
