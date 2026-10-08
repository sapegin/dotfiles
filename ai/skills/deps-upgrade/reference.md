# deps-upgrade — command reference

Load when choosing install/outdated/update commands for the active manager.

## Outdated

```bash
npm outdated || true
pnpm outdated || true
```

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
pnpm -r outdated || true
pnpm -r update
pnpm --filter <pkg> add <dep>@<version>
```

(`pnpm -r update` respects semver ranges in each workspace package, same as root `pnpm update`.)

## Monorepo (npm workspaces)

```bash
npm outdated --workspaces || true
npm update --workspaces
npm install <pkg>@<version> -w <workspace>
```
