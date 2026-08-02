# TypeScript CLI tools

Ecosystem context: read [raccoonarium.md](../ai/raccoonarium.md).

New tools live in `./bin/`. Each gets a symlink in `../bin/symlinks/` pointing at `../bin/_ts` (example: `src/bin/j.ts` + `bin/symlinks/j` → `_ts`). Non-TypeScript tools stay as executable scripts in `../bin/`.

Put testable logic in `./util/`; name modules by domain (`files.ts`, `git.ts`, `tui.ts`) with JSDoc on shared functions. Do not export functions from `./bin/` scripts or add test-environment guards to `main()` — test via `./util/` or subprocess (see `./bin/branch-diff.test.ts`).

For expected subprocess failures, forward stderr unchanged; add context only when stderr is not actionable. Let unexpected errors propagate.
