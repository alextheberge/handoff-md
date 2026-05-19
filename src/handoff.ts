import * as fs from "fs";
import * as path from "path";
import { analyzeCi } from "./analyzers/ci";
import { readConfigs } from "./analyzers/config";
import { analyzeGit } from "./analyzers/git";
import { analyzeGitHub } from "./analyzers/github";
import { analyzeScripts } from "./analyzers/scripts";
import { analyzeStack } from "./analyzers/stack";
import { analyzeStructure } from "./analyzers/structure";
import { analyzeWorkspace } from "./analyzers/workspace";
import type { AssembledContext, FormatLevel, SectionToggles } from "./assembler";
import {
  type HandoffCache,
  fingerprintCi,
  fingerprintConfig,
  fingerprintGit,
  fingerprintScripts,
  fingerprintStack,
  fingerprintStructure,
  fingerprintWorkspace,
  loadCache,
  mergeWithCache,
  saveCache,
} from "./cache";
import { loadHandoffConfig, mergeSections, resolveFormat } from "./config-file";
import { readOverlay } from "./overlay";
import { mergeProfileSections, resolveProfile } from "./profiles";
import { renderHandoff } from "./renderer";
import { HANDOFF_SPEC_VERSION } from "./spec";
import { resolveTimestamp } from "./time";
import { execWithWarning } from "./utils/exec";
import { countTokens } from "./utils/tokens";

export interface RunHandoffOptions {
  cwd: string;
  format?: string;
  profile?: string;
  verbose?: boolean;
  output?: string;
  noGit?: boolean;
  noTodos?: boolean;
  noNow?: boolean;
  noCache?: boolean;
  noGithub?: boolean;
  frozenTime?: string;
}

export interface HandoffMeta {
  projectName: string;
  outputPath: string;
  format: FormatLevel;
  tokenEstimate: number;
  cacheHits?: string[];
}

export interface HandoffResult {
  markdown: string;
  tokenEstimate: number;
  warnings: string[];
  meta: HandoffMeta;
  exitCode: number;
}

function detectProjectName(cwd: string): string {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(cwd, "package.json"), "utf-8"));
    if (pkg.name && pkg.name !== "unnamed") return pkg.name;
  } catch {
    // ignore
  }
  try {
    const cargo = fs.readFileSync(path.join(cwd, "Cargo.toml"), "utf-8");
    const match = cargo.match(/name\s*=\s*"([^"]+)"/);
    if (match) return match[1];
  } catch {
    // ignore
  }
  try {
    const pyproject = fs.readFileSync(path.join(cwd, "pyproject.toml"), "utf-8");
    const match = pyproject.match(/name\s*=\s*"([^"]+)"/);
    if (match) return match[1];
  } catch {
    // ignore
  }
  return path.basename(cwd);
}

export function runHandoff(options: RunHandoffOptions): HandoffResult {
  const cwd = path.resolve(options.cwd);
  const warnings: string[] = [];
  const cacheHits: string[] = [];

  if (!fs.existsSync(cwd)) {
    throw new Error(`Path "${cwd}" does not exist.`);
  }
  if (!fs.statSync(cwd).isDirectory()) {
    throw new Error(`Path "${cwd}" is not a directory.`);
  }

  const { config: fileConfig } = loadHandoffConfig(cwd);
  const profileSettings = resolveProfile(options.profile ?? fileConfig.profile);
  const format = resolveFormat(options.format ?? profileSettings.format, fileConfig.format);
  const outputFileName = options.output || fileConfig.output || "HANDOFF.md";
  const outputPath = path.isAbsolute(outputFileName)
    ? outputFileName
    : path.join(cwd, outputFileName);

  let sections: SectionToggles = mergeSections(fileConfig.sections);
  sections = mergeProfileSections(sections, options.profile ?? fileConfig.profile);
  if (options.noGit) sections = { ...sections, git: false };
  if (options.noTodos) sections = { ...sections, todos: false };
  if (options.noNow) sections = { ...sections, now: false };
  if (options.noGithub) sections = { ...sections, github: false };
  if (fileConfig.github === true) sections = { ...sections, github: true };

  const useCache = !options.noCache;
  const cache: HandoffCache | null = useCache ? loadCache(cwd) : null;
  const nextCache: HandoffCache = {
    version: 1,
    fingerprints: {},
    payload: {},
  };

  if (options.verbose) {
    console.log(`🔍 Analyzing ${cwd}...`);
  }

  let git = null;
  if (sections.git) {
    const fp = fingerprintGit(cwd);
    const { value, fromCache } = mergeWithCache("git", cwd, fp, cache, () => {
      if (options.verbose) console.log("  → Git analysis...");
      const r = analyzeGit(cwd);
      warnings.push(...r.warnings);
      return r.data;
    });
    git = value;
    nextCache.fingerprints.git = fp;
    nextCache.payload.git = git;
    if (fromCache) {
      if (options.verbose) console.log("  → Git (cached)");
      cacheHits.push("git");
    }
  }

  let stack: ReturnType<typeof analyzeStack>;
  {
    const fp = fingerprintStack(cwd);
    const { value, fromCache } = mergeWithCache("stack", cwd, fp, cache, () => {
      if (options.verbose) console.log("  → Stack detection...");
      return analyzeStack(cwd);
    });
    stack = value;
    nextCache.fingerprints.stack = fp;
    nextCache.payload.stack = stack;
    if (fromCache) {
      if (options.verbose) console.log("  → Stack (cached)");
      cacheHits.push("stack");
    }
  }

  let structure = analyzeStructure(cwd, {
    extraIgnoreDirs: fileConfig.ignoreDirs,
    scanTodos: sections.todos,
  });
  {
    const fp = fingerprintStructure(cwd);
    const { value, fromCache } = mergeWithCache("structure", cwd, fp, cache, () => {
      if (options.verbose) console.log("  → Structure analysis...");
      return analyzeStructure(cwd, {
        extraIgnoreDirs: fileConfig.ignoreDirs,
        scanTodos: sections.todos,
      });
    });
    structure = value;
    nextCache.fingerprints.structure = fp;
    nextCache.payload.structure = structure;
    if (fromCache) {
      if (options.verbose) console.log("  → Structure (cached)");
      cacheHits.push("structure");
    }
  }

  let config = null;
  if (sections.conventions) {
    const fp = fingerprintConfig(cwd);
    const { value, fromCache } = mergeWithCache("config", cwd, fp, cache, () => {
      if (options.verbose) console.log("  → Config reading...");
      return readConfigs(cwd, fileConfig.configFiles);
    });
    config = value;
    nextCache.fingerprints.config = fp;
    nextCache.payload.config = config;
    if (fromCache) {
      if (options.verbose) console.log("  → Config (cached)");
      cacheHits.push("config");
    }
  }

  let workspace = null;
  if (sections.workspace) {
    const fp = fingerprintWorkspace(cwd);
    const { value, fromCache } = mergeWithCache("workspace", cwd, fp, cache, () =>
      analyzeWorkspace(cwd),
    );
    workspace = value;
    nextCache.fingerprints.workspace = fp;
    nextCache.payload.workspace = workspace;
    if (fromCache) {
      if (options.verbose) console.log("  → Workspace (cached)");
      cacheHits.push("workspace");
    }
  }

  let ci = null;
  if (sections.ci) {
    const fp = fingerprintCi(cwd);
    const { value, fromCache } = mergeWithCache("ci", cwd, fp, cache, () => analyzeCi(cwd));
    ci = value;
    nextCache.fingerprints.ci = fp;
    nextCache.payload.ci = ci;
    if (fromCache) {
      if (options.verbose) console.log("  → CI (cached)");
      cacheHits.push("ci");
    }
  }

  let scripts = null;
  if (sections.scripts) {
    const fp = fingerprintScripts(cwd);
    const { value, fromCache } = mergeWithCache("scripts", cwd, fp, cache, () =>
      analyzeScripts(cwd),
    );
    scripts = value;
    nextCache.fingerprints.scripts = fp;
    nextCache.payload.scripts = scripts;
    if (fromCache) {
      if (options.verbose) console.log("  → Scripts (cached)");
      cacheHits.push("scripts");
    }
  }

  const github =
    sections.github && !options.noGithub ? analyzeGitHub(cwd, git?.currentBranch) : null;

  const overlay = sections.notes ? readOverlay(cwd, fileConfig.overlay) : null;

  const projectName = detectProjectName(cwd);
  const shrinkLevel = profileSettings.shrinkLevel ?? 0;

  const ctx: AssembledContext = {
    projectName,
    timestamp: resolveTimestamp(options.frozenTime),
    git,
    stack,
    structure,
    config,
    workspace,
    ci,
    scripts,
    github,
    overlay,
    format,
    warnings,
    sections,
    specVersion: HANDOFF_SPEC_VERSION,
    shrinkLevel,
  };

  const markdown = renderHandoff(ctx);
  const tokenEstimate = countTokens(markdown);

  const head = execWithWarning("git rev-parse HEAD 2>/dev/null", cwd).stdout;
  nextCache.lastRun = {
    timestamp: new Date().toISOString(),
    outputPath,
    tokenEstimate,
    head: head || undefined,
  };
  if (useCache) saveCache(cwd, nextCache);

  if (options.verbose) {
    console.log("\n📊 Analysis complete:");
    console.log(`  Stack: ${stack.framework} + ${stack.language}`);
    console.log(`  Format: ${format}`);
    console.log(`  Token count: ~${tokenEstimate}`);
    if (cacheHits.length > 0) {
      console.log(`  Cache hits: ${cacheHits.join(", ")}`);
    }
    console.log("");
  }

  return {
    markdown,
    tokenEstimate,
    warnings,
    meta: { projectName, outputPath, format, tokenEstimate, cacheHits },
    exitCode: 0,
  };
}

export function writeHandoff(outputPath: string, markdown: string): void {
  fs.writeFileSync(outputPath, markdown, "utf-8");
}

export function installHook(cwd: string): void {
  const hooksDir = path.join(cwd, ".git", "hooks");
  if (!fs.existsSync(hooksDir)) {
    throw new Error("Not a git repository or .git/hooks not found.");
  }

  const hookPath = path.join(hooksDir, "post-commit");
  const hookContent = "#!/bin/sh\nnpx handoff-md\n";

  if (fs.existsSync(hookPath)) {
    const existing = fs.readFileSync(hookPath, "utf-8");
    if (existing.includes("handoff-md") || existing.includes("npx handoff")) {
      console.log("ℹ️  Git hook already installed.");
      return;
    }
    fs.appendFileSync(hookPath, `\n${hookContent}`);
  } else {
    fs.writeFileSync(hookPath, hookContent, { mode: 0o755 });
  }

  console.log("✅ Git post-commit hook installed. HANDOFF will update on every commit.");
}
