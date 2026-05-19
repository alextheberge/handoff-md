import type { AssembledContext } from "../assembler";

export interface NowBullet {
  text: string;
  priority: number;
}

/** Parse path from `git status --porcelain` line (XY + path, handles renames). */
export function parseChangedPath(line: string): string {
  // Porcelain: XY + space + path — do not trimStart or status columns collapse (e.g. " M file")
  const match = line.trimEnd().match(/^(.{2})\s+(.+)$/);
  if (!match) return line.trim();
  let path = match[2].trim();
  const arrow = path.lastIndexOf(" -> ");
  if (arrow !== -1) {
    path = path.slice(arrow + 4).trim();
  }
  return path;
}

function isRecentDate(dateStr: string, hours = 24): boolean {
  const parsed = Date.parse(dateStr.includes("T") ? dateStr : `${dateStr}T12:00:00Z`);
  if (Number.isNaN(parsed)) return false;
  return parsed >= Date.now() - hours * 24 * 60 * 60 * 1000;
}

export function synthesizeNow(ctx: AssembledContext): NowBullet[] {
  const bullets: NowBullet[] = [];
  const git = ctx.git;

  if (git?.conflictFiles && git.conflictFiles.length > 0) {
    const files = [...git.conflictFiles].sort().slice(0, 3).join(", ");
    bullets.push({
      priority: 100,
      text: `Merge conflicts in: ${files}${git.conflictFiles.length > 3 ? "…" : ""}`,
    });
  }

  if (git?.aheadBehind) {
    bullets.push({
      priority: 90,
      text: `Branch \`${git.currentBranch}\` is ${git.aheadBehind} of upstream`,
    });
  }

  if (git && git.uncommittedChanges.length > 0) {
    const paths = git.uncommittedChanges.map(parseChangedPath).sort().slice(0, 3);
    bullets.push({
      priority: 85,
      text: `Active edits (${git.uncommittedChanges.length} files): ${paths.join(", ")}`,
    });

    const editedSet = new Set(paths);
    const todosInEdits = ctx.structure.todos
      .filter((t) => editedSet.has(t.file) || paths.some((p) => t.file.startsWith(p)))
      .slice(0, 2);
    if (todosInEdits.length > 0) {
      bullets.push({
        priority: 80,
        text: `Open TODOs in files you're editing: ${todosInEdits.map((t) => t.file).join(", ")}`,
      });
    }
  }

  const last = git?.recentCommits[0];
  if (last) {
    let focus = `Recent focus: \`${last.hash}\` ${last.message}`;
    if (last.files && last.files.length > 0) {
      const files = [...last.files].sort().slice(0, 3).join(", ");
      focus += ` (${files})`;
    }
    bullets.push({ priority: 70, text: focus });
  }

  if (git && git.uncommittedChanges.length === 0 && last) {
    if (isRecentDate(last.date)) {
      bullets.push({
        priority: 50,
        text: `Working tree clean; last commit: ${last.message}`,
      });
    } else {
      bullets.push({ priority: 40, text: "Working tree is clean" });
    }
  }

  if (git?.lastMerge && bullets.every((b) => !b.text.toLowerCase().includes("merge"))) {
    bullets.push({
      priority: 60,
      text: `Last merge: \`${git.lastMerge.hash}\` ${git.lastMerge.message}`,
    });
  }

  if (bullets.length === 0) {
    bullets.push({
      priority: 20,
      text: git
        ? "Repository has no recent git activity to summarize."
        : "Not a git repository — run inside a git repo for branch and commit context.",
    });
  }

  return bullets
    .sort((a, b) => b.priority - a.priority || a.text.localeCompare(b.text))
    .slice(0, 5);
}
