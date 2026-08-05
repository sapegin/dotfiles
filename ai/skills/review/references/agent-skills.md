# Agent skills and prompts

## Predictability

- The skill should make its process predictable. When scanability or downstream handling matters, require a stable output structure while leaving task-specific content free to vary.
- Ordered steps should state observable actions and checkable completion criteria. Criteria should be exhaustive where partial completion is likely.
- The workflow, output contract, and guardrails should agree; each required result must be produced by a step, and every step should serve the stated result.
- Commands, tools, and fallback behavior should be deterministic where practical. Repeated parsing or orchestration is usually better placed in a small helper script.

## Information hierarchy

- Keep actions required on every run in `SKILL.md`; keep flat rules there when every run needs them.
- Move branch-specific or specialized reference material to a clearly named Markdown file behind a context pointer whose wording states exactly when to load it.
- Do not hide essential rules in optional references merely to shorten `SKILL.md`, nor preload references irrelevant to the active branch.
- Follow referenced files far enough to verify that links resolve, instructions are complete, and the pointer exposes the right material at the right time.

## Structure and granularity

- A branch should represent a genuinely different path through the workflow, not synonyms for the same action.
- Split a skill only when a distinct workflow must be reached independently or when visible post-completion steps demonstrably cause premature completion. Otherwise prefer one coherent skill.
- Co-locate a concept’s definition, rules, and caveats. Maintain one authoritative source for shared behavior and reference it rather than copying it.
- Use leading words only when they recruit a familiar concept and make behavior more precise; decorative terminology is added load.

## Integration

- Frontmatter, stated scope, process, examples, and output must describe the same capability.
- The skill must comply with the base prompt and applicable `AGENTS.md`, preserve their safeguards, and follow repository conventions for progressive disclosure.
- Dependencies on other skills, scripts, tools, and files must resolve and be available in the environment where the skill runs.
- The skill should handle its plausible failure modes explicitly when the default behavior would be unsafe, misleading, or prone to premature completion.
