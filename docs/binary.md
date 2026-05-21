# Standalone binaries

Build with [Bun](https://bun.sh) (`bun build --compile`). Outputs land in `dist/bin/` (~65MB each; gitignored via `dist/`).

## Build

```bash
# Install Bun once
curl -fsSL https://bun.sh/install | bash

make binary                  # macOS arm64 (default)
make binary BUN_TARGET=bun-darwin-x64
make binary-install          # copy to ~/.local/bin
```

## Targets

| `BUN_TARGET` | Platform |
|--------------|----------|
| `bun-darwin-arm64` | macOS Apple Silicon (default) |
| `bun-darwin-x64` | macOS Intel |
| `bun-linux-x64` | Linux x64 |
| `bun-linux-arm64` | Linux arm64 |

Requires **git** on `PATH` at runtime (and **gh** for `## PR context`).

## Update

```bash
git pull && make binary-install
```
