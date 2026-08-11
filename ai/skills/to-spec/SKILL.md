---
name: to-spec
description: Turn the current conversation into a spec file.
disable-model-invocation: true
---

Take the current conversation context and codebase understanding and produce a spec (you may know this document as a PRD). Do NOT interview the user — just synthesize what you already know. Do not invent requirements, affected users, motives, decisions, or constraints. Identify material missing information as unresolved in the appropriate section, and omit unsupported optional content.

## Process

1. If a relevant `Context.md` exists in the current working directory, read it as working material. Treat the conversation as authoritative when they differ.
2. Explore the repo to understand the current state of the codebase, if you haven’t already.
3. Write the spec using the template below.
4. Choose a concise `Subject` for the filename and document heading.
5. If the project root contains a `specs` folder, save the spec as `specs/<subject-slug>.md`, where `<subject-slug>` is the lowercase kebab-case form of `Subject`. Otherwise, save it as `~/murder/Specs/<Subject>.md`, replacing characters unsuitable for a filename while preserving readable words and capitalization.

Create only the destination file, not a missing `specs` folder. Never overwrite an existing spec; if the destination exists, preserve `Subject` and append a numeric suffix such as `-2` before the filename extension. Replace the filename placeholder and the `Subject` heading with the chosen forms.

<spec-template>

# Subject

## Overview

Summarize the problem, affected users, proposed outcome, and why it matters in a few short paragraphs.

## Business specification

Include this entire section only when the work changes user-facing behavior or involves business decisions that nontechnical stakeholders should review. Omit the heading and all of its subsections for purely technical work.

Keep this section brief. It is an overview for approval, not the technical plan translated into nontechnical language. Include only the most significant outcomes, constraints, trade-offs, scope boundaries, and unresolved questions — especially matters a stakeholder may object to or decide differently. Do not include architecture, modules, APIs, schemas, file paths, code, implementation steps, or exhaustive edge cases.

## Technical plan

Describe the implementation work. Technical details belong here, not in the business specification.

### Implementation

A numbered list of concrete steps in implementation order. Make each step clear enough for a person or agent to execute without inferring missing work. Include dependencies, required decisions, data migration or rollout work, and validation where they belong in the sequence.

### Decisions

A list of implementation decisions that were made by the user. This can include:

- Which libraries to use
- Technical clarifications
- Architectural decisions
- Schema changes
- API contracts
- Non-requirements
- Supported browsers or hardware

Do not include specific file paths or code snippets. They may end up being outdated very quickly.

Exception: if a prototype produced a snippet that encodes a decision more precisely than prose can (state machine, reducer, schema, type shape), inline it within the relevant decision and note briefly that it came from a prototype. Trim to the decision-rich parts — not a working demo, just the important bits.

Omit the heading and all of its subsections if there were no user decisions.

### Technical risks and open questions

Known implementation risks, trade-offs, assumptions, and unresolved technical decisions.

Omit the heading and all of its subsections when there are none.

</spec-template>
