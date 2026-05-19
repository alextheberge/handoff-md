import * as fs from "fs";
import * as path from "path";
import { saveHandoffCache } from "./diff";
import { runHandoff, writeHandoff } from "./handoff";

const DEBOUNCE_MS = 500;

const WATCH_IGNORE = ["node_modules", ".git", ".handoff", "dist", "HANDOFF.md"];

export interface WatchOptions {
  cwd: string;
  format?: string;
  profile?: string;
  output?: string;
  verbose?: boolean;
  noCache?: boolean;
}

export function runWatch(options: WatchOptions): void {
  const cwd = path.resolve(options.cwd);
  let timer: ReturnType<typeof setTimeout> | null = null;

  const regenerate = () => {
    try {
      const result = runHandoff({
        cwd,
        format: options.format,
        profile: options.profile,
        output: options.output,
        verbose: options.verbose,
        noCache: options.noCache,
      });
      writeHandoff(result.meta.outputPath, result.markdown);
      saveHandoffCache(cwd, result.meta.outputPath, result.tokenEstimate);
      const hits = result.meta.cacheHits?.length
        ? ` [cached: ${result.meta.cacheHits.join(", ")}]`
        : "";
      console.log(
        `[handoff] Updated ${result.meta.outputPath} (~${result.tokenEstimate} tokens)${hits}`,
      );
    } catch (err) {
      console.error(`[handoff] Error: ${(err as Error).message}`);
    }
  };

  console.log(`[handoff] Watching ${cwd} (Ctrl+C to stop)`);
  regenerate();

  fs.watch(cwd, { recursive: true }, (_event, filename) => {
    if (!filename) return;
    if (WATCH_IGNORE.some((ig) => filename.includes(ig))) return;

    if (timer) clearTimeout(timer);
    timer = setTimeout(regenerate, DEBOUNCE_MS);
  });
}
