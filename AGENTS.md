# Dotfiles

System configs are symlinked or synced from this repo via `sync-dotfiles`; the map is in [dotfiles.json](dotfiles.json). Always edit sources here, never destinations outside the repo.

`DOTFILES_DIR` (`~/dotfiles`) and `THEMES_DIR` (`~/_/squirrelsong/themes`) are defined in `zsh/dirs.zsh` and referenced in `dotfiles.json`.

Never symlink into the Obsidian vault (`~/murder`) or other iCloud paths — use `mode: "sync"` in `dotfiles.json`.

This repo targets the last two major macOS releases only. Do not add platform checks.

Tools here should match configuration actually in use. Do not add generic fallbacks unless requested.

Ecosystem context: read [raccoonarium.md](./ai/raccoonarium.md).

## Commands

Use npm and the following commands:

```sh
npm test # Full verification suite
npm exec -- vitest run <test-path> # Focused test
npm run lint:fix # Autofix lint errors and format code
```

## CLI tools

New command-line tools are **TypeScript** in [`src/bin/`](./src/bin/), exposed on `$PATH` via a symlink in [`bin/`](./bin/) → [`bin/_ts`](./bin/_ts). Read [src/AGENTS.md](./src/AGENTS.md) before adding or changing a tool.

Non-TypeScript tools stay as executable scripts in [`bin/`](./bin/) (shell setup, macOS defaults, legacy helpers).

## AI configuration

Skills and global agent instructions live in `ai/`. Edit `ai/base-prompt.md` for global rules (all projects); edit `ai/skills/` for skills. See `ai/AGENTS.md` when changing the AI tree itself.
