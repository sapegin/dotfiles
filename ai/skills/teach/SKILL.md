---
name: teach
description: Teach user something, add or update topics in the personal handbook.
disable-model-invocation: true
argument-hint: What would you like to learn about?
---

The user wants handbook/cookbook knowledge captured as durable HTML. The handbook is the memory and a self-writing book.

Handbook root in Obsidian Vault: `~/murder/zz-handbook/`

Read and follow the **pretty-html** skill for every HTML page. When you need current official documentation, load and follow **web-search** and **web-fetch** skills.

## Tone

<persona name="raccoon">
Write in Artem Sapegin’s voice: candid, practical, conversational, and grounded in concrete experience. Preserve the intended meaning and never invent personal experiences, opinions, or biographical details.

Read and follow the [English writing style guide](../_references/Writing.md).
</persona>

Optimize for a reader who forgets easy details: use `<ss-callout variant="remember">`, `gotcha`, `prefer`, and `avoid` liberally when something is counter-intuitive or easy to misremember. Prefer repeating a key fact in a callout rather than burying it in prose.

## Handbook layout

```text
~/murder/zz-handbook/
  _index.yaml          # routing map — maintain on every write
  glossary.html        # global conceptual glossary
  _assets/             # synced from dotfiles — do not author here
  <topic>/             # lowercase slug: css, typescript, git
    index.html         # topic hub — create with new topics
    <doc>.html         # handbook pages: layout.html, grid.html
```

Never symlink into `~/murder`. Never edit `_assets/` in the vault — change `$DOTFILES_DIR/pretty-html/_assets/` and run dotfiles sync.

## Workflow

1. **Parse the question** — infer topic slug (e.g. `css`) and subject (e.g. centering).
2. **Read `_index.yaml`** — list topic folders and skim matching documents (titles, keywords, headings).
3. **Route** — decide before creating anything:
   - **Extend a section** in an existing doc when the subject belongs to the same subtopic (centering → `css/layout.html`, not `centering.html`).
   - **New doc** only when someone would send a direct link to just that topic (`container-queries.html`, not `grid-template-areas.html`).
   - **New topic folder** when the domain is new — add `<topic>/index.html` hub linking its docs.
4. **Gather sources** — prefer MDN, specifications, and official vendor docs. Cite them in `<ss-resources>` and inline where claims need backing. Do not trust parametric knowledge alone for factual claims.
5. **Write or update HTML** — follow **pretty-html** skill. Use `<ss-code>`, `<ss-demo>`, `<ss-diagram>`, `<ss-callout>`, and `<ss-resources>` as appropriate.
6. **Update `_index.yaml`** — add or refresh keywords, titles, and file paths.
7. **Update `glossary.html`** when the question introduces a **cross-cutting concept** (e.g. pure function, polymorphism, closure). Do **not** add syntax, API names, or properties (`margin: auto`, `place-items`).
8. **Open the page**:

```bash
open ~/murder/zz-handbook/<topic>/<doc>.html
```

Tell the user what was created or updated and invite follow-up questions on the same topic.

## `_index.yaml` format

```yaml
css:
  layout:
    file: css/layout.html
    title: Layout
    keywords:
      [centering, flexbox, alignment, place-items, margin-auto]
  grid:
    file: css/grid.html
    title: Grid
    keywords: [grid, fr, gap, template-areas]
```

- Topic keys: lowercase slugs matching folder names.
- Document keys: lowercase slug matching filename without `.html`.
- `keywords`: search terms for routing future `/teach` requests — include synonyms.

## Document structure

Each handbook page is scannable reference written in raccoon voice, not a sequential lesson:

1. Breadcrumbs before the heading: `Handbook / Topic`, linking to the root index and topic hub.
2. Short intro — what this doc covers.
3. Sections (`<h2>`) per technique or subtopic.
4. Within a section: explanation → `<ss-code>` or `<ss-demo>` → callout if easy to forget → optional diagram.
5. End with `<ss-resources>` for further reading.

When updating an existing doc, merge into the right section; do not duplicate content elsewhere in the file.

## Glossary

`glossary.html` uses the same **pretty-html** shell. Each term: `<h2 id="term-slug">`, definition in raccoon voice, links to handbook docs that use the term, optional external link.

Link from docs with a normal anchor: `<a href="../glossary.html#pure-function">pure function</a>` (adjust relative path by depth).

## Topic hub

When creating a new topic, add `<topic>/index.html` — breadcrumbs (`Handbook / Topic`, with the topic marked as the current page), title, one-line description, and an unordered list linking to each doc. The root `index.html` links all topic hubs and the glossary.

## Guardrails

- No mission document, learning records, lessons, spaced repetition, or quizzes.
- No Markdown stubs for Obsidian — HTML is canonical.
- Do not create `_assets/` copies or duplicate `components.js` / CSS into topic folders.
- If the question is ambiguous between two existing docs, read both and pick the better home; mention the choice briefly to the user.
