# Artem Sapegin’s dotfiles 🐿️

![WezTerm](https://github.com/sapegin/squirrelsong/raw/master/dark/WezTerm/screenshot.png)

## Features

- Custom color scheme: [Squirrelsong](https://github.com/sapegin/dotfiles/tree/master/colors).
- [Custom zsh theme](https://github.com/sapegin/dotfiles/blob/master/tilde/.starship.toml) with Git status, etc. using Starship.
- [Dotfiles synchronization](https://github.com/sapegin/dotfiles/blob/master/bin/lib/sync-dotfiles).
- Sensible macOS defaults: [setup/osx.sh](https://github.com/sapegin/dotfiles/blob/master/setup/osx.sh).
- Visual Studio Code settings synchronization: [vscode](https://github.com/sapegin/dotfiles/tree/master/vscode).
- My magic project opener ([bin/j](https://github.com/sapegin/dotfiles/blob/master/bin/j)).
- [zsh aliases](https://github.com/sapegin/dotfiles/blob/master/zsh/aliases.zsh).
- [Git aliases](https://github.com/sapegin/dotfiles/blob/master/tilde/.gitconfig).
- [Lots of scripts](https://github.com/sapegin/dotfiles/tree/master/bin).
- [Vivaldi custom styles](https://github.com/sapegin/dotfiles/tree/master/vivaldi).
- [Brewfile](https://github.com/sapegin/dotfiles/tree/master/tilde/Brewfile)
- Configs for lots of apps.
- [macOS apps I use](https://github.com/sapegin/dotfiles/wiki/OS-X-Apps).

## Installation

(Fork this repository if you want to use my dotfiles.)

Prerequisites:

1. [Generate SSH key](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent).

2. Clone dotfiles:

```shell
git clone git@github.com:sapegin/dotfiles.git ~/dotfiles && cd ~/dotfiles
```

2. Run setup script:

```shell
setup/setup.sh
```

3. [Install Squirrelsong color theme](https://sapegin.me/squirrelsong/)
4. [Install MonoLisa font](https://www.monolisa.dev/)

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
