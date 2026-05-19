import * as fs from "fs";
import * as path from "path";
import type { FormatLevel } from "./assembler";
import { loadHandoffConfig, resolveFormat } from "./config-file";
import { FORMAT_TOTAL_TOKEN_CAP, HANDOFF_SPEC_VERSION } from "./spec";
import { countTokens } from "./utils/tokens";

export interface CheckOptions {
  cwd: string;
  handoffPath?: string;
  format?: string;
  maxAgeDays?: number;
  noTokenLimit?: boolean;
  failOnWarnings?: boolean;
  warnings?: string[];
  json?: boolean;
}

export interface CheckResult {
  ok: boolean;
  checks: { name: string; passed: boolean; message: string }[];
  exitCode: number;
}

function parseSpecVersion(content: string): number | null {
  const m = content.match(/handoff-spec:\s*(\d+)/);
  return m ? Number.parseInt(m[1], 10) : null;
}

export function runCheck(options: CheckOptions): CheckResult {
  const cwd = path.resolve(options.cwd);
  const handoffPath = options.handoffPath
    ? path.isAbsolute(options.handoffPath)
      ? options.handoffPath
      : path.join(cwd, options.handoffPath)
    : path.join(cwd, "HANDOFF.md");

  const checks: CheckResult["checks"] = [];

  if (!fs.existsSync(handoffPath)) {
    checks.push({ name: "exists", passed: false, message: `${handoffPath} not found` });
    return finish(checks, options.json);
  }

  const content = fs.readFileSync(handoffPath, "utf-8");
  checks.push({ name: "exists", passed: true, message: "HANDOFF.md exists" });

  const required = ["# HANDOFF", "## Stack", "## Right now"];
  for (const s of required) {
    const ok = content.includes(s);
    checks.push({
      name: `section:${s}`,
      passed: ok,
      message: ok ? `Has ${s}` : `Missing ${s}`,
    });
  }

  const spec = parseSpecVersion(content);
  const specOk = spec === HANDOFF_SPEC_VERSION;
  checks.push({
    name: "spec-version",
    passed: specOk,
    message: specOk
      ? `Spec version ${spec}`
      : `Expected handoff-spec ${HANDOFF_SPEC_VERSION}, got ${spec}`,
  });

  if (!options.noTokenLimit) {
    const { config } = loadHandoffConfig(cwd);
    const format = resolveFormat(options.format, config.format) as FormatLevel;
    const cap = FORMAT_TOTAL_TOKEN_CAP[format];
    const tokens = countTokens(content);
    checks.push({
      name: "token-limit",
      passed: tokens <= cap,
      message: `~${tokens} tokens (max ${cap} for ${format})`,
    });
  }

  if (options.maxAgeDays && options.maxAgeDays > 0) {
    const stat = fs.statSync(handoffPath);
    const ageMs = Date.now() - stat.mtimeMs;
    const maxMs = options.maxAgeDays * 24 * 60 * 60 * 1000;
    checks.push({
      name: "max-age",
      passed: ageMs <= maxMs,
      message: `Age ${Math.floor(ageMs / 86400000)}d (max ${options.maxAgeDays}d)`,
    });
  }

  if (options.failOnWarnings && options.warnings && options.warnings.length > 0) {
    checks.push({
      name: "warnings",
      passed: false,
      message: `${options.warnings.length} analyzer warning(s)`,
    });
  }

  return finish(checks, options.json);
}

function finish(checks: CheckResult["checks"], json?: boolean): CheckResult {
  const ok = checks.every((c) => c.passed);
  const result: CheckResult = { ok, checks, exitCode: ok ? 0 : 1 };

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    for (const c of checks) {
      console.log(`${c.passed ? "✓" : "✗"} ${c.name}: ${c.message}`);
    }
    if (!ok) console.error("\nCheck failed.");
  }

  return result;
}
