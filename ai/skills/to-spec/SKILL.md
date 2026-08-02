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
4. If the project root contains a `specs` folder, save the spec as `specs/the-subject.md`. Otherwise, save it as `~/murder/Specs/The subject.md`.

Create only the destination file, not a missing `specs` folder. Never overwrite an existing spec; if the destination exists, choose a distinct subject. Replace `Subject` in both the filename and document heading with the chosen subject.

<spec-template>

# Subject

## Business specification

Include this entire section only when the work changes user-facing behavior or involves business decisions that nontechnical stakeholders should review. Omit the heading and all of its subsections for purely technical work.

Keep this section brief. It is an overview for approval, not the technical plan translated into nontechnical language. Include only the most significant outcomes, constraints, trade-offs, scope boundaries, and unresolved questions — especially matters a stakeholder may object to or decide differently. Do not include architecture, modules, APIs, schemas, file paths, code, implementation steps, or exhaustive edge cases.

### Overview

Summarize the problem, affected users, proposed outcome, and why it matters in a few short paragraphs.

### Decisions for stakeholder review

A short numbered list of consequential behavior, business rules, constraints, trade-offs, or scope boundaries that require stakeholder agreement. Omit this subsection when the overview contains everything stakeholders need to review.

### Open business questions

Only unresolved questions that could materially change the scope, user experience, or stakeholder expectations. Omit this subsection when there are none.

## Technical plan

Describe the implementation work. Technical details belong here, not in the business specification.

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

- Which intended behaviors and outcomes each test verifies
- A description of what makes a good test (only test external behavior, not implementation details)
- Which modules will be tested
- Prior art for the tests (i.e. similar types of tests in the codebase)

### Technical risks and open questions

Known implementation risks, trade-offs, assumptions, and unresolved technical decisions. Write `None` when there are none.

</spec-template>
