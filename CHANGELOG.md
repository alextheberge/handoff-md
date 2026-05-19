# Changelog

## 1.1.0

### Added

- Structured git/exec error handling with warnings in output
- Library API: `runHandoff()`, exports from package root
- Config files: `handoff.config.json`, `.handoffrc`
- CLI flags: `--output`, `--dry-run`, `--json`, `--no-git`, `--no-todos`, `--fail-on-warnings`
- Subcommands: `watch`, `diff`, `validate`
- Analyzers: workspace (monorepo), CI workflows, npm scripts
- Multi-config merge including `.cursor/rules/*.mdc`
- MCP stdio server (`handoff-mcp` bin)
- Vitest test suite, Biome lint, GitHub Actions CI
- `handoff-spec.md` and JSON output schema

### Fixed

- Git log parsing with `\x1f` delimiter (pipe in commit messages)
- Shallow repo `HEAD~5` diff fallback
- Version sync with package.json
- Post-commit hook uses `npx handoff-md`
- Go Echo false positives (module path check)
- Active branches filtered to last 7 days
- `lastMerge` rendered in Recent Activity

## 1.0.1

Initial public release.
