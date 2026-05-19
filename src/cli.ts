#!/usr/bin/env node

import * as fs from "fs";
import * as path from "path";
import { Command } from "commander";
import { runDiff, saveHandoffCache } from "./diff";
import { installHook, runHandoff, writeHandoff } from "./handoff";
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
    output?: string;
    dryRun?: boolean;
    json?: boolean;
    noGit?: boolean;
    noTodos?: boolean;
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
    verbose: options.verbose,
    output: options.output,
    noGit: options.noGit,
    noTodos: options.noTodos,
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

const sharedOptions = (cmd: Command) =>
  cmd
    .argument("[path]", "Path to the repository", ".")
    .option("-c, --copy", "Copy output to clipboard")
    .option("-s, --stdout", "Print output to stdout instead of writing file")
    .option("-v, --verbose", "Show detailed analysis info")
    .option("-f, --format <level>", "Output format: compact, standard, full", "standard")
    .option("-o, --output <path>", "Output file path")
    .option("--dry-run", "Show what would be written without writing")
    .option("--json", "Output machine-readable JSON")
    .option("--no-git", "Skip git analysis")
    .option("--no-todos", "Skip TODO scanning")
    .option("--fail-on-warnings", "Exit with code 1 if analyzers emit warnings")
    .option("--install-hook", "Install as git post-commit hook");

sharedOptions(program.command("generate").description("Generate HANDOFF.md")).action(
  async (repoPath, options) => {
    await handleGenerate(repoPath, options);
  },
);

sharedOptions(program).action(async (repoPath, options) => {
  await handleGenerate(repoPath, options);
});

program
  .command("watch")
  .description("Regenerate HANDOFF on file changes")
  .argument("[path]", "Path to the repository", ".")
  .option("-f, --format <level>", "Output format", "standard")
  .option("-o, --output <path>", "Output file path")
  .action((repoPath: string, options: { format?: string; output?: string }) => {
    runWatch({
      cwd: path.resolve(repoPath),
      format: options.format,
      output: options.output,
    });
  });

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

    if (!fs.existsSync(handoffPath)) {
      console.error(`Error: ${handoffPath} not found`);
      process.exit(1);
    }

    const content = fs.readFileSync(handoffPath, "utf-8");
    const required = ["# HANDOFF", "## Stack"];
    const missing = required.filter((s) => !content.includes(s));
    if (missing.length > 0) {
      console.error(`Validation failed. Missing: ${missing.join(", ")}`);
      process.exit(1);
    }
    console.log("✅ HANDOFF.md is valid");
  });

export function runCli(argv: string[] = process.argv): void {
  program.parse(argv);
}
