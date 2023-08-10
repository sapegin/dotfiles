# Artem Sapegin’s dotfiles 🐿️

![iTerm2](https://github.com/sapegin/squirrelsong/raw/master/dark/squirrelsong_terminal.png)

## Features

- Custom color scheme: [Squirrelsong](https://github.com/sapegin/dotfiles/tree/master/colors).
- [Custom zsh theme](https://github.com/sapegin/dotfiles/blob/master/tilde/.starship.toml) with Git status, etc. using Starship.
- [Dotfiles synchronization](https://github.com/sapegin/dotfiles/blob/master/bin/lib/sync-dotfiles).
- Sensible macOS defaults: [setup/osx.sh](https://github.com/sapegin/dotfiles/blob/master/setup/osx.sh).
- Visual Studio Code settings synchronization: [vscode](https://github.com/sapegin/dotfiles/tree/master/vscode).
- zsh install script: [setup/zsh.sh](https://github.com/sapegin/dotfiles/blob/master/setup/zsh.sh).
- My magic project opener ([bin/repo](https://github.com/sapegin/dotfiles/blob/master/bin/repo)).
- [zsh aliases](https://github.com/sapegin/dotfiles/blob/master/zsh/aliases.zsh).
- [Git aliases](https://github.com/sapegin/dotfiles/blob/master/tilde/.gitconfig).
- [Lots of scripts](https://github.com/sapegin/dotfiles/tree/master/bin).
- User scripts for browser: [userscripts/](https://github.com/sapegin/dotfiles/tree/master/userscripts).
- [macOS apps I use](https://github.com/sapegin/dotfiles/wiki/OS-X-Apps).

## Installation

(Fork this repository if you want to use my dotfiles.)

Prerequisites:

1. [Generate SSH key](https://help.github.com/articles/generating-ssh-keys/).
2. [Install Homebrew](http://brew.sh/).

Then run these commands in the terminal:

```
git clone git@github.com:sapegin/dotfiles.git ~/dotfiles
cd ~/dotfiles
setup/zsh.sh
setup/stuff.sh
setup/apps.sh
setup/vscode.sh
npm install
dotfiles
```

3. [Install color themes](./colors/Readme.md).
4. [Install MonoLisa font](https://www.monolisa.dev/).
5. [Install other stuff](./setup/Readme.md)

## Further customization

- Add any zsh profile customizations to `~/.zshlocal`.
- Add your git username/email/etc. to `~/.gitlocal`.

## Updating

```bash
dotfiles
```

## Resources

- [GitHub ❤ ~/](http://dotfiles.github.io/)
- [Mathias’s dotfiles](https://github.com/mathiasbynens/dotfiles)
- [Jan Moesen’s dotfiles](https://github.com/janmoesen/tilde)
- [Zach Holman’s dotfiles](https://github.com/holman/dotfiles)
- [Yet Another Dotfile Repo](https://github.com/skwp/dotfiles)
- [Jacob Gillespie’s dotfiles](https://github.com/jacobwgillespie/dotfiles)
- [OSX Python developer guide](https://gist.github.com/stefanfoulis/902296)
- [Nicolas Gallagher’s dotfiles](https://github.com/necolas/dotfiles)

---

:shipit:
