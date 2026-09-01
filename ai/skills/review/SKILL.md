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

Pass the argument exactly as supplied to `branch-diff`, or run `branch-diff` without one. Treat its output as the review starting point; if it fails, ask the user to clarify.

## Process

1. Resolve the review scope according to **Target**. Do not add a scope preamble to the first finding.
2. Establish intended behavior from the request, issue, commit or pull request description, relevant callers, tests, types, schemas, designs, and documentation. Do not infer requirements solely from the changed implementation.
3. Compare the diff against the specification and check explicitly for: requirements that are missing or only partially implemented; behavior introduced by the diff that the specification did not request (scope creep); and requirements that appear implemented but whose implementation is incorrect. Quote the relevant specification line for every such finding.
4. Inspect the selected file or complete changeset and the affected system. Include relevant unchanged source, tests, dependencies, generated files, configuration, documentation, agent skills, migrations, assets, and public contracts. Follow the design as far as needed for a sound review without auditing unrelated systems.
5. Trace relevant values and behavior through callers, consumers, state owners, API boundaries, persistence, and side effects. Look for intent mismatches, unexplained product or business-logic changes, misplaced responsibilities, and poor boundaries.
6. Report material issues throughout the affected system, including issues in unchanged files that the target exposes or that a coherent design improvement should address. Judge the code under review, not whether it is committed or tracked. The only version-control finding allowed is incorrect `.gitignore` coverage.
7. Review beyond what type-checking, linting, tests, and builds can detect. Run focused checks when they can confirm or disprove a suspected finding; otherwise mark unresolved uncertainty clearly.
8. When a finding depends on platform, framework, or library behavior, verify it against the repository’s installed version and authoritative documentation or source. Cite the evidence and mark unresolved uncertainty.
9. Try to disprove each finding by checking callers, guards, tests, types, and runtime semantics. Remove findings contradicted by repository evidence.
10. Recommend the best coherent design with scope proportionate to its demonstrated benefit. Prefer simplification over cleverness and evidence over speculative future-proofing, but do not avoid API changes, multi-file refactors, or substantial redesign merely because they are ambitious. Do not manufacture findings to appear useful.
11. Present exactly one finding at a time using **Output format**, ordered by severity. Then wait for the user to choose whether to fix or ignore it, or give other instructions.
12. Interpret `F` (case-insensitive) as approval of the recommended fix and `I` (case-insensitive) as ignore. If the user approves a fix or gives replacement instructions, make only that approved change and validate it before continuing.
13. After handling the user’s response, continue with the next finding using the same one-at-a-time process. If no material findings remain, use the exact no-findings output rather than inventing one.

Flag plausible risks when important, but provide a concrete trigger and mark uncertainty clearly. Preferences are valid when they materially improve clarity or match explicit user preferences or repository conventions; label them as suggestions rather than defects. Recommend broader refactors when they materially improve the affected system’s correctness, clarity, usability, or maintainability.

## Output format

Use this exact structure for every finding, replacing only the placeholders:

```md
## {finding number}. {short finding title} ({severity})

Location: {comma-separated file paths with line or line-range references}

{focused explanation of the defect with concise evidence and optional fenced code, diff blocks, or quote of the specification line that establishes the expected behavior or scope}

Recommendation: {best coherent recommendation with scope proportionate to its benefit}

(F)ix, (i)gnore, or tell what to do.
```

Use this exact output when no material findings remain:

```text
Right. Nothing else worth touching.
```

Formatting rules:

- Ordered finding by severity: blocker, high, medium, low, then suggestion.
- Number findings consecutively from 1 for the review session.
- Format the title as a level-three Markdown heading so it renders bold and visually distinct. Keep it factual and specific.
- Use the field names `Location` and `Recommendation` exactly as shown. Format labels in bold.
- Use repository-relative paths and precise line references. Join line ranges with an hyphen, for example `src/file.ts:10-14`.
- Keep the explanation focused on one issue. State the observed behavior, evidence, and practical consequence; do not pad it with a review summary or generic praise.
- Do not use second-person pronouns or attribute the code, decisions, or defects to the user. Refer to the code, change, implementation, or named symbols instead.
- Offer one recommendation only. Prefer the best coherent design over the smallest patch, and make its scope proportionate to the demonstrated benefit.
- Do not add headings, preambles, conclusions, or choice text outside the template.
- State confidence only when uncertainty is material, and do not present guesses as facts.
- Keep unrelated problems in separate findings. Do not pad the findings with praise, file summaries, generic observations, or hypothetical failures without a plausible trigger.

## Focus areas

The review target may be application code, configuration, documentation, agent skills, CI definitions, or other repository artifacts. Load detailed checklists only for categories the changes touch.

### Always apply

- **Requirements and intent:** Verify that the affected system satisfies the request, specification, product intent, and relevant business rules. Find missing, partial, incorrect, or unrequested behavior, and question implementations that satisfy the literal patch while solving the wrong problem.
- **Scope discipline:** Flag unrelated changes, abandoned-refactor debris, unexplained behavior changes, generated-file churn, accidental public exports, and conditions or data preparation repeated downstream when they belong at a clear boundary. Treat `AGENTS.md` changes that document conventions or durable guidance relevant to the changed system as related; do not require a separate change merely because the guidance applies to future work.

### Category checklists

Load only the references needed for the changes under review:

- **Backend and data** — server logic, APIs, persistence, Node.js runtime, or data mutation: read [backend](references/backend.md). For React Server Components, Server Actions, or Next.js route handlers, also read the [React best practices index](../_references/react-best-practices/Index.md), then load only the specific linked rules relevant to the change.
- **Frontend and UI** — user interfaces, rendering, forms, client behavior, or accessibility across flows: read [frontend](references/frontend.md). For HTML, CSS, or client-side JavaScript changes, also read the [modern web guidance index](../_references/modern-web-guidance/Index.md). For React components, Next.js pages, or client rendering changes, also read the [React best practices index](../_references/react-best-practices/Index.md). Load only the specific linked guides and rules relevant to the change.
- **Security** — auth, trust boundaries, secrets, user input, or production configuration: read [security](references/security.md).
- **Architecture and maintainability** — module boundaries, public contracts, duplication, or system design spanning multiple areas: read [architecture](references/architecture.md).
- **Tests** — new behavior, modified test suites, or coverage gaps: read [tests](references/tests.md).
- **Dependencies and build** — manifests, lockfiles, CI, packaging, rollout, or compatibility: read [dependencies](references/dependencies.md).
- **Configuration and documentation** — config files, docs, or tooling without application code: read [nocode](references/nocode.md).
- **Agent skills and prompts** — skill or prompt changes: read [agent-skills](references/agent-skills.md).

When a changeset spans categories, load each relevant reference.

## Guardrails

- Do not report uncommitted or untracked files as defects. Review the code on disk or in the diff, not git working-tree status. Do not recommend `git add`, commits, or other version-control housekeeping unless `.gitignore` is wrong: files that should be ignored but are not, or should be tracked but are wrongly ignored.
- Security findings: reference secret type and location only; never reproduce secret values.
- Keep findings relevant to the affected system, but follow that system beyond changed files whenever evidence or a coherent solution requires it.
- Do not spend findings on syntax-level cleanup, stylistic nits, or local polish unless it exposes a broader correctness or design issue.
- Recommendations may change behavior, APIs, modules, and architecture when the user-approved goal requires it. Keep ambition evidence-based and scope proportionate to the benefit.
