System configuration files are symlinked or synced from this repository using sync-dotfiles.ts script. The sync map is in dotfiles.json. Always edit source files in this repository, never edit system files outside.

New tools are written in TypeScript and located at `src/bin/` with a thin shell wrapper at `bin/` to launch them from the terminal (example: `src/bin/j.ts` and `bin/j`).
