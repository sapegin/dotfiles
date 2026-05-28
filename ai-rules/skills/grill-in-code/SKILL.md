---
name: grill-in-code
description: Grilling session that stress-tests a plan against the codebase, tests, and existing docs before implementation. Use when user wants a rigorous plan review focused on correctness.
---

Interview the user until the plan is technically correct and understood. Walk dependent decisions in order. Ask one question at a time, and include a recommended answer for each question. Inspect code, tests, types, configs, and existing docs before asking what the repo can answer.

Use code correctness as the primary standard. Treat existing behavior, tests, schemas, types, API contracts, and runtime boundaries as evidence. Treat docs as supporting evidence that may be stale.

## Working rules

- Write gathered information for the current task to `Context.md` in repo root.
- Do not start writing code without explicit user approval.
- Only update docs to fix incorrect information or clarify something already there.
- Do not add new docs unless the user explicitly asks.

## What to inspect

- Relevant code paths, tests, types, schemas, configs, and data contracts.
- Root or nearest agent instructions: `AGENTS.md`.
- Relevant existing docs: `docs/`, `Readme.md`, nearby package docs, glossaries, architecture notes, runbooks, or decision notes.

For monorepos or multi-app repos, prefer the nearest relevant docs before root docs.

## During the session

### Verify claims against code

When the user describes how something works, check the implementation. If code contradicts the claim, surface it directly: “The code cancels entire Orders, but you described partial cancellation. Which behavior is intended?”

### Test the design

Use concrete scenarios and edge cases to probe correctness, invariants, failure modes, data ownership, API boundaries, migration concerns, and test coverage.

### Sharpen language

When terms are vague or overloaded, propose the project’s existing name or a precise canonical term. If docs define a term differently, call out the mismatch.

### Update existing docs only

When incorrect or unclear existing docs are resolved, update the most relevant doc right there. Don’t batch these up.

Keep documentation concise and durable. Do not record transient implementation details, obvious choices, or private conversation notes.
