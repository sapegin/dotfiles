# Global AI configs

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
- [Kilo Code custom modes](https://kilocode.ai/docs/features/custom-modes)
- [Kilo Code custom rules](https://kilocode.ai/docs/advanced-usage/custom-rules)
- [Copilot prompt files](https://code.visualstudio.com/docs/copilot/customization/prompt-files)
- [Claude Code Action](https://github.com/anthropics/claude-code-action)
