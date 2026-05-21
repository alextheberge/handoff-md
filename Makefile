# handoff-md — development Makefile
# Run `make` or `make help` for available targets.

.DEFAULT_GOAL := help

SHELL := /bin/bash
.SHELLFLAGS := -eu -o pipefail -c

# ------------------------------------------------------------------------------
# Config
# ------------------------------------------------------------------------------

NODE        ?= node
NPM         ?= npm
NPX         ?= npx
BUN         ?= $(HOME)/.bun/bin/bun
BUN_TARGET  ?= bun-darwin-arm64

PKG         := handoff-md
DIST        := dist
SRC         := src
TEST_DIR    := test
FIXTURES    := $(TEST_DIR)/fixtures

# Vitest: pass a file fragment (e.g. synthesis, git, cache)
TEST_FILE   ?=
# Vitest: pass -t pattern for test name
TEST_NAME   ?=
# Repo path for manual CLI runs
REPO        ?= .
FORMAT      ?= standard
PROFILE     ?=

# Colors (disabled when not a TTY)
ifneq ($(shell test -t 1 && echo ok),)
  CYAN   := \033[36m
  GREEN  := \033[32m
  YELLOW := \033[33m
  RESET  := \033[0m
else
  CYAN   :=
  GREEN  :=
  YELLOW :=
  RESET  :=
endif

# ------------------------------------------------------------------------------
# Help
# ------------------------------------------------------------------------------

.PHONY: help
help: ## Show this help
	@printf '%bhandoff-md — Make targets%b\n\n' "$(CYAN)" "$(RESET)"
	@awk 'BEGIN {FS = ":.*##"; printf "Usage: make <target>\n\n"} \
		/^[a-zA-Z0-9_.-]+:.*##/ { printf "  $(GREEN)%-18s$(RESET) %s\n", $$1, $$2 }' \
		$(MAKEFILE_LIST)
	@printf '\n%bTest filters (examples):%b\n' "$(YELLOW)" "$(RESET)"
	@printf '  make test TEST_FILE=synthesis\n'
	@printf '  make test TEST_FILE=git\n'
	@printf '  make test TEST_NAME="parses commits"\n'
	@printf '  make test-watch TEST_FILE=renderer\n\n'
	@printf '%bCLI examples:%b\n' "$(YELLOW)" "$(RESET)"
	@printf '  make handoff              # write HANDOFF.md (this repo)\n'
	@printf '  make handoff-verify       # regenerate + handoff-md check\n'
	@printf '  make run REPO=. FORMAT=compact\n'
	@printf '  make check-handoff REPO=.\n'

# ------------------------------------------------------------------------------
# Setup
# ------------------------------------------------------------------------------

.PHONY: install
install: ## Install npm dependencies
	$(NPM) install

.PHONY: ci-install
ci-install: ## Clean install for CI (uses package-lock.json)
	$(NPM) ci

.PHONY: doctor
doctor: ## Print toolchain versions
	@printf '%bEnvironment%b\n' "$(CYAN)" "$(RESET)"
	@command -v $(NODE) >/dev/null && $(NODE) --version || echo "node: missing"
	@command -v $(NPM) >/dev/null && $(NPM) --version || echo "npm: missing"
	@command -v git >/dev/null && git --version || echo "git: missing (required for git tests)"
	@test -d node_modules && echo "node_modules: ok" || echo "node_modules: run 'make install'"

# ------------------------------------------------------------------------------
# Build
# ------------------------------------------------------------------------------

.PHONY: build
build: ## Compile TypeScript to dist/
	$(NPM) run build

.PHONY: typecheck
typecheck: ## Typecheck without emitting (tsc --noEmit)
	$(NPM) run typecheck

.PHONY: dev
dev: ## Watch-compile TypeScript
	$(NPM) run dev

.PHONY: clean
clean: ## Remove build output and coverage artifacts
	rm -rf $(DIST)
	rm -rf coverage
	rm -rf .handoff
	rm -rf node_modules/.vite
	@# Local HANDOFF from self-tests (gitignored)
	@rm -f HANDOFF.md

.PHONY: clean-all
clean-all: clean ## Remove node_modules and lock-installed artifacts
	rm -rf node_modules

# ------------------------------------------------------------------------------
# Lint / format
# ------------------------------------------------------------------------------

.PHONY: lint
lint: ## Run Biome linter
	$(NPM) run lint

.PHONY: lint-fix
lint-fix: ## Run Biome with auto-fix
	$(NPM) run lint:fix

.PHONY: format
format: lint-fix ## Alias for lint-fix

# ------------------------------------------------------------------------------
# Tests
# ------------------------------------------------------------------------------

# Build vitest CLI args from TEST_FILE / TEST_NAME
VITEST_ARGS :=
ifdef TEST_FILE
  VITEST_ARGS += $(TEST_FILE)
endif
ifdef TEST_NAME
  VITEST_ARGS += -t "$(TEST_NAME)"
endif

.PHONY: test
test: build ## Run full test suite once (requires build)
	$(NPM) run test -- $(VITEST_ARGS)

.PHONY: test-watch
test-watch: build ## Run tests in watch mode
	$(NPM) run test:watch -- $(VITEST_ARGS)

.PHONY: test-verbose
test-verbose: build ## Run tests with verbose reporter
	$(NPX) vitest run --reporter=verbose $(VITEST_ARGS)

.PHONY: test-ui
test-ui: build ## Open Vitest UI (interactive)
	$(NPX) vitest --ui $(VITEST_ARGS)

# Grouped suites (by directory / topic)
.PHONY: test-unit
test-unit: build ## Unit tests (assembler, renderer, synthesis, version)
	$(NPX) vitest run \
		$(TEST_DIR)/assembler.test.ts \
		$(TEST_DIR)/renderer.test.ts \
		$(TEST_DIR)/renderer-priority.test.ts \
		$(TEST_DIR)/synthesis.test.ts \
		$(TEST_DIR)/version.test.ts \
		$(TEST_DIR)/exec.test.ts \
		$(VITEST_ARGS)

.PHONY: test-analyzers
test-analyzers: build ## Analyzer tests (stack, config)
	$(NPX) vitest run \
		$(TEST_DIR)/stack.test.ts \
		$(TEST_DIR)/config.test.ts \
		$(VITEST_ARGS)

.PHONY: test-git
test-git: build ## Git integration tests (requires git)
	@command -v git >/dev/null || { echo "Error: git is required for test-git"; exit 1; }
	$(NPX) vitest run $(TEST_DIR)/git.test.ts $(VITEST_ARGS)

.PHONY: test-cache
test-cache: build ## Cache layer tests
	$(NPX) vitest run $(TEST_DIR)/cache.test.ts $(TEST_DIR)/overlay.test.ts $(VITEST_ARGS)

.PHONY: test-snapshots
test-snapshots: build ## Snapshot / determinism tests
	$(NPX) vitest run $(TEST_DIR)/snapshots $(VITEST_ARGS)

.PHONY: test-coverage
test-coverage: build ## Run tests with V8 coverage report
	$(NPX) vitest run --coverage $(VITEST_ARGS)

.PHONY: test-ci
test-ci: ci-install build lint typecheck test ## CI test pipeline (install, lint, typecheck, test)
	@printf '%btest-ci: all checks passed%b\n' "$(GREEN)" "$(RESET)"

# ------------------------------------------------------------------------------
# Quality gates
# ------------------------------------------------------------------------------

.PHONY: check
check: build lint typecheck test ## Lint + typecheck + test (local pre-push)
	@printf '%bcheck: all passed%b\n' "$(GREEN)" "$(RESET)"

.PHONY: verify
verify: check ## Alias for check

.PHONY: ci
ci: test-ci ## Full CI pipeline (npm ci, lint, typecheck, test)

# ------------------------------------------------------------------------------
# Run handoff-md locally
# ------------------------------------------------------------------------------

.PHONY: run
run: build ## Generate HANDOFF for REPO (stdout); set REPO, FORMAT, PROFILE
	$(NODE) $(DIST)/index.js $(REPO) --stdout -f $(FORMAT) \
		$(if $(PROFILE),-p $(PROFILE),)

.PHONY: run-write
run-write: build ## Write HANDOFF.md to REPO
	$(NODE) $(DIST)/index.js $(REPO) -f $(FORMAT) \
		$(if $(PROFILE),-p $(PROFILE),)

.PHONY: handoff handoff-self handoff-verify
handoff: build ## Write HANDOFF.md under REPO (default: this repo)
	$(NODE) $(DIST)/index.js $(REPO) -f $(FORMAT) \
		$(if $(PROFILE),-p $(PROFILE),)

handoff-self: handoff ## Alias for handoff (repo root)

handoff-verify: handoff check-handoff ## Regenerate HANDOFF.md then run check

.PHONY: check-handoff
check-handoff: build ## Run handoff-md check on REPO
	$(NODE) $(DIST)/index.js check $(REPO)

.PHONY: validate-handoff
validate-handoff: build ## Run handoff-md validate on REPO
	$(NODE) $(DIST)/index.js validate $(REPO)

.PHONY: diff-handoff
diff-handoff: build ## Show diff since last handoff in REPO
	$(NODE) $(DIST)/index.js diff $(REPO)

.PHONY: init-handoff
init-handoff: build ## Run handoff-md init in REPO (dry-run: add INIT_ARGS=--dry-run)
	$(NODE) $(DIST)/index.js init $(REPO) $(INIT_ARGS)

# ------------------------------------------------------------------------------
# Standalone binaries (requires Bun: https://bun.sh)
# ------------------------------------------------------------------------------

.PHONY: binary
binary: build ## Compile dist/bin/handoff-md and handoff-mcp (BUN_TARGET=$(BUN_TARGET))
	@command -v $(BUN) >/dev/null || { echo "Install Bun: curl -fsSL https://bun.sh/install | bash"; exit 1; }
	mkdir -p $(DIST)/bin
	$(BUN) build $(DIST)/index.js --compile --target=$(BUN_TARGET) --outfile $(DIST)/bin/handoff-md
	$(BUN) build $(DIST)/mcp/server.js --compile --target=$(BUN_TARGET) --outfile $(DIST)/bin/handoff-mcp
	@printf '%bBinary: $(DIST)/bin/handoff-md ($(BUN_TARGET))%b\n' "$(GREEN)" "$(RESET)"
	@ls -lh $(DIST)/bin/handoff-md $(DIST)/bin/handoff-mcp

.PHONY: binary-install
binary-install: binary ## Copy binaries to ~/.local/bin (add to PATH)
	mkdir -p $(HOME)/.local/bin
	cp $(DIST)/bin/handoff-md $(DIST)/bin/handoff-mcp $(HOME)/.local/bin/
	@printf '%bInstalled: $(HOME)/.local/bin/handoff-md%b\n' "$(GREEN)" "$(RESET)"

# ------------------------------------------------------------------------------
# Release helpers
# ------------------------------------------------------------------------------

.PHONY: prepublish
prepublish: check ## Same checks as npm publish (build + test via prepublishOnly)
	@printf '%bprepublish: ready%b\n' "$(GREEN)" "$(RESET)"
