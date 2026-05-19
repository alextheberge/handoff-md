# handoff-md

One command to generate a portable AI context file from any repo.

```
  $ npx handoff-md

  ✅ HANDOFF.md generated (~2,847 tokens)
     /Users/dev/myproject/HANDOFF.md
```

## Problem

Every time you switch AI models — Claude to GPT, Cursor to Copilot, or even between sessions — the new model starts from zero. **handoff-md** analyzes your repo and writes current stack, structure, git state, TODOs, and existing AI rules into `HANDOFF.md`.

## Install

```bash
npx handoff-md
```

Requires Node.js 18+ and git. No API keys.

## CLI

| Flag / command | Description |
|----------------|-------------|
| `[path]` | Target repository (default: `.`) |
| `-c, --copy` | Copy output to clipboard |
| `-s, --stdout` | Print to stdout |
| `-o, --output <path>` | Custom output path |
| `-f, --format <level>` | `compact`, `standard`, `full` |
| `--dry-run` | Show token estimate without writing |
| `--json` | Machine-readable JSON |
| `--no-git` / `--no-todos` | Disable sections |
| `--fail-on-warnings` | Exit 1 if analyzers warn |
| `--install-hook` | Git post-commit hook |
| `handoff-md watch` | Regenerate on file changes |
| `handoff-md diff` | Changes since last run |
| `handoff-md validate` | Validate HANDOFF.md sections |

Bins: `handoff-md`, `handoff`, `handoff-mcp` (MCP stdio server).

## Configuration

Optional `handoff.config.json` or `.handoffrc` in the repo root:

```json
{
  "format": "standard",
  "output": "HANDOFF.md",
  "ignoreDirs": ["generated"],
  "sections": { "ci": true, "workspace": true }
}
```

## Library API

```typescript
import { runHandoff } from 'handoff-md';

const { markdown, tokenEstimate, warnings } = runHandoff({
  cwd: process.cwd(),
  format: 'standard',
});
```

## Why not CLAUDE.md?

| | HANDOFF.md | CLAUDE.md |
|---|---|---|
| **Updates** | Auto-generated from repo state | Manually maintained |
| **Portability** | Any model | Claude-centric |
| **Scope** | Git, TODOs, CI, monorepo, scripts | Static rules |

HANDOFF complements CLAUDE.md, AGENTS.md, and `.cursor/rules` — handoff-md merges them into the output.

## Contributing

```bash
git clone https://github.com/guvencem/handoff-md.git
cd handoff-md
npm install
npm run build
npm test
node dist/index.js
```

See [docs/architecture.md](docs/architecture.md) and [handoff-spec.md](handoff-spec.md).

## License

MIT
