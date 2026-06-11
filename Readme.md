# Artem Sapegin’s dotfiles 🦝

![Raccoonarium](./images/raccoonarium.jpg)

## Features

- Custom color scheme: [Squirrelsong](./colors).
- [Custom zsh theme](./tilde/.starship.toml) with Git status, etc. using Starship.
- [Dotfiles synchronization](./src/bin/sync-dotfiles.ts).
- Sensible macOS defaults: [setup/osx.sh](./setup/osx.sh).
- [Visual Studio Code settings synchronization](./vscode).
- [Visual Studio Code extensions local installation](./src/bin/sync-vscode-extensions.ts).
- [Obsidian vault config](./obsidian).
- [Obsidian plugins local installation](./src/bin/sync-obsidian-plugins.ts).
- Magic project opener ([bin/j](./bin/j)).
- [zsh aliases](./zsh/aliases.zsh).
- [Git aliases](./tilde/.gitconfig).
- [Lots of scripts](./bin).
- [Firefox custom styles](./firefox).
- [Brewfile](./tilde/Brewfile)
- Configs for lots of apps.
- [macOS apps I use](https://github.com/sapegin/dotfiles/wiki/OS-X-Apps).

![Ghostty](https://github.com/sapegin/squirrelsong/raw/master/themes/Ghostty/screenshot-dark-dp.jpg)

[![Washing your code. A book on clean code for frontend developers](https://sapegin.me/images/washing-code-github.jpg)](https://sapegin.me/book/)

## Related repositories

- [Raccoon Toolbox](https://github.com/sapegin/raccoon-toolbox): collection of GUI tools
- [Raccoon VSCode](https://github.com/sapegin/raccoon-vscode): my Visual Studio Code extensions
- [Raccoon Obsidian](https://github.com/sapegin/raccoon-obsidian): my Obsidian extensions
- [Squirrelsong](https://github.com/sapegin/squirrelsong): my themes
- [sapegin.me](https://github.com/sapegin/sapegin.me): my sites

## Installation

> [!WARNING]  
> Fork this repository if you want to use my dotfiles.

Prerequisites:

1. [Generate SSH key](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent).

2. Clone dotfiles:

```shell
git clone git@github.com:sapegin/dotfiles.git ~/dotfiles && cd ~/dotfiles
```

3. Run setup script:

```shell
setup/setup.sh
```

## Extras

- [Install additional Squirrelsong color theme](https://sapegin.me/squirrelsong/)
- [Install MonoLisa font](https://www.monolisa.dev/)

## Further customization

- Add any Zsh profile customizations to `~/.zshlocal`.
- [Add your Git username/email/etc.](./setup#separate-git-identity-for-work-repositories) to `~/.gitlocal`.
- Add your environment variables to `~/.env`.

## Updating

```bash
dotfiles
```

## Resources

- [GitHub ❤ ~/](http://dotfiles.github.io/)
- [Mathias’s dotfiles](https://github.com/mathiasbynens/dotfiles)
- [Nick Khan’s dotfiles](https://github.com/nicksp/dotfiles)
- [Jan Moesen’s dotfiles](https://github.com/janmoesen/tilde)
- [Zach Holman’s dotfiles](https://github.com/holman/dotfiles)
- [Yet Another Dotfile Repo](https://github.com/skwp/dotfiles)
- [Jacob Gillespie’s dotfiles](https://github.com/jacobwgillespie/dotfiles)
- [OSX Python developer guide](https://gist.github.com/stefanfoulis/902296)
- [Nicolas Gallagher’s dotfiles](https://github.com/necolas/dotfiles)

---

:shipit:
