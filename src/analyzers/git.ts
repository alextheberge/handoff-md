import { exec, execWithWarning, isGitRepo } from "../utils/exec";

const FIELD_SEP = "\x1f";

export interface Commit {
  hash: string;
  message: string;
  author: string;
  date: string;
  files?: string[];
}

export interface Branch {
  name: string;
  relativeDate: string;
  committerDate: string;
}

export interface GitData {
  currentBranch: string;
  recentCommits: Commit[];
  uncommittedChanges: string[];
  activeBranches: Branch[];
  lastMerge: Commit | null;
  conflictFiles: string[];
  aheadBehind?: string;
}

export interface GitAnalysisResult {
  data: GitData | null;
  warnings: string[];
}

function parseCommitLine(line: string): Commit | null {
  const parts = line.split(FIELD_SEP);
  if (parts.length < 4) return null;
  const [hash, message, author, date] = parts;
  return { hash, message, author, date: date?.split(" ")[0] || "" };
}

function isWithinDays(isoDate: string, days: number): boolean {
  const parsed = Date.parse(isoDate);
  if (Number.isNaN(parsed)) return false;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return parsed >= cutoff;
}

export function analyzeGit(cwd: string): GitAnalysisResult {
  const warnings: string[] = [];

  if (!isGitRepo(cwd)) {
    return { data: null, warnings };
  }

  const branchResult = execWithWarning("git branch --show-current", cwd);
  if (branchResult.warning) warnings.push(branchResult.warning);
  const currentBranch = branchResult.stdout || "HEAD (detached)";

  const logFormat = `%h${FIELD_SEP}%s${FIELD_SEP}%an${FIELD_SEP}%ai`;
  const logResult = execWithWarning(`git log --oneline -20 --format="${logFormat}"`, cwd);
  if (logResult.warning) warnings.push(logResult.warning);

  const recentCommits: Commit[] = logResult.stdout
    ? logResult.stdout
        .split("\n")
        .filter(Boolean)
        .map(parseCommitLine)
        .filter((c): c is Commit => c !== null)
    : [];

  const countResult = execWithWarning("git rev-list --count HEAD 2>/dev/null", cwd);
  if (countResult.warning) warnings.push(countResult.warning);
  const commitCount = Number.parseInt(countResult.stdout, 10) || 0;

  if (commitCount > 0 && recentCommits.length > 0) {
    const diffBase = commitCount >= 5 ? "HEAD~5" : commitCount > 1 ? "HEAD~1" : "HEAD";
    const diffResult = execWithWarning(`git diff --name-status ${diffBase} 2>/dev/null`, cwd);
    if (diffResult.warning && commitCount >= 2) {
      warnings.push(diffResult.warning);
    }
    if (diffResult.stdout) {
      const changedFiles = diffResult.stdout
        .split("\n")
        .filter(Boolean)
        .map((l) => {
          const parts = l.split("\t");
          return parts[parts.length - 1];
        });
      recentCommits[0].files = changedFiles.slice(0, 15);
    }
  }

  const statusResult = execWithWarning("git status --porcelain", cwd);
  if (statusResult.warning) warnings.push(statusResult.warning);
  const uncommittedChanges = statusResult.stdout
    ? statusResult.stdout
        .split("\n")
        .filter(Boolean)
        .map((l) => l.trim())
    : [];

  const branchFormat = `%(refname:short)${FIELD_SEP}%(committerdate:relative)${FIELD_SEP}%(committerdate:iso-strict)`;
  const branchesResult = execWithWarning(
    `git branch --sort=-committerdate --format="${branchFormat}" 2>/dev/null`,
    cwd,
  );
  if (branchesResult.warning) warnings.push(branchesResult.warning);

  const activeBranches: Branch[] = branchesResult.stdout
    ? branchesResult.stdout
        .split("\n")
        .filter(Boolean)
        .map((line) => {
          const [name, relativeDate, committerDate] = line.split(FIELD_SEP);
          return { name, relativeDate: relativeDate || "", committerDate: committerDate || "" };
        })
        .filter((b) => !b.committerDate || isWithinDays(b.committerDate, 7))
        .slice(0, 10)
    : [];

  const mergeFormat = `%h${FIELD_SEP}%s${FIELD_SEP}%an${FIELD_SEP}%ai`;
  const mergeResult = execWithWarning(
    `git log --merges -1 --format="${mergeFormat}" 2>/dev/null`,
    cwd,
  );
  if (mergeResult.warning) warnings.push(mergeResult.warning);
  let lastMerge: Commit | null = null;
  if (mergeResult.stdout) {
    lastMerge = parseCommitLine(mergeResult.stdout);
  }

  const conflictResult = execWithWarning("git diff --name-only --diff-filter=U 2>/dev/null", cwd);
  if (conflictResult.warning) warnings.push(conflictResult.warning);
  const conflictFiles = conflictResult.stdout
    ? conflictResult.stdout.split("\n").filter(Boolean)
    : [];

  const upstreamResult = execWithWarning("git status -sb", cwd);
  let aheadBehind: string | undefined;
  if (upstreamResult.stdout) {
    const firstLine = upstreamResult.stdout.split("\n")[0] || "";
    const match = firstLine.match(/\[(?:ahead (\d+))?(?:, )?(?:behind (\d+))?\]/);
    if (match) {
      const ahead = match[1] ? `${match[1]} ahead` : "";
      const behind = match[2] ? `${match[2]} behind` : "";
      aheadBehind = [ahead, behind].filter(Boolean).join(", ") || undefined;
    }
  }

  return {
    data: {
      currentBranch,
      recentCommits,
      uncommittedChanges,
      activeBranches,
      lastMerge,
      conflictFiles,
      aheadBehind,
    },
    warnings,
  };
}
