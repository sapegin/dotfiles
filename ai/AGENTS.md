# AI configuration

Ecosystem context: read `raccoonarium.md`.

## Base prompt

[base-prompt.md](./base-prompt.md) is the source of truth for global instructions (tone, working principles, code-editing rules). It is symlinked to `~/.pi/agent/AGENTS.md` and copied into Cursor User Rules manually. Keep it short, generic, and broadly useful — no Raccoonarium- or dotfiles-specific rules.

Raccoonarium ecosystem context lives in [raccoonarium.md](./raccoonarium.md); reference it from Raccoonarium project `AGENTS.md` files, not from the base prompt.

## Personas

Canonical personas live in `ai/personas/`. Assign a persona to a generated tone section:

```markdown
## Tone

<persona name="ramsay">
Generated instructions appear here.
</persona>
```

Run `npm run ai-sync` to update marked persona blocks here and in `ai/skills/*/SKILL.md`. Run `npm run ai-sync:check` to detect stale sections without modifying files.

## Skills

Skills live in `skills/` and are symlinked to `~/.agents/skills/`. Always edit skills here (and references in `skills/_references/`), never in `~/.agents/skills/`. Follow [skills/AGENTS.md](./skills/AGENTS.md) when authoring skills.

Some skills are derived from upstream tools but owned here — edit them in this repo, not in installed packages. When upgrading an upstream tool: read its changelog, smoke-test documented commands, update the skill text if flags changed, bump `tested-with` in frontmatter.
