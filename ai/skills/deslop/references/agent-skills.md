# Agent skills and prompts

## Consistency

- Duplicated guidance from the base prompt, applicable `AGENTS.md`, sibling references, or another authoritative source.
- Contradictions with higher-priority instructions, weakened safeguards, inconsistent terminology, and conventions that differ from sibling skills without a task-specific reason.
- Stale commands, paths, links, capabilities, output examples, or frontmatter descriptions.

## Pruning

- Irrelevant instructions and sediment left from earlier behavior.
- No-op sentences that do not change model behavior. Test each sentence independently; delete failures rather than merely shortening them.
- Repeated meanings within or across files. Keep one source of truth and link to it where reuse is required.
- Overdocumentation of capabilities the model already has, verbose process steps duplicated by output rules or guardrails, and examples that add no behavior.
- Negative instructions that make the unwanted behavior more salient. State the desired behavior positively; retain prohibitions only for hard guardrails and pair them with the correct action.

## Clarity and locality

- Vague steps, ambiguous scope, undefined terms, misleading headings, and prose that obscures the action or completion condition.
- A concept’s rules, caveats, and definitions scattered across unrelated sections instead of co-located under one heading.
- Missed opportunities to use a precise, familiar leading word to replace repeated explanations (for example, “red” for a test that demonstrably fails before a fix, or “tracer bullet” for an end-to-end implementation used to validate a path). Do not introduce jargon merely to shorten prose.
- Essential instructions hidden in optional references, references without explicit load triggers, and excessive inline detail needed by only one branch.
