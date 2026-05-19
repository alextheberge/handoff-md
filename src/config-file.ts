import * as fs from "fs";
import * as path from "path";
import { DEFAULT_SECTIONS, type FormatLevel, type SectionToggles } from "./assembler";

export interface HandoffConfig {
  format?: FormatLevel;
  output?: string;
  ignoreDirs?: string[];
  ignoreFiles?: string[];
  configFiles?: string[];
  sections?: Partial<SectionToggles>;
  tokenBudget?: Partial<Record<string, number>>;
}

const CONFIG_NAMES = ["handoff.config.json", ".handoffrc.json", ".handoffrc"];

export function loadHandoffConfig(cwd: string): HandoffConfig {
  for (const name of CONFIG_NAMES) {
    const fullPath = path.join(cwd, name);
    if (!fs.existsSync(fullPath)) continue;
    try {
      const raw = fs.readFileSync(fullPath, "utf-8");
      return JSON.parse(raw) as HandoffConfig;
    } catch {
      // try next
    }
  }
  return {};
}

export function mergeSections(config?: Partial<SectionToggles>): SectionToggles {
  return { ...DEFAULT_SECTIONS, ...config };
}

export function resolveFormat(
  cliFormat: string | undefined,
  configFormat?: FormatLevel,
): FormatLevel {
  const candidate = cliFormat || configFormat || "standard";
  if (["compact", "standard", "full"].includes(candidate)) {
    return candidate as FormatLevel;
  }
  return "standard";
}
