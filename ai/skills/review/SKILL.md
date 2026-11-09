---
name: review
description: Review a diff for requirements, behavior, APIs, architecture, and maintainability across code, configuration, documentation and agent artifacts.
disable-model-invocation: true
---

Review the requested target or current changes and give feedback.

When needed, use the `web_search` and `web_fetch` tools, and load and follow the [github](../github/SKILL.md) skill.

## Target

Accept zero or one argument:

```text
/skill:review [<file-path> | <commit-sha>]
```

Read and follow [development workflow setup](../_references/development-workflow.md) for target resolution, requirements, prior decisions, and verification evidence. Use any specification or ticket supplied earlier in the conversation as explicit requirements.

## Process

1. Establish context according to **Target**.
2. Include relevant designs when establishing intended behavior.
3. Check the affected system against the requirements, product intent, and business rules, including missing, partial, incorrect, or untested behavior. Quote the relevant specification line for each specification finding.
4. Inspect the selected file or complete changeset and the affected system, including relevant unchanged code, artifacts, and public contracts. Follow the design as far as needed without auditing unrelated systems.
5. Trace relevant values and behavior through callers, consumers, state owners, API boundaries, persistence, and side effects. Look for intent mismatches, unexplained product or business-logic changes, misplaced responsibilities, and poor boundaries.
6. Report material issues, including those in unchanged files that the target exposes or that a coherent design improvement should address.
7. Review beyond what type-checking, linting, tests, and builds can detect. Run focused checks when they can confirm or disprove a suspected finding.
8. When a finding depends on platform, framework, or library behavior, verify it against the repository’s installed version and authoritative documentation or source. Cite the evidence.
9. Try to disprove each finding by checking callers, guards, tests, types, and runtime semantics. Remove findings contradicted by repository evidence.
10. Recommend the best coherent design with scope proportionate to its demonstrated benefit. Prefer simplification over cleverness and speculative future-proofing. Behavior or API changes, multi-file refactors, and substantial redesign are valid when warranted by the user-approved goal.
11. Present exactly one finding at a time using **Output format**. Then wait for the user to choose whether to fix or ignore it, or give other instructions.
12. Interpret `F` (case-insensitive) as approval of the recommended fix and `I` (case-insensitive) as ignore. If the user approves a fix or gives replacement instructions, make only that approved change and validate it before continuing.
13. After handling the user’s response, continue with the next finding using the same one-at-a-time process. If no unhandled findings remain, use the exact no-findings output.

Preferences are valid when they materially improve clarity or match explicit user preferences or repository conventions; label them as suggestions rather than defects.

## Output format

Use this exact structure for every finding, replacing only the placeholders:

```md
### {finding number}. {short finding title} ({severity})

{comma-separated file paths with line or line-range references}

{focused explanation of one issue, its practical consequence, and concise evidence; optional fenced code, diff blocks, or specification quotes}

**{best coherent recommendation with scope proportionate to its benefit}**

(F)ix, (i)gnore, or tell what to do.
```

Use this exact output when no unhandled findings remain:

```text
Huzzah! Nothing else warrants attention.
```

Formatting rules:

- Order findings by severity: blocker, high, medium, low, then suggestion.
- Number findings consecutively from 1 for the review session.
- Keep finding titles factual and specific.
- Use repository-relative paths and precise line references. Join line ranges with an hyphen, for example `src/file.ts:10-14`.
- Do not use second-person pronouns or attribute the code, decisions, or defects to the user. Refer to the code, change, implementation, or named symbols instead.
- Do not add headings, preambles, conclusions, or choice text outside the template.
- State material uncertainty explicitly. Report risks only with a concrete trigger; omit praise, file summaries, and generic observations.

## Focus areas

The review target may be application code, configuration, documentation, agent skills, CI definitions, or other repository artifacts.

### Category checklists

Choose category checklists from the paths and extensions in the review target. Load each matching reference once.

- **Backend and data** — server logic, APIs, persistence, Node.js runtime, or data mutation: read [backend](references/backend.md). For React Server Components, Server Actions, or Next.js route handlers, also read the [React best practices index](../_references/react-best-practices/Index.md), then load only the specific linked rules relevant to the change.
- **Web frontend** — HTML, CSS, client-side JavaScript/TypeScript, browser DOM, or React/Next.js UI: read [frontend](references/frontend.md). For HTML, CSS, or client-side JavaScript changes, also read the [modern web guidance index](../_references/modern-web-guidance/Index.md). For React components, Next.js pages, or client rendering changes, also read the [React best practices index](../_references/react-best-practices/Index.md). Load only the specific linked guides and rules relevant to the change.
- **Desktop and native UI** — AppKit, SwiftUI, UIKit, or other native window and control chrome: read [desktop UI](references/desktop.md). When the target includes Swift UI code (`.swift` with AppKit or SwiftUI), also read [Swift UI](references/swift-ui.md).
- **Security** — auth, trust boundaries, secrets, user input, or production configuration: read [security](references/security.md).
- **Architecture and maintainability** — module boundaries, public contracts, duplication, or system design spanning multiple areas: read [architecture](references/architecture.md).
- **Tests** — new behavior, modified test suites, or coverage gaps: read [tests](references/tests.md).
- **Dependencies and build** — manifests, lockfiles, CI, packaging, rollout, or compatibility: read [dependencies](references/dependencies.md).
- **Configuration and documentation** — config files, docs, or tooling without application code: read [nocode](references/nocode.md).
- **Agent skills and prompts** — skill or prompt changes: read [agent-skills](references/agent-skills.md).

## Guardrails

- Do not report uncommitted or untracked files as defects. Review the code on disk or in the diff, not git working-tree status. Do not recommend `git add`, commits, or other version-control housekeeping unless `.gitignore` is wrong: files that should be ignored but are not, or should be tracked but are wrongly ignored.
- Security findings: reference secret type and location only; never reproduce secret values.
- Do not spend findings on syntax-level cleanup, stylistic nits, or local polish unless it exposes a broader correctness or design issue.
