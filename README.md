# handoff-md

One command to generate a portable AI context file from any repo.

```
  $ npx handoff-md

  ✅ HANDOFF.md generated (~2,847 tokens)
     /Users/dev/myproject/HANDOFF.md
```

## Problem

Every time you switch AI models — Claude to GPT, Cursor to Copilot, or even between sessions — the new model starts from zero. **handoff-md** analyzes your repo and writes a **briefing** — not a data dump — into `HANDOFF.md`.

## Install

```bash
npx handoff-md
# or set up a project
npx handoff-md init
```

Requires Node.js 18+ and git. No API keys.

## What's in HANDOFF.md

- **Right now** — synthesized bullets: active edits, branch drift, conflicts, recent focus
- **Stack** — language, framework, tooling
- **Current state** — uncommitted changes, branches
- **Notes** — optional human overlay (`.handoff.overlay.md`)
- Plus structure, conventions, CI, scripts, TODOs, env vars

## CLI

| Flag / command | Description |
|----------------|-------------|
| `[path]` | Target repository (default: `.`) |
| `-c, --copy` | Copy output to clipboard |
| `-s, --stdout` | Print to stdout |
| `-f, --format <level>` | `compact` (~1.5K), `standard` (~3K), `full` (~5K) tokens |
| `-p, --profile <name>` | `cursor`, `ci`, `pr`, or `default` |
| `--no-cache` | Force full re-analysis |
| `--no-now` | Skip briefing section |
| `--frozen-time <iso>` | Reproducible timestamps (CI) |
| `handoff-md init` | Create HANDOFF + update AGENTS.md |
| `handoff-md check` | CI quality gate (tokens, age, spec) |
| `handoff-md watch` | Regenerate on save (uses cache) |
| `handoff-md diff` | Changes since last run |
| `handoff-md validate` | Required sections exist |

Bins: `handoff-md`, `handoff`, `handoff-mcp`.

## Recommended setup

```bash
npx handoff-md init --yes --hook
# Add to CI (see .github/workflows/handoff-check.yml)
npx handoff-md check . --max-age 7
```

Add `.handoff/` to your `.gitignore` (init does this with `--yes`).

## Configuration

`handoff.config.json` or `.handoffrc`:

```json
{
  "format": "standard",
  "profile": "cursor",
  "overlay": ".handoff.overlay.md",
  "ignoreDirs": ["generated"],
  "github": false
}
```

## Library API

```typescript
import { runHandoff } from 'handoff-md';

const { markdown, tokenEstimate, warnings, meta } = runHandoff({
  cwd: process.cwd(),
  format: 'standard',
  profile: 'cursor',
});
```

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
make check          # lint + typecheck + test
make test           # run all tests
make test-watch     # watch mode
make test TEST_FILE=git   # filter by file name
```

Or with npm: `npm install && npm run build && npm test`. Run `make help` for all targets.

See [docs/architecture.md](docs/architecture.md) and [handoff-spec.md](handoff-spec.md).

## License

MIT
