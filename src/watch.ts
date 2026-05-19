import * as fs from "fs";
import * as path from "path";
import { runHandoff, writeHandoff } from "./handoff";

const DEBOUNCE_MS = 500;

export interface WatchOptions {
  cwd: string;
  format?: string;
  output?: string;
}

export function runWatch(options: WatchOptions): void {
  const cwd = path.resolve(options.cwd);
  let timer: ReturnType<typeof setTimeout> | null = null;

  const regenerate = () => {
    try {
      const result = runHandoff({
        cwd,
        format: options.format,
        output: options.output,
      });
      writeHandoff(result.meta.outputPath, result.markdown);
      console.log(`[handoff] Updated ${result.meta.outputPath} (~${result.tokenEstimate} tokens)`);
    } catch (err) {
      console.error(`[handoff] Error: ${(err as Error).message}`);
    }
  };

  console.log(`[handoff] Watching ${cwd} (Ctrl+C to stop)`);
  regenerate();

  fs.watch(cwd, { recursive: true }, (_event, filename) => {
    if (!filename) return;
    if (filename.includes("node_modules") || filename.includes(".git")) return;
    if (filename === "HANDOFF.md" || filename.endsWith("HANDOFF.md")) return;

    if (timer) clearTimeout(timer);
    timer = setTimeout(regenerate, DEBOUNCE_MS);
  });
}
