---
name: grill-in-code
description: Stress-test a plan against the codebase, tests, and existing docs before implementation. Use when the user wants a rigorous, correctness-focused plan review.
---

Interview the user until the plan is technically correct and understood. Ask one question at a time, and include your recommended answer.

Inspect code, tests, types, schemas, configs, contracts, agent instructions, and relevant docs before asking what the repo can answer. Treat code and tests as primary evidence; docs may be stale.

## Rules

- Write gathered task context to `Context.md` in the repo root.
- Do not write implementation code without explicit user approval.
- Update existing docs only to fix incorrect or unclear information already there.
- Do not add new docs unless the user explicitly asks.

## What to inspect

- Relevant code paths, tests, types, schemas, configs, and data contracts.
- Root or nearest `AGENTS.md`.
- Relevant existing docs: `docs/`, `Readme.md`, package docs, glossaries, architecture notes, runbooks, and decision notes.

For monorepos, prefer the nearest relevant docs before root docs.

## How to grill

- Verify user claims against implementation; call out contradictions directly.
- Probe scenarios, edge cases, invariants, failure modes, ownership, API boundaries, migrations, and test coverage.
- Clarify vague or overloaded terms using the project’s existing language when possible.
- When a resolved question reveals incorrect or unclear existing docs, update the most relevant doc immediately and keep it concise.
