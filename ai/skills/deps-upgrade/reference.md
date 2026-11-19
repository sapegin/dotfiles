# deps-upgrade — command reference

Load when choosing install/outdated/update commands for the active manager.

## Outdated

```bash
~/dotfiles/bin/deps-context
```

The helper queries the root and each workspace separately, preserves package-manager diagnostics, and accepts the expected outdated-package exit status only with valid package data. If the user selected a manager after automatic detection failed, use `npm outdated --json --long` or `pnpm outdated --format json` directly and inspect both the exit status and structured output.

## Update within existing ranges (lockfile refresh)

```bash
npm update
pnpm update
```

(`pnpm update` without patterns updates within semver ranges declared in `package.json`.)

## Targeted version bump

```bash
npm install [-D] package@version
pnpm add [-D] package@version
```

## Frozen / CI-like install (after lockfile changes)

```bash
npm ci
pnpm install --frozen-lockfile
```

## Monorepo (pnpm)

```bash
pnpm -r update
pnpm --filter <pkg> add <dep>@<version>
```

(`pnpm -r update` respects semver ranges in each workspace package, same as root `pnpm update`.)

## Monorepo (npm workspaces)

```bash
npm update --workspaces --include-workspace-root
npm install <pkg>@<version> -w <workspace>
```
