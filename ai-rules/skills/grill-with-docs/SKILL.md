---
name: grill-with-docs
description: Grilling session that challenges a plan against the codebase and project docs, sharpens terminology, and updates conventional documentation inline as decisions crystallize. Use when user wants to stress-test a plan against documented project language and keep docs current.
---

Interview the user relentlessly about the plan until reaching shared understanding. Walk each branch of the design tree, resolve dependent decisions in order, and provide a recommended answer for each question.

Ask one question at a time, waiting for feedback before continuing. If code or docs can answer a question, inspect them first instead of asking.

## Project awareness

During codebase exploration, read the project’s conventional documentation:

- Root or nearest agent instructions: `AGENTS.md`
- General project docs: `docs/`
- Nearby package docs, such as `Readme.md`, `docs/`, or `AGENTS.md`
- Product/domain docs, glossaries, architecture notes, runbooks, or decision notes if they already exist

Typical structure:

```text
.
├── AGENTS.md
├── Readme.md
├── docs/
│   ├── glossary.md
│   ├── architecture.md
│   └── decisions.md
└── src/
```

For monorepos or multi-app repos, prefer the nearest relevant docs before root docs.

Create docs lazily, only when there is something durable to record. Prefer updating an existing relevant file. If none exists, use:

- `AGENTS.md` for agent-facing instructions, conventions, and project-specific working rules.
- `Readme.md` for any other docs.

## During the session

### Challenge documented language

When the user uses a term that conflicts with existing docs, call it out immediately. “The docs define ‘cancellation’ as X, but you seem to mean Y. Which is it?”

### Sharpen fuzzy language

When the user uses vague or overloaded terms, propose a precise canonical term. “You’re saying ‘account’. Do you mean the Customer or the User? Those are different things.”

### Discuss concrete scenarios

When domain relationships are being discussed, stress-test them with specific scenarios. Invent scenarios that probe edge cases and force the user to be precise about the boundaries between concepts.

### Cross-reference with code

When the user states how something works, check whether the code agrees. If you find a contradiction, surface it: “Your code cancels entire Orders, but you just said partial cancellation is possible — which is right?”

### Update docs inline

When a term, rule, behavior, or decision is resolved, update the most relevant doc right there. Don’t batch these up.

Keep documentation concise and durable. Do not record transient implementation details, obvious choices, or private conversation notes.

For decisions, record only the context, decision, rationale, and consequences needed by a future maintainer.
