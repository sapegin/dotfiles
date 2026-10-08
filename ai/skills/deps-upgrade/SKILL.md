---
name: deps-upgrade
description: Upgrade npm or pnpm dependencies in a project.
disable-model-invocation: true
---

Upgrade dependencies in the current project. Do not commit or push unless the user asks.

## Detect package manager

Use one manager for the whole run. Assume a single lockfile; check npm first:

| Signal                      | Manager |
| --------------------------- | ------- |
| `package-lock.json` present | npm     |
| `pnpm-lock.yaml` present    | pnpm    |

If neither lockfile is present, read `packageManager` in `package.json` or ask.

Record Node.js version from `engines.node`, `.nvmrc`, or `.node-version`. Align `@types/node` major with that runtime when the project uses it.

## Baseline

Before changing versions:

1. Read `package.json` scripts and project `AGENTS.md` (if any) for install, test, lint, and build commands.
2. Run the closest **full** verification the repo defines (e.g. `npm test`, `pnpm test`, or the documented equivalent).
3. If baseline fails, stop and report — do not stack upgrades on a broken tree.

## Phase 1 — within semver ranges

Update lockfiles without rewriting `package.json` ranges:

```bash
npm update
# or
pnpm update
```

Monorepos: use the workspace/recursive update and outdated commands in [reference.md](reference.md).

Then re-run the same verification. If install scripts were blocked (npm `allowScripts`, etc.), fix config or approve only the packages that need it — do not skip hooks unless the user explicitly allows it.

## Phase 2 — plan remaining work

List outdated packages and group by risk:

```bash
npm outdated || true
# or
pnpm outdated || true
```

- **Low risk:** patch/minor within the same major, dev-only tools, typed packages.
- **Breaking:** major version bumps, framework migrations (Astro, React, Tailwind, TypeScript, Storybook, vitest, etc.), ecosystem sets that must move together (e.g. oxlint + oxfmt + config packages).

Present a short ordered plan for **breaking** items. Default: **one breaking upgrade (or one locked ecosystem set) per step**, verify, then continue.

## Phase 2.5 — low-risk range bumps

Apply **low risk** items from Phase 2 before breaking work:

1. Bump the minimal set of `package.json` entries to admit the target patch/minor (or use targeted install commands from [reference.md](reference.md)).
2. Install: `npm install` or `pnpm install`.
3. Re-run verification.

Default: one step for all independent low-risk packages when install stays clean; split the step if a bump triggers peer warnings or test failures.

## Phase 3 — breaking upgrades (one step at a time)

For each step:

1. Bump the minimal set of `package.json` entries (and peer-related packages if install warns).
2. Install: `npm install` or `pnpm install`.
3. Read release notes or migration guides when the major jump is non-trivial.
4. Fix **source** breakages in the repo. Prefer fixing **upstream libraries** the project owns over local overrides (redefining a dependency’s CSS/utilities, lockfile `overrides` to paper over bugs, oxlint allowlists for composable classes that should be fixed in the design system).
5. Re-run verification. Do not proceed to the next breaking bump until this step passes or the user accepts a documented exception.

Common follow-ups:

- **Explicit install** when `npm update` did not refresh pinned versions: `npm install pkg@version` / `pnpm add pkg@version`.
- **Optional deps missing after install** (e.g. native/WASM helpers): diagnose with `npm ls`; add a direct dependency only when the package manager failed to hoist an optional peer — not as a permanent substitute for fixing the upstream package.
- **Tooling vs runtime TypeScript:** if `astro check`, ESLint type-aware, or similar rejects a TypeScript major, either stay on the supported TS major or migrate to the tool’s documented replacement — do not assume “latest TS” works because `tsc` alone passes.

## Phase 4 — finish

- Run `npm outdated || true` / `pnpm outdated || true` again and note anything intentionally left behind (unsupported majors, user choice).
- Summarize: packages bumped, code/config changes, verification commands run, and follow-ups (publish upstream, CI, Dependabot).

## Guardrails

- Do not run `npm audit fix --force` or mass `--force` upgrades without explicit user approval.
- Do not change unrelated formatting or content files; if format hooks rewrite the tree, revert out-of-scope diffs.
- Workspace/monorepo: run install and scripts from the root unless `AGENTS.md` says otherwise; respect `pnpm-workspace.yaml` and per-package scripts.
- `file:` / `link:` dependencies: remind the user to publish and switch to a registry version before CI can reproduce the lockfile.

## Commands

See [reference.md](reference.md) for npm/pnpm command parity.
