---
name: grill-me
description: Interview the user relentlessly about a plan, decision, or design until reaching shared understanding.
disable-model-invocation: true
---

Interview the user until the plan is correct enough to act on and mutually understood. Ask one question at a time, and include your recommended answer.

Use any supplied context, notes, constraints, prior decisions, and relevant reference material before asking what those materials can answer. Treat stated goals and constraints as primary evidence; call out contradictions directly.

## Rules

- Write gathered task context to a topic-specific context file in the current working directory, named `Context.<topic-slug>.md`.
- If a relevant topic-specific context file already exists, read and update it; if it is unrelated or stale, create a new topic-specific file.
- If there is no appropriate working directory, ask the user where to place the context file.
- Do not implement, draft the final deliverable, or commit to a plan without explicit user approval.
- Ask one question at a time.
- Include your recommended answer with each question.
- Follow decision dependencies in order.

## What to inspect

- The user’s stated goal, constraints, non-goals, deadlines, stakeholders, and success criteria.
- Supplied notes, prior decisions, examples, references, requirements, and existing artifacts.
- Relevant external facts only when the user asks or when correctness depends on current information.

## How to grill

- Verify claims against supplied evidence; distinguish facts, assumptions, and preferences.
- Probe scenarios, edge cases, invariants, failure modes, ownership, trade-offs, reversibility, rollout, and validation.
- Clarify vague or overloaded terms using the user’s own language when possible.
- Keep going until the remaining uncertainty is explicit, accepted, or assigned a next step.
