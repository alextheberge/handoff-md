# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

**Current release:** [1.4.1](https://github.com/guvencem/handoff-md/releases) · **HANDOFF spec:** v2

## [1.4.1] - 2026-05-18

### Fixed

- Git porcelain path parsing in `## Right now` (no more truncated filenames like `EADME.md` from `trimStart` on status lines)
- `.github/workflows` and similar paths no longer skipped when walking the tree (dot-dir filter uses `basename`; `.github` and `.cursor` allowed)
- `## Right now` always includes at least one bullet when enabled (non-git repos, quiet working trees)
- Config `tokenBudget` overrides now apply in the renderer (not only assembler types)
- Watch/diff cache persistence unified through `saveCache` in `cache.ts`

### Added

- Warning when `--profile` is not a known preset
- Tests: `parseChangedPath`, gitignore tree walking, `runCheck` on fresh HANDOFF
- `make handoff` and `make handoff-verify` Makefile targets
- Documented `tokenBudget` in JSON schema with allowed section keys; [examples/handoff.config.json](examples/handoff.config.json)
- `ci` profile uses `shrinkLevel: 1` for tighter lists

## [1.4.0] - 2026-05-18

HANDOFF **spec v2**. Major focus: synthesized briefing, determinism, cache, CI tooling, and profiles.

### Added

- **`## Right now`** — synthesized briefing bullets (`src/synthesis/now.ts`) from git, edits, TODOs, conflicts
- **`## Notes`** — human overlay from `.handoff.overlay.md`
- **Priority-aware rendering** — low-priority sections drop first when over per-section or total token caps
- **Deterministic output** — stable sorts; `--frozen-time` and `SOURCE_DATE_EPOCH` for reproducible timestamps
- **Analyzer cache** — fingerprint cache at `.handoff/cache.json`; `--no-cache` to force full re-analysis
- **Git-aware tree walk** — `git check-ignore` when listing structure; fallback ignore list for non-git dirs
- **`handoff-md check`** — CI quality gate (required sections, `handoff-spec` version, token cap, optional max age)
- **`handoff-md init`** — create HANDOFF, update AGENTS.md, optional post-commit hook and `.gitignore` entries
- **`--profile` presets** — `cursor`, `ci`, `pr` (section toggles + shrink levels)
- **GitHub CLI analyzer** — optional `## PR context` when `gh` is available (`--no-github` to skip)
- **`handoff-md diff`** — analyzer freshness and git changes since last cached run
- **Config schema** — [schemas/handoff-config.schema.json](schemas/handoff-config.schema.json)
- **GitHub Actions** — `handoff-check.yml` workflow; artifact upload of generated HANDOFF
- **MCP** — `handoff-mcp` stdio server with `get_handoff_context` tool
- **Makefile** — `make test`, `make check`, grouped test targets, coverage support
- **Docs** — [docs/architecture.md](docs/architecture.md), updated [handoff-spec.md](handoff-spec.md)

### Changed

- Default generate flow saves cache metadata for watch/diff
- `validate` command delegates to shared `runCheck` logic

## [1.1.0]

### Added

- Structured git/exec error handling; warnings surfaced in output
- **Library API** — `runHandoff()` and package exports from `dist/index.js`
- **Config files** — `handoff.config.json`, `.handoffrc` (format, sections, ignore lists)
- **CLI** — `--output`, `--dry-run`, `--json`, `--no-git`, `--no-todos`, `--fail-on-warnings`
- **Subcommands** — `watch`, `diff`, `validate`
- **Analyzers** — workspace layout, CI workflows, npm scripts, stack detection
- **Conventions** — merge `.cursor/rules/*.mdc` and similar AI config excerpts
- **MCP** — initial stdio server (`handoff-mcp` bin)
- **Tooling** — Vitest, Biome, GitHub Actions CI

## [1.0.1]

Initial public release — core generate command, stack/structure/git analyzers, `compact` / `standard` / `full` formats.

[1.4.1]: https://github.com/guvencem/handoff-md/compare/v1.4.0...v1.4.1
[1.4.0]: https://github.com/guvencem/handoff-md/compare/v1.1.0...v1.4.0
[1.1.0]: https://github.com/guvencem/handoff-md/compare/v1.0.1...v1.1.0
[1.0.1]: https://github.com/guvencem/handoff-md/releases/tag/v1.0.1
