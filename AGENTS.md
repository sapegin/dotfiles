System configuration files are symlinked or synced from this repository using sync-dotfiles.ts script. The sync map is in dotfiles.json. Always edit source files in this repository, never edit system files outside.

`DOTFILES_DIR` (default `~/dotfiles`) and `THEMES_DIR` (default `~/_/squirrelsong/themes`) are defined once in `zsh/dirs.zsh` and used in shell configs and `dotfiles.json` as `$DOTFILES_DIR` and `$THEMES_DIR`.

Never symlink files into the Obsidian vault (`~/murder`) or other iCloud paths — iCloud does not handle symlinks reliably. Use `mode: "sync"` in `dotfiles.json` instead.

New tools are written in TypeScript and located at `src/bin/`. Each TypeScript tool should have a matching symlink in `bin/symlinks/` that points to the shared `bin/_ts` runner (example: `src/bin/j.ts` and `bin/symlinks/j` → `_ts`). Keep non-TypeScript tools as regular executable scripts in `bin/`.

Shared utility functions should have concise comments explaining their purpose.

Agent skills, personas, and shared AI references live in `$DOTFILES_DIR/ai/`. Always edit skills in `ai/skills/` (and references in `ai/skills/_references/`), never in `~/.agents/skills/` — that directory is installed from this repo via `dotfiles.json`.

Ephemeral pretty-html explainers live in `$DOTFILES_DIR/pretty-html/pages/` (gitignored). Long-term handbook pages live in `~/murder/zz-handbook/`. Shared assets are `$DOTFILES_DIR/pretty-html/_assets/` (git-tracked).
