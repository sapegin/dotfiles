# Global AI configuration

Shared instructions and skills for AI agents (Pi and Cursor). Run `dotfiles` to install configured files.

## Base instructions

The [base-prompt.md](./base-prompt.md) is the source of truth for global instructions.

- **Pi:** linked to `~/.pi/agent/AGENTS.md` by `dotfiles.json`.
- **Cursor:** global User Rules are managed in **Customize → Rules** and have no documented file-based user configuration. Project-level `AGENTS.md` files remain supported.

[Raccoonarium](./raccoonarium.md) documents the personal toolchain repos (`~/_/…`) and shared implementation preferences.

## Tone

Poe’s tone instructions are inline in [base-prompt.md](./base-prompt.md). Writing skills link directly to the [English writing style guide](./skills/_references/Writing.md).

## Skills

Skills live in [`skills/`](./skills/) and follow the Agent Skills format. They are linked to `~/.agents/skills/`, which both Pi and Cursor discover as user-level skills.

## References

- [Pi skills](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/skills.md)
- [Cursor Agent Skills](https://cursor.com/docs/skills)
- [Cursor rules](https://cursor.com/docs/rules)
- [Agent Skills specification](https://agentskills.io/specification)
- [AGENTS.md](https://agents.md/)
