# Changelog

## 1.4.1

### Fixed

- Git porcelain path parsing in `## Right now` (no more truncated filenames like `EADME.md`)
- `.github/workflows` no longer hidden when walking the tree (dot-path ignore uses basename)
- `## Right now` always includes at least one bullet (non-git repos, empty state)
- Config `tokenBudget` overrides now apply in the renderer
- Cache save unified via `saveCache`

### Added

- Unknown `--profile` emits a warning
- Tests for path parsing, gitignore walking, and `check` command
- `make handoff` / `make handoff-verify` targets; documented `tokenBudget` in config schema and example config

## 1.4.0

### Added

- `## Right now` synthesized briefing section (handoff-spec v2)
- `## Notes` from `.handoff.overlay.md`
- Priority-aware section dropping under token caps
- Deterministic output via `--frozen-time` and `SOURCE_DATE_EPOCH`
- Analyzer fingerprint cache (`.handoff/cache.json`) and `--no-cache`
- `.gitignore`-aware directory walking via `git check-ignore`
- `handoff-md check` CI quality gate
- `handoff-md init` project setup
- `--profile` presets: `cursor`, `ci`, `pr`
- Optional GitHub CLI integration (`## PR context`)
- Improved `diff` with analyzer freshness and git stat since last run
- Config schema: `schemas/handoff-config.schema.json`
- GitHub Action artifact upload and `handoff-check` workflow

## 1.1.0

### Added

- Structured git/exec error handling with warnings in output
- Library API: `runHandoff()`, exports from package root
- Config files: `handoff.config.json`, `.handoffrc`
- CLI flags: `--output`, `--dry-run`, `--json`, `--no-git`, `--no-todos`, `--fail-on-warnings`
- Subcommands: `watch`, `diff`, `validate`
- Analyzers: workspace, CI workflows, npm scripts
- Multi-config merge including `.cursor/rules/*.mdc`
- MCP stdio server (`handoff-mcp` bin)
- Vitest test suite, Biome lint, GitHub Actions CI

## 1.0.1

Initial public release.
