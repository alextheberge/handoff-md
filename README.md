# handoff-md

**v1.4.1** · [Changelog](CHANGELOG.md) · [HANDOFF spec v2](handoff-spec.md)

One command to generate a portable AI context file from any repo.

```
  $ npx handoff-md

  ✅ HANDOFF.md generated (~2,847 tokens)
     /Users/dev/myproject/HANDOFF.md
```

## Problem

Every time you switch AI models — Claude to GPT, Cursor to Copilot, or even between sessions — the new model starts from zero. **handoff-md** analyzes your repo and writes a **briefing** — not a data dump — into `HANDOFF.md`.

## Features

- **Synthesized briefing** — `## Right now` bullets from git state, edits, and TODOs
- **Deterministic output** — stable ordering; `--frozen-time` / `SOURCE_DATE_EPOCH` for CI
- **Token budgets** — per-section caps with priority-aware dropping when over limit
- **Fast re-runs** — analyzer fingerprint cache in `.handoff/cache.json` (`--no-cache` to bust)
- **Human overlay** — merge `.handoff.overlay.md` into `## Notes`
- **Profiles** — `cursor`, `ci`, `pr` presets for different workflows
- **Quality gates** — `check` and `validate` for CI; optional `gh` → `## PR context`
- **MCP server** — `handoff-mcp` tool `get_handoff_context` for agents
- **Library API** — `runHandoff()`, `runCheck()`, `synthesizeNow()`, and more

Requires **Node.js 18+** and **git** (for full analysis). No API keys.

## Install

```bash
npx handoff-md
# or set up a project
npx handoff-md init --yes --hook
```

## What's in HANDOFF.md

Output follows [handoff-spec.md](handoff-spec.md) **v2**. Sections are included based on format, profile, and config; low-priority sections drop first when over the token cap.

| Section | Content |
|---------|---------|
| **Right now** *(required)* | Briefing: active edits, branch drift, conflicts, recent focus |
| **Stack** *(required)* | Language, framework, package manager, tooling |
| **Notes** | Human overlay from `.handoff.overlay.md` |
| **Structure** | Directory tree (respects `.gitignore`) |
| **Conventions** | Naming patterns + excerpts from AI config files |
| **Recent Activity** | Recent commits |
| **Current State** | Uncommitted changes, branches |
| **Known Issues** | TODO / FIXME / HACK scan |
| **Environment** | Env var names from examples |
| **Config** | Key project config files |
| **Workspace** | Monorepo / workspace layout |
| **CI** | GitHub Actions workflows |
| **Scripts** | `package.json` scripts |
| **PR context** | Open PR/issues when `gh` is available |
| **Warnings** | Non-fatal analyzer issues |

| Format | Approx. total cap |
|--------|-------------------|
| `compact` | ~1,500 tokens |
| `standard` | ~3,000 tokens |
| `full` | ~5,000 tokens |

## CLI

Default command generates `HANDOFF.md` in the target repo:

```bash
npx handoff-md [path]              # generate (default path: .)
npx handoff-md generate [path]     # explicit subcommand
```

### Generate flags

| Flag | Description |
|------|-------------|
| `-c, --copy` | Copy output to clipboard |
| `-s, --stdout` | Print to stdout instead of writing a file |
| `-v, --verbose` | Show detailed analysis info |
| `-f, --format <level>` | `compact`, `standard` (default), or `full` |
| `-p, --profile <name>` | `default`, `cursor`, `ci`, or `pr` |
| `-o, --output <path>` | Output file path (default: `HANDOFF.md`) |
| `--dry-run` | Report path and token estimate without writing |
| `--json` | Machine-readable JSON on stdout |
| `--no-git` | Skip git analysis |
| `--no-todos` | Skip TODO scanning |
| `--no-now` | Skip `## Right now` |
| `--no-cache` | Disable analyzer cache |
| `--no-github` | Skip GitHub CLI integration |
| `--frozen-time <iso>` | Fixed timestamp (reproducible builds) |
| `--fail-on-warnings` | Exit 1 if analyzers emit warnings |
| `--install-hook` | Install git post-commit hook |

### Commands

| Command | Description |
|---------|-------------|
| `handoff-md init [path]` | Create `HANDOFF.md`, update `AGENTS.md`, optional hook / `.gitignore` |
| `handoff-md check [path]` | CI gate: sections, spec version, token cap, optional max age |
| `handoff-md validate [path]` | Verify required sections exist (lighter than `check`) |
| `handoff-md watch [path]` | Regenerate on file changes (uses cache) |
| `handoff-md diff [path]` | Changes since last generation |
| `handoff-md generate [path]` | Same as default generate with all flags above |

**Init flags:** `--dry-run`, `--hook`, `--no-agents`, `-y, --yes` (add `.handoff/` to `.gitignore`).

**Check flags:** `-f, --format`, `--max-age <days>`, `--no-token-limit`, `--fail-on-warnings`, `--json`.

**Bins:** `handoff-md`, `handoff`, `handoff-mcp`.

## Profiles

| Profile | Use case |
|---------|----------|
| `default` | Balanced sections for most repos |
| `cursor` | Conventions, notes, scripts, structure; omits workspace/CI noise |
| `ci` | Compact output; stack, scripts, CI, briefing; minimal git/TODO |
| `pr` | Git + TODOs + GitHub PR context for review handoffs |

Unknown profile names log a warning and fall back to defaults.

## Recommended setup

```bash
npx handoff-md init --yes --hook
npx handoff-md                    # or rely on post-commit hook
npx handoff-md check . --max-age 7
```

Add `.handoff/` to `.gitignore` (init does this with `--yes`). Cache and last-run metadata live there; commit `HANDOFF.md` if you want agents to read a checked-in snapshot.

**CI:** see [.github/workflows/handoff-check.yml](.github/workflows/handoff-check.yml) — generate with `--no-cache`, then `check` with `--max-age`.

## Configuration

`handoff.config.json` or `.handoffrc` in the repo root (CLI flags override):

```json
{
  "format": "standard",
  "profile": "cursor",
  "overlay": ".handoff.overlay.md",
  "ignoreDirs": ["generated"],
  "sections": {
    "github": false,
    "now": true
  },
  "tokenBudget": {
    "activity": 500,
    "structure": 300
  }
}
```

Per-section `tokenBudget` keys (`header`, `now`, `stack`, `activity`, …) override defaults for the active `format`. Schema: [schemas/handoff-config.schema.json](schemas/handoff-config.schema.json) · Example: [examples/handoff.config.json](examples/handoff.config.json).

## MCP

Stdio MCP server for tool-using agents:

```bash
npx handoff-mcp [repo-path]
```

Exposes `get_handoff_context` — returns generated HANDOFF markdown for the repo.

## Library API

```typescript
import {
  runHandoff,
  runCheck,
  runInit,
  renderHandoff,
  synthesizeNow,
  VERSION,
  HANDOFF_SPEC_VERSION,
} from 'handoff-md';

const { markdown, tokenEstimate, warnings, meta } = runHandoff({
  cwd: process.cwd(),
  format: 'standard',
  profile: 'cursor',
  frozenTime: '2026-01-01 00:00:00', // optional, for tests/CI
});

const check = runCheck({ cwd: process.cwd(), maxAgeDays: 7 });
```

See [docs/architecture.md](docs/architecture.md) for pipeline and merge order (defaults → config → CLI).

## Why not CLAUDE.md?

| | HANDOFF.md | CLAUDE.md |
|---|---|---|
| **Updates** | Auto-generated from repo state | Manually maintained |
| **Portability** | Any model | Claude-centric |
| **Scope** | Live git state + briefing | Static rules |

HANDOFF complements CLAUDE.md, AGENTS.md, and `.cursor/rules`.

## Contributing

```bash
make install
make check              # build + lint + typecheck + test
make handoff            # regenerate HANDOFF.md for this repo
make handoff-verify     # regenerate + handoff-md check
make test               # full Vitest suite
make test TEST_FILE=git   # filter by file fragment
make help               # all Make targets
```

Or: `npm install && npm run build && npm test`.

## License

MIT
