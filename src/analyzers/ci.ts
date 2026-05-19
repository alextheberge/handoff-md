import * as fs from "fs";
import * as path from "path";

export interface CiData {
  workflows: string[];
  jobs: string[];
}

function extractJobsFromWorkflow(content: string): string[] {
  const jobs: string[] = [];
  const jobsMatch = content.match(/^jobs:\s*$/m);
  if (!jobsMatch) return jobs;

  const lines = content.split("\n");
  let inJobs = false;
  for (const line of lines) {
    if (line.match(/^jobs:\s*$/)) {
      inJobs = true;
      continue;
    }
    if (inJobs) {
      const jobMatch = line.match(/^ {2}([a-zA-Z0-9_-]+):\s*$/);
      if (jobMatch) {
        jobs.push(jobMatch[1]);
      }
      if (line.match(/^[a-z]/) && !line.startsWith("  ")) {
        break;
      }
    }
  }
  return jobs;
}

export function analyzeCi(cwd: string): CiData | null {
  const workflowsDir = path.join(cwd, ".github", "workflows");
  if (!fs.existsSync(workflowsDir)) return null;

  let entries: string[];
  try {
    entries = fs.readdirSync(workflowsDir).filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"));
  } catch {
    return null;
  }

  if (entries.length === 0) return null;

  const workflows: string[] = [];
  const jobs: string[] = [];

  for (const file of entries.slice(0, 5)) {
    workflows.push(file);
    try {
      const content = fs.readFileSync(path.join(workflowsDir, file), "utf-8");
      jobs.push(...extractJobsFromWorkflow(content));
    } catch {
      // ignore
    }
  }

  return {
    workflows,
    jobs: [...new Set(jobs)].slice(0, 10),
  };
}
