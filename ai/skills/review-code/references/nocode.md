# Configuration, documentation, and agent artifacts

## Configuration

Environment-specific settings, feature flags, sync maps, and deployment config. Verify values match documented intent, required variables are declared, secrets are not committed, defaults are safe for production, and changes stay consistent with related config elsewhere in the repo.

## Documentation

Setup instructions, API references, architectural decision records, skill instructions, and README content. Flag docs that are actively wrong (worse than missing), public API surface without reference docs, undocumented required env vars, missing `.env.example`, and architectural decisions nobody can reconstruct for actively contested areas.

## Agent skills and prompts

Skill routing, progressive disclosure, triggers for reference loading, output formats, guardrails, overdocumentation of things models can do on their own, and consistency with `AGENTS.md` and the base prompt. Flag contradictions, duplicated guidance, missing triggers, essential rules buried in optional references, and skills that weaken base-prompt constraints.

## DX and tooling

Missing or broken typecheck, lint, formatter, or pre-commit hooks; slow dev/test feedback; wrong or incomplete README setup; missing `AGENTS.md` where agents execute changes; unstructured service logs without request/correlation IDs.
