System configuration files are symlinked or synced from this repository using sync-dotfiles.ts script. The sync map is in dotfiles.json. Always edit source files in this repository, never edit system files outside.

New tools are written in TypeScript and located at `src/bin/`. Each TypeScript tool should have a matching symlink in `bin/symlinks/` that points to the shared `bin/_ts` runner (example: `src/bin/j.ts` and `bin/symlinks/j` → `_ts`). Keep non-TypeScript tools as regular executable scripts in `bin/`.

Shared utility functions should have concise comments explaining their purpose.
