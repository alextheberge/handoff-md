import * as fs from "fs";
import * as path from "path";
import { installHook, runHandoff, writeHandoff } from "./handoff";

const AGENTS_BLOCK = `
## Project context

Read \`HANDOFF.md\` in the repo root before large tasks.
Regenerate with \`npx handoff-md\`.
`.trim();

export interface InitOptions {
  cwd: string;
  dryRun?: boolean;
  hook?: boolean;
  noAgents?: boolean;
  yes?: boolean;
}

export function runInit(options: InitOptions): void {
  const cwd = path.resolve(options.cwd);
  const handoffPath = path.join(cwd, "HANDOFF.md");
  const agentsPath = path.join(cwd, "AGENTS.md");
  const gitignorePath = path.join(cwd, ".gitignore");

  if (options.dryRun) {
    console.log("Dry run — would:");
    if (!fs.existsSync(handoffPath)) console.log("  - Generate HANDOFF.md");
    if (!options.noAgents) console.log("  - Update AGENTS.md");
    if (options.yes) console.log("  - Add .handoff/ to .gitignore");
    if (options.hook) console.log("  - Install post-commit hook");
    return;
  }

  if (!fs.existsSync(handoffPath)) {
    const result = runHandoff({ cwd });
    writeHandoff(result.meta.outputPath, result.markdown);
    console.log(`✅ Created ${handoffPath}`);
  } else {
    console.log(`ℹ️  ${handoffPath} already exists`);
  }

  if (!options.noAgents) {
    if (fs.existsSync(agentsPath)) {
      const content = fs.readFileSync(agentsPath, "utf-8");
      if (!content.includes("HANDOFF.md")) {
        fs.appendFileSync(agentsPath, `\n\n${AGENTS_BLOCK}\n`);
        console.log("✅ Appended project context to AGENTS.md");
      } else {
        console.log("ℹ️  AGENTS.md already references HANDOFF.md");
      }
    } else {
      fs.writeFileSync(agentsPath, `${AGENTS_BLOCK}\n`, "utf-8");
      console.log("✅ Created AGENTS.md");
    }
  }

  if (options.yes && fs.existsSync(gitignorePath)) {
    const gi = fs.readFileSync(gitignorePath, "utf-8");
    if (!gi.includes(".handoff")) {
      fs.appendFileSync(gitignorePath, "\n.handoff/\n");
      console.log("✅ Added .handoff/ to .gitignore");
    }
  }

  if (options.hook) {
    installHook(cwd);
  }

  console.log("\nNext steps:");
  console.log("  npx handoff-md watch     # auto-refresh on save");
  console.log("  npx handoff-md check     # CI quality gate");
  console.log("  npx handoff-md --copy    # copy to clipboard");
}
