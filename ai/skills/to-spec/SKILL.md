---
name: to-spec
description: Turn the current conversation into a spec file.
disable-model-invocation: true
---

Take the current conversation context and codebase understanding and produce a spec (you may know this document as a PRD). Do NOT interview the user — just synthesize what you already know.

## Process

1. Explore the repo to understand the current state of the codebase, if you haven’t already.
2. Write the spec using the template below.
3. Choose a concise subject for the filename. Replace characters unsuitable for a filename, but preserve readable words and capitalization.
4. Save the spec according to the first matching rule:
   - If the project root contains a `specs` folder, save it as `specs/Subject.md`.
   - If the project root’s parent contains a `specs` folder, save it as `../specs/Subject.md`.
   - Otherwise, save it as `~/murder/Specs/Subject.md`.

Create only the destination file, not a missing `specs` folder. Never overwrite an existing spec; if the destination exists, choose a distinct subject. Replace `Subject` in both the filename and document heading with the chosen subject.

<spec-template>

# Subject

## Business specification

Keep this section focused on user needs, business behavior, and observable outcomes. Do not include architecture, modules, APIs, schemas, file paths, or code. A stakeholder should be able to review and approve this section without reading the technical plan.

### Problem

The problem that the user is facing, from the user’s perspective. Explain who is affected, what prevents them from succeeding, and why solving it matters.

### Proposed solution

The solution from the user’s perspective. Describe the intended experience and outcomes rather than how they will be implemented.

### Business requirements

A numbered list of required capabilities, behaviors, business rules, and constraints. Make each requirement specific and observable. Include relevant edge cases and failure behavior without prescribing technical implementation.

### Success criteria

A list of measurable or directly verifiable outcomes that show the problem has been solved. Prefer user- or business-visible results over implementation milestones.

### Out of scope

A clear description of related behavior, use cases, and follow-up work that this spec does not cover.

### Open business questions

Any unresolved questions that could change the scope, behavior, or stakeholder expectations. Write `None` when there are no open questions.

## Technical plan

This section translates the approved business specification into implementation work. Technical details belong here, not in the business specification.

### Implementation steps

A numbered list of concrete steps in implementation order. Make each step clear enough for a person or agent to execute without inferring missing work. Include dependencies, required decisions, data migration or rollout work, and validation where they belong in the sequence.

### Implementation decisions

A list of implementation decisions that were made. This can include:

- The modules that will be built or modified
- The interfaces of those modules that will be modified
- Technical clarifications from the developer
- Architectural decisions
- Schema changes
- API contracts
- Specific interactions

Do NOT include specific file paths or code snippets. They may end up being outdated very quickly.

Exception: if a prototype produced a snippet that encodes a decision more precisely than prose can (state machine, reducer, schema, type shape), inline it within the relevant decision and note briefly that it came from a prototype. Trim to the decision-rich parts — not a working demo, just the important bits.

### Testing decisions

A list of testing decisions that were made. Include:

- Which business requirements and success criteria each test verifies
- A description of what makes a good test (only test external behavior, not implementation details)
- Which modules will be tested
- Prior art for the tests (i.e. similar types of tests in the codebase)

### Technical risks and open questions

Known implementation risks, trade-offs, assumptions, and unresolved technical decisions. Write `None` when there are none.

</spec-template>
