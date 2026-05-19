import { execSync } from "child_process";

export interface ExecSuccess {
  ok: true;
  stdout: string;
}

export interface ExecFailure {
  ok: false;
  error: string;
  code?: number | string;
}

export type ExecResult = ExecSuccess | ExecFailure;

export function exec(command: string, cwd?: string): ExecResult {
  try {
    const stdout = execSync(command, {
      cwd: cwd || process.cwd(),
      encoding: "utf-8",
      timeout: 15000,
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
    return { ok: true, stdout };
  } catch (err: unknown) {
    const e = err as { message?: string; status?: number; code?: string };
    return {
      ok: false,
      error: e.message || String(err),
      code: e.status ?? e.code,
    };
  }
}

export interface ExecWithWarning {
  stdout: string;
  warning?: string;
}

/** Run a command; on failure return empty stdout and an optional warning (never conflate failure with empty success). */
export function execWithWarning(command: string, cwd?: string): ExecWithWarning {
  const result = exec(command, cwd);
  if (result.ok) {
    return { stdout: result.stdout };
  }
  return {
    stdout: "",
    warning: `Command failed: ${command} (${result.error})`,
  };
}

export function isGitRepo(cwd?: string): boolean {
  const result = exec("git rev-parse --is-inside-work-tree", cwd);
  return result.ok && result.stdout === "true";
}
