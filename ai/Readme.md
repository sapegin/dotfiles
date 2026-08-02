# Global AI configuration

Shared instructions, personas, and skills for AI agents (Pi and Cursor). Run `dotfiles` to install configured files.

## Base instructions

The [base-prompt.md](./base-prompt.md) is the source of truth for global instructions.

- **Pi:** linked to `~/.pi/agent/AGENTS.md` by `dotfiles.json`.
- **Cursor:** global User Rules are managed in **Customize → Rules** and have no documented file-based user configuration. Project-level `AGENTS.md` files remain supported.

[Raccoonarium](./raccoonarium.md) documents the personal toolchain repos (`~/_/…`) and shared implementation preferences.

## Personas

Canonical personas live in [`personas/`](./personas/):

- `poe`: dry 19th century scholar
- `ramsay`: blunt Gordon Ramsay voice
- `raccoon`: Artem Sapegin’s writing voice

Assign a persona to a generated tone section with a marker:

```markdown
## Tone

<persona name="ramsay">
Generated instructions appear here.
</persona>
```

Run `npm run ai-sync` to update marked sections in `ai/AGENTS.md` and `ai/skills/*/SKILL.md` persona blocks. Run `npm run ai-sync:check` to detect stale generated sections without modifying files.

## Skills

Skills live in [`skills/`](./skills/) and follow the Agent Skills format. They are linked to `~/.agents/skills/`, which both Pi and Cursor discover as user-level skills.

Some skills are derived from upstream tools (`browser`) but owned in this repository — edit them here, not in installed packages. Each such skill has a `tested-with` field in its frontmatter.

When upgrading an upstream tool:

1. Read its changelog or upstream skill diff.
2. Smoke-test the commands the skill documents.
3. Update the owned skill text if flags or output changed.
4. Bump `tested-with` in the skill frontmatter.

## References

- [Pi skills](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/skills.md)
- [Cursor Agent Skills](https://cursor.com/docs/skills)
- [Cursor rules](https://cursor.com/docs/rules)
- [Agent Skills specification](https://agentskills.io/specification)
- [AGENTS.md](https://agents.md/)
