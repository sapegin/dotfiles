# Raccoonarium

Personal toolchain under `~/_/`, each a separate Git repo. Dotfiles is the hub; sibling repos are edited in their own trees.

| Repo | Path | Purpose |
| --- | --- | --- |
| dotfiles | `~/dotfiles` | Shell, sync, CLI tools, AI skills, app configs |
| oxlint-config-raccoon | `~/_/oxlint-config-raccoon` | Shared Oxlint/Oxfmt configs |
| raccoon-obsidian | `~/_/raccoon-obsidian` | Custom Obsidian plugins |
| raccoon-vscode | `~/_/raccoon-vscode` | Custom VS Code extensions |
| raccoon-toolbox | `~/_/raccoon-toolbox` | GUI tools (web and Mac app) |
| squirrelsong | `~/_/squirrelsong` | Color themes for all apps |

When a task spans repos, edit each repo in place; run the matching dotfiles sync script when installing locally.

## Implementation preferences

- Prefer owned code — dotfiles scripts, toolbox tools, custom VS Code/Obsidian extensions — when the implementation is simple enough.
- Prefer established CLI tools over npm dependencies; system tools are declared in [Brewfile](../tilde/Brewfile).
- Do not add an npm package for a few lines of code or for something Homebrew already provides.

## Coordination

| Change in | Also update |
| --- | --- |
| `oxlint-config-raccoon` | Publish npm package; bump `package.json` in dotfiles and other consumers |
| `raccoon-obsidian` plugin | Plugin source in monorepo; run `sync-obsidian-plugins` from dotfiles; manifest at `obsidian/installed-plugins.json` |
| `raccoon-vscode` extension | Extension source in monorepo; run `sync-vscode-extensions` from dotfiles |
| `squirrelsong` theme | Theme source in repo; may affect VS Code extension packaging via the same sync script |
| New CLI need | Add to `tilde/Brewfile` first; wire into a dotfiles script second |

## Referencing in other projects

Add to a Raccoonarium repo's `AGENTS.md`:

```markdown
Ecosystem context: read `~/dotfiles/ai/raccoonarium.md`.
```
