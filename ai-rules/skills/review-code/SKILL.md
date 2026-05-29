---
name: review-code
description: Performs ambitious frontend code review. Use when reviewing pull requests, examining code changes, or providing feedback on code quality. Covers correctness, simplicity, security, performance, testing, and design review.
---

Review the code changes in the current branch in comparison to the base branch.

Read [guidelines for JavaScript/TypeScript](../../references/JavaScript.md) and follow them.

## Review process

- Identify the base branch and inspect the diff before reading broader context.
- Read the surrounding code needed to understand the changed behavior.
- Focus on issues introduced or exposed by the change.
- Be ambitious and ruthless. It is better to flag a plausible non-issue than miss a real issue, provided uncertainty is stated clearly.
- Simplify aggressively. Prefer the smallest clear change over cleverness, new abstractions, or future-proofing.
- Run or recommend targeted checks when useful: typecheck, lint, unit tests, component tests, end-to-end tests, or build.
- Prioritize issues inside the pull request. Mention broader refactors only when they would dramatically simplify or de-risk the change.

## Review checklist

Look for these issues in code changes:

- **Correctness and runtime errors**: null or undefined access, stale closures, incorrect effect dependencies, state mutation, async races, missing cleanup, hydration mismatches, broken loading, empty, and error states.
- **Data and contracts**: API shape changes, type drift, cache invalidation, optimistic updates, form validation, parsing, serialization, feature flags, authorization assumptions, and backwards compatibility.
- **Side effects**: unintended behavior changes in parent or child components, routing, global state, storage, analytics, timers, subscriptions, focus, or scroll position.
- **Security and privacy**: XSS through HTML injection or unsafe URLs, exposed tokens or secrets, missing permission checks, unsafe redirects, PII in logs or telemetry, and risky third-party script usage.
- **Performance**: unnecessary renders, expensive work during render, unstable props, excessive network requests, large bundle additions, unoptimized images, layout thrashing, memory leaks, and missing virtualization for large lists.
- **Accessibility and UX**: semantic markup, labels and names, screen-reader behavior, keyboard navigation, focus management, color contrast, reduced-motion handling, responsive layout, and text overflow.
- **Design and maintainability**: alignment with existing architecture, component boundaries, local conventions, duplicate logic that can reuse existing functionality, confusing code that should be simplified or documented, premature abstractions or optimizations, and conflicts with stated requirements.
- **Scope control**: whether the change is the smallest possible fix, whether simpler data preparation would let consumers run unconditionally, whether conditions can be shifted left instead of repeated downstream, and whether abandoned refactors left accidental unrelated changes in the pull request.

### Test coverage

The change should have appropriate test coverage:

- Unit tests for business logic and low-level code.
- Integration or end-to-end tests for critical UI flows.
- Regression tests for fixed bugs and edge cases.

Verify tests cover actual requirements and user behavior. Avoid brittle snapshots and excessive branching or looping in test code.

## Feedback guidelines

- Lead with findings, ordered by severity.
- Include file and line references whenever possible.
- Explain the impact, the triggering scenario, and an actionable recommendation for each finding.
- Keep summaries brief and secondary to the findings.
- Do not present guesses as facts. If uncertain, still raise plausible risks as questions or clearly marked concerns.
- If there are no findings, say so and mention any remaining test gaps or risks.
