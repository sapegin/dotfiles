# Web guides

Vendored best-practice guides for modern HTML, CSS, and client-side JavaScript.

**Source:** [modern-web-guidance](https://github.com/GoogleChrome/modern-web-guidance).

## Usage

Consulted by the [deslop](../../deslop/SKILL.md) skill when reviewing HTML, CSS, or client-side JavaScript changes — for obsolete web patterns, accessibility issues, and platform APIs that replace hand-rolled solutions.

Agents load guides progressively: read a specific file only when the diff touches that domain. Browse with:

```sh
find . -name '*.md' | sort
```

Or by ID: `<category>/<id>.md` (for example `accessibility/accessibility.md`).

Cross-references inside guides point at other guide IDs — resolve them to local files here; do not run `npx modern-web-guidance retrieve`.

## Upgrading

1. Check the [upstream changelog](https://github.com/GoogleChrome/modern-web-guidance) or diff.
2. Copy updated guides from the package or repository into this directory, preserving category folders.
3. Smoke-test by running `/deslop` on a web UI diff that should hit a changed guide.
