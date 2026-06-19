---
name: review-code
description: Review frontend code changes. Use when reviewing pull requests, examining code changes, or giving feedback on correctness, simplicity, security, performance, tests, and design.
---

Review the current branch against the base branch.

Read and follow [guidelines for JavaScript/TypeScript](~/dotfiles/ai-rules/references/JavaScript.md).

When needed, load and follow the **web-search**, **web-fetch**, and **github** skills.

## Process

1. Identify the base branch and inspect the diff first.
2. Read surrounding code needed to understand changed behavior.
3. Focus on issues introduced or exposed by the change.
4. Look for reviewer-level intent mismatches: subtle behavior or product-logic changes that are not explained by comments, naming, commit messages, or nearby context.
5. Focus on issues that cannot be detected by typecheck, lint, tests, or build alone. Assume they are clear and do not run them.
6. Prefer small, clear fixes over cleverness, abstractions, or future-proofing.

Be ambitious and direct. Flag plausible risks when important, but mark uncertainty clearly. Prioritize pull request issues; mention broader refactors only when they would materially de-risk or simplify the change.

## What to look for

- **Correctness:** logic errors, off-by-one mistakes, incorrect conditionals, subtle changes in business logic or user-visible behavior, null/undefined access, stale closures, effect dependencies, mutation, async races, cleanup, hydration, missing error handlers.
- **Data and contracts:** API shapes, type drift, cache invalidation, optimistic updates, validation, parsing, serialization, feature flags, authorization, compatibility.
- **Side effects:** routing, parent/child behavior, global state, storage, analytics, timers, subscriptions, focus, scroll.
- **Security and privacy:** XSS, unsafe URLs or redirects, exposed secrets, missing permission checks, PII in logs or telemetry, risky third-party scripts.
- **Performance:** unnecessary renders, expensive render work, unstable props, excessive requests, bundle growth, images, layout thrash, leaks, missing virtualization.
- **Accessibility and UX:** semantics, labels, keyboard flow, focus, contrast, reduced motion, loading/empty/error states.
- **Maintainability:** architecture fit, local conventions, duplicate logic, confusing code, premature abstractions.
- **Scope**: prepare data or shift conditions left instead of repeating conditions downstream, accidental changes left by abandoned refactoring, unexplained behavior changes, unrelated changes.
- **Tests:** new logic paths lacking coverage, edge cases not covered by existing tests, coverage for business logic, critical UI flows, and regressions; prefer behavior-focused assertions over implementation details; avoid brittle snapshots and over-complex test code.

## Output

- Lead with findings, ordered by severity.
- Include file and line references whenever possible.
- For each finding, explain impact, trigger, and a concrete recommendation.
- Keep summaries brief and secondary.
- Do not present guesses as facts.
- If there are no findings, say so and mention remaining test gaps or risks.
