import * as fs from "fs";
import * as path from "path";
import { analyzeCi } from "./analyzers/ci";
import { readConfigs } from "./analyzers/config";
import { analyzeGit } from "./analyzers/git";
import { analyzeScripts } from "./analyzers/scripts";
import { analyzeStack } from "./analyzers/stack";
import { analyzeStructure } from "./analyzers/structure";
import { analyzeWorkspace } from "./analyzers/workspace";
import type { AssembledContext, FormatLevel, SectionToggles } from "./assembler";
import { loadHandoffConfig, mergeSections, resolveFormat } from "./config-file";
import { renderHandoff } from "./renderer";
import { HANDOFF_SPEC_VERSION } from "./spec";
import { countTokens } from "./utils/tokens";

export interface RunHandoffOptions {
  cwd: string;
  format?: string;
  verbose?: boolean;
  output?: string;
  noGit?: boolean;
  noTodos?: boolean;
}

export interface HandoffMeta {
  projectName: string;
  outputPath: string;
  format: FormatLevel;
  tokenEstimate: number;
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

  if (!fs.existsSync(cwd)) {
    throw new Error(`Path "${cwd}" does not exist.`);
  }
  if (!fs.statSync(cwd).isDirectory()) {
    throw new Error(`Path "${cwd}" is not a directory.`);
  }

  const fileConfig = loadHandoffConfig(cwd);
  const format = resolveFormat(options.format, fileConfig.format);
  const outputFileName = options.output || fileConfig.output || "HANDOFF.md";
  const outputPath = path.isAbsolute(outputFileName)
    ? outputFileName
    : path.join(cwd, outputFileName);

  let sections: SectionToggles = mergeSections(fileConfig.sections);
  if (options.noGit) sections = { ...sections, git: false };
  if (options.noTodos) sections = { ...sections, todos: false };

  if (options.verbose) {
    console.log(`🔍 Analyzing ${cwd}...`);
  }

  let git = null;
  if (sections.git) {
    if (options.verbose) console.log("  → Git analysis...");
    const gitResult = analyzeGit(cwd);
    git = gitResult.data;
    warnings.push(...gitResult.warnings);
  }

  if (options.verbose) console.log("  → Stack detection...");
  const stack = analyzeStack(cwd);

  if (options.verbose) console.log("  → Structure analysis...");
  const structure = analyzeStructure(cwd, {
    extraIgnoreDirs: fileConfig.ignoreDirs,
    scanTodos: sections.todos,
  });

  if (options.verbose) console.log("  → Config reading...");
  const config = sections.conventions ? readConfigs(cwd, fileConfig.configFiles) : null;

  const workspace = sections.workspace ? analyzeWorkspace(cwd) : null;
  const ci = sections.ci ? analyzeCi(cwd) : null;
  const scripts = sections.scripts ? analyzeScripts(cwd) : null;

  const projectName = detectProjectName(cwd);

  const ctx: AssembledContext = {
    projectName,
    timestamp: new Date().toISOString().replace("T", " ").split(".")[0],
    git,
    stack,
    structure,
    config,
    workspace,
    ci,
    scripts,
    format,
    warnings,
    sections,
    specVersion: HANDOFF_SPEC_VERSION,
  };

  const markdown = renderHandoff(ctx);
  const tokenEstimate = countTokens(markdown);

  if (options.verbose) {
    console.log("\n📊 Analysis complete:");
    console.log(`  Stack: ${stack.framework} + ${stack.language}`);
    console.log(`  Format: ${format}`);
    console.log(`  Token count: ~${tokenEstimate}`);
    if (git) {
      console.log(`  Branch: ${git.currentBranch}`);
      console.log(`  Recent commits: ${git.recentCommits.length}`);
    }
    if (warnings.length > 0) {
      console.log(`  Warnings: ${warnings.length}`);
    }
    console.log("");
  }

  return {
    markdown,
    tokenEstimate,
    warnings,
    meta: { projectName, outputPath, format, tokenEstimate },
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
