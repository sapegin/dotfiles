# Global AI configs

Shared prompts and skills for AI agents. Run `dotfiles` to install them.

## Base prompt

Source of truth: [AGENTS.md](./AGENTS.md).

| Tool / Agent | Global prompt location | Notes |
| --- | --- | --- |
| **Codex CLI** | `~/.codex/AGENTS.md` | Native support; also reads repo `AGENTS.md` |
| **Amp CLI** | `~/.config/amp/AGENTS.md` or `~/.config/AGENTS.md` | Walks up directories; very flexible |
| **GitHub Copilot (VS Code)** | `~/.copilot/instructions/*.md` | Folder-based; multiple files allowed |
| **Cursor** | `~/.cursor/rules/*.md` | Uses rules system; not strictly `AGENTS.md` |
| **Claude Code** | `~/.claude/CLAUDE.md` | Prefers `CLAUDE.md` over `AGENTS.md` |
| **Kilo Code (VS Code)** | `~/.config/kilo/kilo.jsonc` → references `.md` files | Indirect; points to your prompt file |
| **Continue.dev** | `~/.continue/config.json` → references prompt files | Indirect; JSON config |
| **Aider** | `~/.aider.conf.yml` | Can include system prompt / instructions |
| **Zed (agent mode)** | `~/.config/zed/settings.json` → agent instructions | Indirect; editor config |
| **Windsurf** | `~/.codeium/windsurf/memories/` | Stores persistent instructions/memory |
| **OpenHands** | `~/.openhands/config.yaml` | Indirect; agent config |
| **Devin** | N/A (cloud-managed) | No local global prompt file |

## Custom skills

Source of truth: [`skills/`](./skills/). Each skill lives in `skills/<name>/SKILL.md`.

### Codex

Codex reads user-wide skills from `~/.codex/skills/`.

### Amp

Amp reads user-wide skills from `~/.config/agents/skills/` or `~/.config/amp/skills/`.

### GitHub Copilot

Copilot does not read `SKILL.md` directories directly. Convert the relevant skill into a prompt file or instructions file. For example, copy the body of `ai-rules/skills/review-code/SKILL.md` into `.github/prompts/review-code.prompt.md` and invoke it from Copilot Chat.

## Commit message instructions

Source of truth: [Commits.md](./Commits.md).

| Tool / Agent | Commit instructions location | Notes |
| --- | --- | --- |
| **GitHub Copilot (VS Code)** | `github.copilot.chat.commitMessageGeneration.instructions` config option |  |

## Tips

### Codex

- Use `/plan` to turn on the planning mode.

## References

- [AGENTS.md](https://agents.md/)
- [Two-step approach to AI coding](https://github.com/sapegin/two-step-ai-coding-modes): my custom AI agent modes
- [AI rules](https://github.com/sapegin/washingcode-book/tree/master/ai) based on my book on clean code for frontend developers
- [OpenAI Skills](https://help.openai.com/en/articles/20001066)
- [Amp manual: Agent Skills](https://ampcode.com/manual)
- [Copilot prompt files](https://code.visualstudio.com/docs/copilot/customization/prompt-files)
- [GitHub Copilot custom instructions](https://docs.github.com/en/copilot/how-tos/configure-custom-instructions/add-repository-instructions)
- [Claude Code Action](https://github.com/anthropics/claude-code-action)
