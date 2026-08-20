# Skill authoring and review

This guide is the source of truth for creating, changing, and auditing skills.

## Integration

- The [base prompt](../../base-prompt.md) is already present whenever a skill runs. Include only task-specific guidance; do not repeat, contradict, or weaken the base prompt or applicable `AGENTS.md` files.
- Keep frontmatter, scope, process, examples, output contracts, and guardrails consistent with one another.
- Verify that referenced skills, scripts, tools, files, commands, paths, and links exist and work in the skill’s execution environment. Remove stale capabilities, output examples, frontmatter descriptions, and repository conventions.
- Handle plausible failure modes explicitly when default behavior would be unsafe, misleading, or prone to premature completion.

## Requirements and terminology

- State each requirement once, preferably as an observable outcome or output contract. Let the model infer routine steps. Prescribe a method only when it is non-obvious, required for correctness, or guards against a demonstrated failure mode.
- Use an established pattern name instead of teaching its routine mechanics when the name is widely understood in the relevant domain. For example, say “use early returns” or “model the state as a discriminated union”; explain only task-specific constraints or non-obvious consequences. Do not introduce obscure jargon merely to shorten prose.
- Use consistent terminology for equivalent workflows. Avoid vague steps, ambiguous scope, undefined terms, and misleading headings.
- Prefer positive instructions. Retain prohibitions for hard guardrails, and pair them with the correct action when useful.

## Predictability

- Require a stable output structure when scanability or downstream handling matters; leave task-specific content free to vary.
- Ordered steps should state observable actions and checkable completion criteria. Make criteria exhaustive where partial completion is likely.
- Ensure every required result is produced by a workflow step and every step serves the stated result.
- Prefer deterministic commands, tools, and fallback behavior where practical.

## Progressive disclosure

- Keep `SKILL.md` self-contained enough to route and begin the task. Keep detailed or specialized material in reference files.
- Keep instructions required on every run in `SKILL.md`. If required detail is too extensive, link it explicitly as required rather than hiding it in an apparently optional reference.
- Put branch-specific material behind a clearly named link whose wording states exactly when to load it. Load only the specific references relevant to the active branch; do not scan an entire reference directory.
- Follow references far enough to verify that links resolve, instructions are complete, and the pointer exposes the right material at the right time.
- Apply the same rules when one skill delegates to another.

## Structure and granularity

- Co-locate a concept’s definition, rules, and caveats under one heading.
- Maintain one authoritative source for shared behavior and link to it rather than copying it.
- Use a workflow branch only for a genuinely distinct path, not synonyms for the same action.
- Split a skill only when a distinct workflow must be reached independently or visible post-completion steps demonstrably cause premature completion. Otherwise keep one coherent skill.
- Move repeated deterministic parsing or orchestration into a small script when doing so saves tokens and produces more consistent results.

## Prompt quality

- Remove duplicated guidance, repeated meanings, irrelevant instructions, stale behavior, and sediment from earlier versions.
- Test each sentence independently. Remove sentences that do not change model behavior rather than merely shortening them.
- Do not overdocument capabilities the model already has or repeat process steps already enforced by output rules or guardrails.
- Keep each concept local instead of scattering its rules across unrelated sections.
- Preserve intentional differences between skills; do not manufacture uniformity without a task-specific reason.
