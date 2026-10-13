# AI configuration

Ecosystem context: read `raccoonarium.md`.

## Base prompt

[base-prompt.md](./base-prompt.md) is the source of truth for global instructions (tone, working principles, code-editing rules). It is symlinked to `~/.pi/agent/AGENTS.md` and copied into Cursor User Rules manually. Keep it short, generic, and broadly useful — no Raccoonarium- or dotfiles-specific rules.

Raccoonarium ecosystem context lives in [raccoonarium.md](./raccoonarium.md); reference it from Raccoonarium project `AGENTS.md` files, not from the base prompt.

## Skills

Skills live in `skills/` and are symlinked to `~/.agents/skills/`. Always edit skills here (and references in `skills/_references/`), never in `~/.agents/skills/`. Follow [skills/AGENTS.md](./skills/AGENTS.md) when authoring skills.
