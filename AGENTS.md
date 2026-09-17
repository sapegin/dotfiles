# Dotfiles

System configs are symlinked or synced from this repo via `sync-dotfiles`; the map is in [dotfiles.json](dotfiles.json). Always edit sources here, never destinations outside the repo.

`DOTFILES_DIR` (`~/dotfiles`) and `THEMES_DIR` (`~/_/squirrelsong/themes`) are defined in `zsh/dirs.zsh` and referenced in `dotfiles.json`.

Never symlink into the Obsidian vault (`~/murder`) or other iCloud paths — use `mode: "sync"` in `dotfiles.json`.

This repo targets the last two major macOS releases only. Do not add platform checks.

Tools here should match configuration actually in use. Do not add generic fallbacks unless requested.

Ecosystem context: read [raccoonarium.md](./ai/raccoonarium.md).

## CLI tools

New command-line tools are **TypeScript** in [`src/bin/`](./src/bin/), exposed on `$PATH` via [`bin/symlinks/`](./bin/symlinks/) → [`bin/_ts`](./bin/_ts). Read [src/AGENTS.md](./src/AGENTS.md) before adding or changing a tool.

Executable scripts in [`bin/`](./bin/) are for non-TypeScript tools only (shell setup, macOS defaults, legacy helpers).

## Tinycast / Raycast extensions

Personal extensions for [Tinycast](https://github.com/abue-ammar/tinycast) live under [`tinycast/`](./tinycast/). Each extension is a standard Raycast bundle (`package.json`, `src/`, `assets/`).

- **Build:** `npm install` and `npm run build` inside the extension folder; output goes to `dist/`.
- **Install:** Tinycast → Settings → Extensions → **Add Folder…** → pick that extension’s `dist/` directory.
- **Logic:** Share behavior through `src/util/` or `src/bin/` — import shared modules into the extension bundle at build time, or call a CLI via subprocess when that fits better. **Never** invoke anything under `src/alfred/` from Tinycast; migrate logic out of Alfred scripts first, then delete the Alfred copies when workflows are retired.

See each extension’s `README.md` for command-specific behavior.

## AI configuration

Skills, personas, and global agent instructions live in `ai/`. Edit `ai/base-prompt.md` for global rules (all projects); edit `ai/skills/` for skills. See `ai/AGENTS.md` when changing the AI tree itself.
