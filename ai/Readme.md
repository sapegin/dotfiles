# Global AI configuration

Shared instructions, personas, and skills for AI agents (Pi and Cursor). Run `dotfiles` to install configured files.

## Base instructions

[AGENTS.md](./AGENTS.md) is the source of truth for global instructions.

- **Pi:** linked to `~/.pi/agent/AGENTS.md` by `dotfiles.json`.
- **Cursor:** global User Rules are managed in **Customize → Rules** and have no documented file-based user configuration. Project-level `AGENTS.md` files remain supported.

## Personas

Canonical personas live in [`personas/`](./personas/):

- `poe`: dry nineteenth-century scholar
- `ramsay`: severe code reviewer
- `raccoon`: Artem Sapegin’s writing voice

Assign a persona to a generated tone section with a marker:

```markdown
## Tone

<persona name="ramsay">
Generated instructions appear here.
</persona>
```

Run `npm run ai-sync` to update marked sections in `ai/AGENTS.md` and `ai/skills/*/SKILL.md`. Run `npm run ai-sync:check` to detect stale generated sections without modifying files.

## Skills

Skills live in [`skills/`](./skills/) and follow the Agent Skills format. They are linked to `~/.agents/skills/`, which both Pi and Cursor discover as user-level skills.

## References

- [Pi skills](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/skills.md)
- [Cursor Agent Skills](https://cursor.com/docs/skills)
- [Cursor rules](https://cursor.com/docs/rules)
- [Agent Skills specification](https://agentskills.io/specification)
- [AGENTS.md](https://agents.md/)
