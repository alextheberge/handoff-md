import { execWithWarning } from "../utils/exec";

export interface GitHubIssue {
  number: number;
  title: string;
}

export interface GitHubData {
  prTitle?: string;
  prUrl?: string;
  issues: GitHubIssue[];
}

function ghAvailable(): boolean {
  const r = execWithWarning("gh --version");
  return Boolean(r.stdout);
}

export function analyzeGitHub(cwd: string, currentBranch?: string): GitHubData | null {
  if (!ghAvailable()) return null;

  const prResult = execWithWarning("gh pr view --json title,url 2>/dev/null", cwd);
  let prTitle: string | undefined;
  let prUrl: string | undefined;
  if (prResult.stdout) {
    try {
      const pr = JSON.parse(prResult.stdout) as { title?: string; url?: string };
      prTitle = pr.title;
      prUrl = pr.url;
    } catch {
      // ignore
    }
  }

  const issues: GitHubIssue[] = [];
  if (currentBranch) {
    const issueResult = execWithWarning(
      "gh issue list --limit 3 --json number,title 2>/dev/null",
      cwd,
    );
    if (issueResult.stdout) {
      try {
        const list = JSON.parse(issueResult.stdout) as GitHubIssue[];
        issues.push(...list.slice(0, 3));
      } catch {
        // ignore
      }
    }
  }

  if (!prTitle && issues.length === 0) return null;
  return { prTitle, prUrl, issues };
}
