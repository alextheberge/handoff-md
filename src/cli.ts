#!/usr/bin/env node

import * as fs from "fs";
import * as path from "path";
import { Command } from "commander";
import { runCheck } from "./check";
import { runDiff, saveHandoffCache } from "./diff";
import { installHook, runHandoff, writeHandoff } from "./handoff";
import { runInit } from "./init";
import { copyToClipboard } from "./utils/clipboard";
import { VERSION } from "./version";
import { runWatch } from "./watch";

const program = new Command();

program
  .name("handoff-md")
  .description(
    "Cross-model project continuity engine. Analyze your repo, generate HANDOFF.md for any AI model.",
  )
  .version(VERSION);

async function handleGenerate(
  repoPath: string,
  options: {
    copy?: boolean;
    stdout?: boolean;
    verbose?: boolean;
    format?: string;
    profile?: string;
    output?: string;
    dryRun?: boolean;
    json?: boolean;
    noGit?: boolean;
    noTodos?: boolean;
    noNow?: boolean;
    noCache?: boolean;
    noGithub?: boolean;
    frozenTime?: string;
    failOnWarnings?: boolean;
    installHook?: boolean;
  },
): Promise<void> {
  const cwd = path.resolve(repoPath);

  if (options.installHook) {
    installHook(cwd);
    return;
  }

  const result = runHandoff({
    cwd,
    format: options.format,
    profile: options.profile,
    verbose: options.verbose,
    output: options.output,
    noGit: options.noGit,
    noTodos: options.noTodos,
    noNow: options.noNow,
    noCache: options.noCache,
    noGithub: options.noGithub,
    frozenTime: options.frozenTime,
  });

  let exitCode = result.exitCode;
  if (options.failOnWarnings && result.warnings.length > 0) {
    exitCode = 1;
  }

  if (options.json) {
    console.log(
      JSON.stringify(
        {
          markdown: result.markdown,
          tokenEstimate: result.tokenEstimate,
          warnings: result.warnings,
          meta: result.meta,
        },
        null,
        2,
      ),
    );
    if (exitCode !== 0) process.exit(exitCode);
    return;
  }

  if (options.dryRun) {
    console.log(
      `Dry run: would write ~${result.tokenEstimate} tokens to ${result.meta.outputPath}`,
    );
    if (exitCode !== 0) process.exit(exitCode);
    return;
  }

  if (options.stdout) {
    console.log(result.markdown);
    if (exitCode !== 0) process.exit(exitCode);
    return;
  }

  if (options.copy) {
    const success = await copyToClipboard(result.markdown);
    if (success) {
      console.log(`✅ HANDOFF copied to clipboard (~${result.tokenEstimate} tokens)`);
    } else {
      console.error("❌ Failed to copy to clipboard. Printing to stdout instead:");
      console.log(result.markdown);
    }
    if (exitCode !== 0) process.exit(exitCode);
    return;
  }

  writeHandoff(result.meta.outputPath, result.markdown);
  saveHandoffCache(cwd, result.meta.outputPath, result.tokenEstimate);
  console.log(
    `✅ ${path.basename(result.meta.outputPath)} generated (~${result.tokenEstimate} tokens)`,
  );
  console.log(`   ${result.meta.outputPath}`);
  if (exitCode !== 0) process.exit(exitCode);
}

const genOptions = (cmd: Command) =>
  cmd
    .argument("[path]", "Path to the repository", ".")
    .option("-c, --copy", "Copy output to clipboard")
    .option("-s, --stdout", "Print output to stdout instead of writing file")
    .option("-v, --verbose", "Show detailed analysis info")
    .option("-f, --format <level>", "Output format: compact, standard, full", "standard")
    .option("-p, --profile <name>", "Profile: default, cursor, ci, pr")
    .option("-o, --output <path>", "Output file path")
    .option("--dry-run", "Show what would be written without writing")
    .option("--json", "Output machine-readable JSON")
    .option("--no-git", "Skip git analysis")
    .option("--no-todos", "Skip TODO scanning")
    .option("--no-now", "Skip Right now briefing section")
    .option("--no-cache", "Disable analyzer cache")
    .option("--no-github", "Skip GitHub CLI integration")
    .option("--frozen-time <iso>", "Fixed timestamp for reproducible output")
    .option("--fail-on-warnings", "Exit with code 1 if analyzers emit warnings")
    .option("--install-hook", "Install as git post-commit hook");

genOptions(program.command("generate").description("Generate HANDOFF.md")).action(
  async (repoPath, options) => {
    await handleGenerate(repoPath, options);
  },
);

genOptions(program).action(async (repoPath, options) => {
  await handleGenerate(repoPath, options);
});

program
  .command("watch")
  .description("Regenerate HANDOFF on file changes")
  .argument("[path]", "Path to the repository", ".")
  .option("-f, --format <level>", "Output format", "standard")
  .option("-p, --profile <name>", "Profile preset")
  .option("-o, --output <path>", "Output file path")
  .option("-v, --verbose", "Verbose")
  .option("--no-cache", "Disable cache")
  .action(
    (
      repoPath: string,
      options: {
        format?: string;
        profile?: string;
        output?: string;
        verbose?: boolean;
        noCache?: boolean;
      },
    ) => {
      runWatch({
        cwd: path.resolve(repoPath),
        format: options.format,
        profile: options.profile,
        output: options.output,
        verbose: options.verbose,
        noCache: options.noCache,
      });
    },
  );

program
  .command("diff")
  .description("Show changes since last HANDOFF generation")
  .argument("[path]", "Path to the repository", ".")
  .option("-o, --output <path>", "HANDOFF file name", "HANDOFF.md")
  .action((repoPath: string, options: { output?: string }) => {
    const cwd = path.resolve(repoPath);
    const outputPath = path.join(cwd, options.output || "HANDOFF.md");
    runDiff(cwd, outputPath);
  });

program
  .command("validate")
  .description("Validate HANDOFF.md has required sections")
  .argument("[path]", "Path to HANDOFF.md or repository", ".")
  .action((targetPath: string) => {
    const resolved = path.resolve(targetPath);
    const handoffPath =
      fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()
        ? path.join(resolved, "HANDOFF.md")
        : resolved;

    const result = runCheck({ cwd: path.dirname(handoffPath), handoffPath });
    if (!result.ok) process.exit(1);
  });

program
  .command("check")
  .description("CI quality gate for HANDOFF.md")
  .argument("[path]", "Repository path", ".")
  .option("-f, --format <level>", "Expected format level")
  .option("--max-age <days>", "Max file age in days", (v) => Number.parseInt(v, 10))
  .option("--no-token-limit", "Skip token budget check")
  .option("--fail-on-warnings", "Fail if last generate had warnings")
  .option("--json", "JSON output")
  .action((repoPath: string, options) => {
    const cwd = path.resolve(repoPath);
    const result = runCheck({
      cwd,
      format: options.format,
      maxAgeDays: options.maxAge,
      noTokenLimit: options.noTokenLimit,
      failOnWarnings: options.failOnWarnings,
      json: options.json,
    });
    if (!result.ok) process.exit(result.exitCode);
  });

program
  .command("init")
  .description("Set up HANDOFF.md and AGENTS.md for your project")
  .argument("[path]", "Repository path", ".")
  .option("--dry-run", "Show planned changes")
  .option("--hook", "Install post-commit hook")
  .option("--no-agents", "Skip AGENTS.md update")
  .option("-y, --yes", "Add .handoff/ to .gitignore")
  .action((repoPath: string, options) => {
    runInit({
      cwd: path.resolve(repoPath),
      dryRun: options.dryRun,
      hook: options.hook,
      noAgents: options.noAgents,
      yes: options.yes,
    });
  });

export function runCli(argv: string[] = process.argv): void {
  program.parse(argv);
}
