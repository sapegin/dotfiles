---
name: deslop
description: Review a diff for local code quality and AI-generated slop, then automatically apply safe, minimal cleanups after interactive review.
disable-model-invocation: true
---

Check the requested target or current changes for AI-generated slop.

## Target

Accept zero or one argument:

```text
/skill:deslop [<file-path> | <commit-sha>]
```

Read and follow [development workflow setup](../_references/development-workflow.md) for target resolution, intended behavior, prior decisions, and verification evidence.

## Process

1. Establish context according to **Target**.
2. Inspect the selected file or diff and enough surrounding context to understand it.
3. Focus on local defects and polish within the selected scope. For a changeset, prioritize issues introduced or exposed by the change.
4. Defer issues eligible for **Final automatic cleanup** to that pass. Present other findings exactly one at a time using **Output format**. Then wait for the user to choose a fix, ignore it, or give other instructions.
5. Interpret `F` (case-insensitive) as approval of the recommended fix and `I` (case-insensitive) as ignore. If the user approves a fix or gives replacement instructions, make only that approved change and validate it before continuing.
6. After handling the user’s response, continue with the next finding using the same one-at-a-time process. When no unhandled findings requiring approval remain, run **Final automatic cleanup** before completing the review.

## Final automatic cleanup

Recheck the selected scope, including review edits, for small, unambiguous cleanups such as unused exports, dead code, and pass-through wrappers. Apply them in one batch without asking only when repository evidence confirms unchanged behavior, public contracts, external consumers, and framework conventions. Preserve ignored findings and user decisions; return uncertain or substantive issues to interactive review.

Validate the batch, inspect the diff for regressions or newly unused code, and fix cleanup-caused failures. If cleanup changed files, summarize edits and verification, including blocked or unavailable checks.

## Output format

Use this exact structure for every finding, replacing only the placeholders:

```md
**{finding number}. {short finding title}**

{comma-separated file paths with line or line-range references}

{focused explanation of one issue, its practical consequence, and concise evidence; optional fenced code or diff blocks}

**{smallest viable correction}**

(F)ix, (i)gnore, or tell what to do.
```

Use this exact output after final automatic cleanup when no unhandled findings remain and that pass changed no files:

```text
Huzzah! Nothing else warrants attention.
```

Formatting rules:

- Number findings consecutively from 1 for the review session.
- Keep finding titles factual and specific; do not add a severity label.
- Use repository-relative paths and precise line references. Join line ranges with an hyphen, for example `src/file.ts:10-14`.
- Do not use second-person pronouns or attribute the code, decisions, or defects to the user. Refer to the code, change, implementation, or named symbols instead.
- For interactive findings, do not add headings, preambles, conclusions, or choice text outside the template.

## Focus areas

The review target may be application code, configuration, documentation, agent skills, CI definitions, or other repository artifacts.

When category references are loaded for embedded code in Markdown articles or documentation, treat each fenced or inline example as the review target. Apply the same criteria to the example and its stated context; do not require a diff or repository changeset.

### Always apply

- **Unrequested scope expansion:** Unrelated refactors, speculative features, extra exports, new configuration, generated-file churn, unexplained lockfile changes, and formatting changes not produced or required by the repository formatter.
- **Invented assumptions:** Fabricated API fields, environment variables, routes, file formats, error shapes, library behavior, config keys, or documented steps unsupported by repository evidence.
- **Repository inconsistency:** Misleading names, formatting, or implementation patterns that conflict with explicit user preferences or nearby established conventions.

### Category checklists

Choose category checklists from the paths and extensions in the review target. Load each matching reference once.

- **Code quality** — structure, dead code, completeness, clarity: read [code-quality](references/code-quality.md).
- **Clean code** — From the dominant language in the review target, load exactly one guide:
  - `.swift` → [Swift](../_references/washing-code/swift.md)
  - `.py` → [Python](../_references/washing-code/python.md)
  - `.js`, `.mjs`, `.jsx`, `.ts`, or `.tsx` → [JavaScript/TypeScript](../_references/washing-code/javascript.md)
  - any other language → [other languages](../_references/washing-code/other-languages.md)
- **Web frontend** — HTML, CSS, client-side JavaScript/TypeScript, browser DOM, or React/Next.js: read [frontend](references/frontend.md). For HTML, CSS, or client-side JavaScript changes, also read the [modern web guidance index](../_references/modern-web-guidance/Index.md). For React components, Next.js pages, or client rendering changes, also read the [React best practices index](../_references/react-best-practices/Index.md). Load only the specific linked guides and rules relevant to the change.
- **Desktop and native UI** — AppKit, SwiftUI, UIKit, or other native window and control chrome: read [desktop UI](references/desktop.md). When the target includes Swift UI code (`.swift` with AppKit or SwiftUI), also read [Swift UI](references/swift-ui.md).
- **Backend logic** — backend changes: read [backend](references/backend.md). For React Server Components, Server Actions, or Next.js route handlers, also read the [React best practices index](../_references/react-best-practices/Index.md), then load only the specific linked rules relevant to the change.
- **Security** — unsafe interpolation, secrets, path handling: read [security](references/security.md).
- **Tests** — hollow or meaningless tests: read [tests](references/tests.md).
- **Dependencies** — duplicate deps or unnecessary packages: read [dependencies](references/dependencies.md).
- **Configuration and documentation** — config, docs, or tooling without application code: read [nocode](references/nocode.md).
- **Agent skills and prompts** — skill or prompt changes: read [agent-skills](references/agent-skills.md).

## Guardrails

- Do not report uncommitted or untracked files as slop. Review the code on disk or in the diff, not git working-tree status. The only version-control finding allowed is incorrect `.gitignore` coverage: files that should be ignored but are not, or should be tracked but are wrongly ignored.
- Keep behavior unchanged unless fixing a clear bug.
- Do not recommend changes to public contracts, module responsibilities, ownership, data flow, or system architecture.
- Explicit user preferences, local conventions, correctness, and clarity override generic style rules. Flag intentional platform or project conventions only when the implementation adds risk beyond the convention.
- Do not abstract incidental similarity. Consolidate repetition in the target only when it clearly represents one concept or calculation.
- If you remove something, verify it’s truly unused first.
- Security findings: reference secret type and location only; never copy secret values.
