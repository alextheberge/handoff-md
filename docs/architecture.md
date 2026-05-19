# Architecture

## Pipeline

```
CLI (cli.ts)
  → runHandoff (handoff.ts)
      → analyzers (git, stack, structure, config, workspace, ci, scripts)
      → AssembledContext (assembler.ts)
      → renderHandoff (renderer.ts)
  → write / stdout / clipboard / JSON
```

## Analyzers

Each analyzer is a pure function `(cwd, options?) → data` plus optional warnings via git's `GitAnalysisResult`.

| Module | Output |
|--------|--------|
| `git.ts` | Branch, commits, status, merges, conflicts |
| `stack.ts` | Framework, language, tooling |
| `structure.ts` | Tree, conventions, TODOs, env vars |
| `config.ts` | Merged AI config files |
| `workspace.ts` | Monorepo detection |
| `ci.ts` | GitHub workflow names |
| `scripts.ts` | package.json scripts |

## Configuration

Merge order: defaults → `handoff.config.json` / `.handoffrc` → CLI flags.

## Library usage

```typescript
import { runHandoff } from 'handoff-md';

const result = runHandoff({ cwd: '/path/to/repo', format: 'standard' });
console.log(result.markdown);
```

CLI entry runs only when executed directly (`require.main === module`).

## Extending

1. Add analyzer under `src/analyzers/`
2. Extend `AssembledContext` and `DEFAULT_SECTIONS`
3. Render section in `renderer.ts`
4. Wire in `handoff.ts`
5. Add fixture + unit test
