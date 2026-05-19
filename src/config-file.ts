import * as fs from "fs";
import * as path from "path";
import { DEFAULT_SECTIONS, type FormatLevel, type SectionToggles } from "./assembler";
import type { ProfileName } from "./profiles";

export interface HandoffConfig {
  format?: FormatLevel;
  profile?: ProfileName | string;
  output?: string;
  overlay?: string;
  ignoreDirs?: string[];
  ignoreFiles?: string[];
  configFiles?: string[];
  sections?: Partial<SectionToggles>;
  tokenBudget?: Partial<Record<string, number>>;
  github?: boolean;
}

const CONFIG_NAMES = ["handoff.config.json", ".handoffrc.json", ".handoffrc"];

const KNOWN_KEYS = new Set([
  "format",
  "profile",
  "output",
  "overlay",
  "ignoreDirs",
  "ignoreFiles",
  "configFiles",
  "sections",
  "tokenBudget",
  "github",
]);

export function loadHandoffConfig(
  cwd: string,
  strict = false,
): { config: HandoffConfig; warnings: string[] } {
  const warnings: string[] = [];
  for (const name of CONFIG_NAMES) {
    const fullPath = path.join(cwd, name);
    if (!fs.existsSync(fullPath)) continue;
    try {
      const raw = JSON.parse(fs.readFileSync(fullPath, "utf-8")) as Record<string, unknown>;
      if (strict) {
        for (const key of Object.keys(raw)) {
          if (!KNOWN_KEYS.has(key)) {
            warnings.push(`Unknown config key: ${key}`);
          }
        }
      }
      return { config: raw as HandoffConfig, warnings };
    } catch {
      warnings.push(`Failed to parse ${name}`);
    }
  }
  return { config: {}, warnings };
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
