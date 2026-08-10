# TypeScript CLI tools

Ecosystem context: read [raccoonarium.md](../ai/raccoonarium.md).

New tools live in `./bin/`. Each gets a symlink in `../bin/symlinks/` pointing at `../bin/_ts` (example: `src/bin/j.ts` + `bin/symlinks/j` → `_ts`). Non-TypeScript tools stay as executable scripts in `../bin/`.

Put **generic reusable** logic in `./util/`; name modules by **topic**, not by script name (`git.ts`, `files.ts`, `tui.ts`). Script-specific orchestration stays in `./bin/` — export a typed function and wire the CLI at the bottom:

```typescript
const OPTIONS = [
  { name: 'days', type: 'number', default: 10, min: 1 }
] as const;

export type Options = ParsedArgs<typeof OPTIONS>;

export function gitStandup(options: Options): void {
  /* … */
}

await run(import.meta.url, () => gitStandup(parseArgs(OPTIONS)));
```

If there are no arguments, set `OPTIONS = [] as const`; `parseArgs()` shows help on empty argv and on `--help`.

Use `{ name: 'args', rest: true }` to collect remaining positional arguments after any fixed positionals. `rest` implies `positional`; the value is always a `string[]`, empty when no arguments match.

`run()` no-ops on import when `entry` is set, so tests can import `./bin/foo.ts` safely. It also turns spawn `ENOENT` errors into `{command} is not installed` before exiting. Test exported functions with typed options; use subprocess for end-to-end CLI checks (see `./bin/git-standup.test.ts`).

For expected subprocess failures, forward stderr unchanged; add context only when stderr is not actionable. Let unexpected errors propagate.
