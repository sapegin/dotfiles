---
name: pretty-html
description: Create and update standalone HTML documents with syntax highlighting, diagrams, and live demos.
disable-model-invocation: true
---

Create lightweight HTML pages backed by shared assets in `$DOTFILES_DIR/pretty-html/_assets/`. Pages hold prose and semantic markup only; styling and interactivity come from shared assets.

## Paths

Shared assets live in `$DOTFILES_DIR/pretty-html/_assets/` (git-tracked). Handbook pages in the vault use a synced copy at `~/murder/zz-handbook/_assets/` — run dotfiles sync after changing assets (see Sync).

| Intent | Page location | Git |
| --- | --- | --- |
| Durable handbook reference | `~/murder/zz-handbook/<topic>/` — use the **teach** skill | Obsidian vault |
| Temporary explainer, demo, one-off | `$DOTFILES_DIR/pretty-html/pages/` | Ignored |
| Golden reference | `$DOTFILES_DIR/pretty-html/example.html` | Tracked |

Link only `doc.css` (it `@import`s `squirrelsong.css`) and `components.js` (lazy-loads highlight.js and Mermaid from `_assets/lib/`). Adjust the `_assets/` prefix by depth:

| Page location | Stylesheet | Components |
| --- | --- | --- |
| `pretty-html/example.html` | `_assets/doc.css` | `_assets/components.js` |
| `pretty-html/pages/<doc>.html` | `../_assets/doc.css` | `../_assets/components.js` |
| `zz-handbook/<topic>/<doc>.html` | `../_assets/doc.css` | `../_assets/components.js` |

## Page template

Copy from [example.html](../../../pretty-html/example.html). Every page needs:

1. **Theme bootstrap** (inline, before CSS) — one line, sets `.light` or `.dark` on `<html>` from `prefers-color-scheme` at load time; no toggle, no change listener.
2. **One stylesheet** — `doc.css` (imports Squirrelsong).
3. **One script at end of `<body>`** — `components.js` only (classic script, not `type="module"` — required for reliable `file://` pages). It lazy-loads highlight.js and Mermaid.
4. **`<main>`** — main content wrapper.

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1"
    />
    <title>Layout — CSS</title>
    <script>
      document.documentElement.classList.add(
        matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
      );
    </script>
    <link rel="stylesheet" href="../_assets/doc.css" />
  </head>
  <body>
    <main>
      <!-- content -->
    </main>
    <script src="../_assets/components.js"></script>
  </body>
</html>
```

## Components

Light DOM custom elements — no Shadow DOM, so Squirrelsong CSS variables apply.

### `<ss-callout variant="…">`

Aside boxes for facts easy to forget. Variants: `remember`, `gotcha`, `prefer`, `avoid`, `info`. Pure CSS labels — put content directly inside.

```html
<ss-callout variant="remember">
  <code>place-items</code> centers on both axes in a grid container.
</ss-callout>
```

### `<ss-code language="…">`

Raw source text; highlight.js loads lazily on first `<ss-code>`.

```html
<ss-code language="css">
  .box { display: grid; place-items: center; }
</ss-code>
```

Do not hand-write `<pre class="hljs">` markup.

### `<ss-diagram>`

Mermaid source as text content; rendered at runtime on first diagram.

```html
<ss-diagram> flowchart LR A --> B --> C </ss-diagram>
```

### `<ss-demo>`

Live preview in a sandboxed iframe (`allow-scripts` only). Put HTML/CSS/JS as **child elements** — not escaped text. The component reads `innerHTML`, not `textContent`.

```html
<ss-demo>
  <style>
    .box {
      color: rebeccapurple;
    }
  </style>
  <div class="box">Hello</div>
</ss-demo>
```

### `<ss-resources>`

Further-reading section. Wrap a `<ul>` of external links inside.

```html
<ss-resources>
  <ul>
    <li><a href="https://developer.mozilla.org/…">MDN: …</a></li>
  </ul>
</ss-resources>
```

Prefer official or high-trust sources (MDN, specs, vendor docs).

## Authoring rules

- **Glorified Markdown** — HTML carries text and semantic markup only. No inline `<script>` in authored content except the one-line theme bootstrap in `<head>`. No pre-rendered SVG, no duplicated library code.
- **Reuse components** — read `$DOTFILES_DIR/pretty-html/_assets/` before inventing new patterns. Add reusable widgets to `components.js` and styles to `doc.css`.
- **Do not edit** `squirrelsong.css` — it syncs from `$THEMES_DIR/CSS/squirrelsong.css`.
- **Vendored libs** live in `_assets/lib/` (highlight.js, mermaid). Pin new versions there when upgrading und update `VERSIONS` file.

## After writing or updating a page

Open it in the default browser:

```bash
open /path/to/page.html
```

## Sync

Run dotfiles sync after changing `_assets/`. Never symlink into `~/murder` (iCloud).

## Related skills

The **teach** skill uses pretty-html conventions when writing handbook pages.
