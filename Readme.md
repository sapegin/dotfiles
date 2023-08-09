# Artem Sapegin’s dotfiles 🐿️

![iTerm2](https://github.com/sapegin/squirrelsong/raw/master/dark/squirrelsong_terminal.png)

## Features

- Custom color scheme for iTerm and Terminal.app: [Squirrelsong](https://github.com/sapegin/dotfiles/tree/master/color).
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

Now you can run scripts like `setup/zsh.sh` or `setup/osx.sh` to install other stuff.

## Updating

```bash
dotfiles
```

## Further customization

- Add any zsh profile customizations to `~/.zshlocal`.
- Add your git username/email/etc. to `~/.gitlocal`.

## Resources

- [GitHub ❤ ~/](http://dotfiles.github.io/)
- [Mathias’s dotfiles](https://github.com/mathiasbynens/dotfiles)
- [Jan Moesen’s dotfiles](https://github.com/janmoesen/tilde)
- [Nicolas Gallagher’s dotfiles](https://github.com/necolas/dotfiles)
- [Zach Holman’s dotfiles](https://github.com/holman/dotfiles)
- [Yet Another Dotfile Repo](https://github.com/skwp/dotfiles)
- [Jacob Gillespie’s dotfiles](https://github.com/jacobwgillespie/dotfiles)

---

:shipit:
