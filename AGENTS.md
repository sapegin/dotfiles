# Dotfiles

System configs are symlinked or synced from this repo via `sync-dotfiles`; the map is in [dotfiles.json](dotfiles.json). Always edit sources here, never destinations outside the repo.

`DOTFILES_DIR` (`~/dotfiles`) and `THEMES_DIR` (`~/_/squirrelsong/themes`) are defined in `zsh/dirs.zsh` and referenced in `dotfiles.json`.

Never symlink into the Obsidian vault (`~/murder`) or other iCloud paths — use `mode: "sync"` in `dotfiles.json`.

This repo targets the last two major macOS releases only. Do not add platform checks.

Tools here should match configuration actually in use. Do not add generic fallbacks unless requested.

Ecosystem context: read [raccoonarium.md](./ai/raccoonarium.md).

## AI configuration

Skills, personas, and global agent instructions live in `ai/`. Edit `ai/base-prompt.md` for global rules (all projects); edit `ai/skills/` for skills. See `ai/AGENTS.md` when changing the AI tree itself.
