# Raccoonarium

Personal toolchain under `~/_/`, each a separate Git repo. Dotfiles is the hub; sibling repos are edited in their own trees.

| Repo | Path | Purpose |
| --- | --- | --- |
| dotfiles | `~/dotfiles` | Shell, sync, CLI tools, AI skills, app configs |
| oxlint-config-raccoon | `~/_/oxlint-config-raccoon` | Shared Oxlint/Oxfmt configs |
| raccoon-obsidian | `~/_/raccoon-obsidian` | Custom Obsidian plugins |
| raccoon-vscode | `~/_/raccoon-vscode` | Custom VS Code extensions |
| raccoon-toolbox | `~/_/raccoon-toolbox` | GUI dev tools (web and Mac app) |
| raccoon-apps | `~/_/raccoon-apps` | Native Mac apps: Hotdog launcher and Pastor terminal |
| raccoon-ios-apps | `~/_/raccoon-ios-apps` | Native iOS apps: Krab camera |
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
| `raccoon-toolbox` Mac app | App source in repo; run `app-install raccoon-toolbox` from dotfiles |
| `raccoon-apps` Native Mac apps | App source in repo; run `app-install hotdog` / `app-install pastor` from dotfiles |
| `raccoon-ios-apps` Native iOS apps | App source in repo; device install via Xcode Personal Team (`docs/Personal-Team.md`) |
| `squirrelsong` theme | Theme source in repo; may affect VS Code extension packaging via the same sync script |
| New CLI need | Add to `tilde/Brewfile` first; wire into a dotfiles script second |

## Referencing in other projects

Add to a Raccoonarium repo's `AGENTS.md`:

```markdown
Ecosystem context: read `~/dotfiles/ai/raccoonarium.md`.
```
