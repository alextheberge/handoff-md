import type { CiData } from "./analyzers/ci";
import type { ConfigData } from "./analyzers/config";
import type { GitData } from "./analyzers/git";
import type { GitHubData } from "./analyzers/github";
import type { ScriptsData } from "./analyzers/scripts";
import type { StackInfo } from "./analyzers/stack";
import type { StructureData } from "./analyzers/structure";
import type { WorkspaceData } from "./analyzers/workspace";

export type FormatLevel = "compact" | "standard" | "full";

export type SectionId =
  | "header"
  | "now"
  | "notes"
  | "stack"
  | "scripts"
  | "workspace"
  | "ci"
  | "pr"
  | "structure"
  | "conventions"
  | "activity"
  | "state"
  | "issues"
  | "env"
  | "warnings";

export interface SectionToggles {
  git: boolean;
  todos: boolean;
  env: boolean;
  stack: boolean;
  structure: boolean;
  conventions: boolean;
  workspace: boolean;
  ci: boolean;
  scripts: boolean;
  now: boolean;
  notes: boolean;
  github: boolean;
}

export const DEFAULT_SECTIONS: SectionToggles = {
  git: true,
  todos: true,
  env: true,
  stack: true,
  structure: true,
  conventions: true,
  workspace: true,
  ci: true,
  scripts: true,
  now: true,
  notes: true,
  github: false,
};

/** Drop order: last items dropped first under budget pressure */
export const SECTION_DROP_ORDER: Record<FormatLevel, SectionId[]> = {
  compact: [
    "header",
    "now",
    "notes",
    "stack",
    "state",
    "warnings",
    "issues",
    "activity",
    "scripts",
    "conventions",
    "env",
    "workspace",
    "ci",
    "pr",
    "structure",
  ],
  standard: [
    "header",
    "now",
    "notes",
    "stack",
    "state",
    "warnings",
    "issues",
    "activity",
    "scripts",
    "conventions",
    "env",
    "workspace",
    "ci",
    "pr",
    "structure",
  ],
  full: [
    "header",
    "now",
    "notes",
    "stack",
    "state",
    "warnings",
    "issues",
    "activity",
    "pr",
    "scripts",
    "conventions",
    "env",
    "workspace",
    "ci",
    "structure",
  ],
};

export interface AssembledContext {
  projectName: string;
  timestamp: string;
  git: GitData | null;
  stack: StackInfo;
  structure: StructureData;
  config: ConfigData | null;
  workspace: WorkspaceData | null;
  ci: CiData | null;
  scripts: ScriptsData | null;
  github: GitHubData | null;
  overlay: string | null;
  format: FormatLevel;
  warnings: string[];
  sections: SectionToggles;
  specVersion: number;
  /** 0 = full, 1 = shrunk lists, 2 = minimal */
  shrinkLevel: number;
  tokenBudgetOverrides?: Partial<Record<string, number>>;
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

const BUDGETS: Record<FormatLevel, Record<string, number>> = {
  compact: {
    header: 150,
    now: 120,
    notes: 100,
    stack: 150,
    structure: 200,
    conventions: 150,
    activity: 400,
    state: 300,
    issues: 100,
    env: 100,
    config: 100,
    workspace: 100,
    ci: 100,
    scripts: 100,
    pr: 100,
    warnings: 80,
  },
  standard: {
    header: 200,
    now: 200,
    notes: 150,
    stack: 200,
    structure: 400,
    conventions: 300,
    activity: 800,
    state: 500,
    issues: 300,
    env: 200,
    config: 300,
    workspace: 200,
    ci: 200,
    scripts: 150,
    pr: 200,
    warnings: 120,
  },
  full: {
    header: 250,
    now: 300,
    notes: 250,
    stack: 250,
    structure: 600,
    conventions: 400,
    activity: 1200,
    state: 700,
    issues: 500,
    env: 300,
    config: 500,
    workspace: 300,
    ci: 300,
    scripts: 250,
    pr: 300,
    warnings: 150,
  },
};

export function truncateToTokenBudget(text: string, budget: number): string {
  const estimated = estimateTokens(text);
  if (estimated <= budget) return text;

  const maxChars = budget * 4;
  const truncated = text.slice(0, maxChars);
  const lastNewline = truncated.lastIndexOf("\n");
  return `${lastNewline > 0 ? truncated.slice(0, lastNewline) : truncated}\n...truncated`;
}

export function getBudget(
  format: FormatLevel,
  overrides?: Partial<Record<string, number>>,
): Record<string, number> {
  const base = { ...BUDGETS[format] };
  if (overrides) {
    for (const [key, value] of Object.entries(overrides)) {
      if (value !== undefined) base[key] = value;
    }
  }
  return base;
}
