# Artem Sapegin’s dotfiles

## Installation

```bash
curl dot.sapegin.me | bash
```
or

```bash
curl https://raw.github.com/sapegin/dotfiles/master/install/install.sh | bash
```

It’ll installs Git (on OS X only), clones latest version of dotfiles to `~/dotfiles` and makes symlinks in your home directory.

## Updating

```bash
dotfiles
```

## Screenshot

![Terminal.app](https://raw.github.com/sapegin/dotfiles/master/color/squirrelsong_terminal.png)

## Features

* Custom Bash prompt, useful aliases, etc.
* Git config, Git global ignore file.
* Dotfiles syncronization (`sync.py`).
* Sensible OS X defaults (`setup/osx.sh`).
* Sublime Text 2 settings syncronization and packages autoinstall (`setup/sublime-settings.sh` and `setup/sublime-packages.sh`).
* Consolas font install script (`setup/consolas.sh`)
* Bash4 install script (`setup/bash.sh`)
* OS X, Homebrew, NPM, etc. update script (`setup/update.sh`)
* Color conversion script: convert #HEX to RGB/RGBA and HSL/HSLA
* My magic project opener (`bin/opener.py`)
* [Bash](https://github.com/sapegin/dotfiles/blob/master/docs/Bash.md) & [Git](https://github.com/sapegin/dotfiles/blob/master/docs/Git.md) aliases and scripts
* [Mac OS X apps I use](https://github.com/sapegin/dotfiles/wiki/OS-X-Apps)

## Notes

You can use any file extensions in `tilde/` to invoke proper syntax highlighting in code editor.

## Further customization

* Add any Bash profile customizations to `~/.bashlocal`.
* Add your git username/email/etc. to `~/.gitlocal`.
* Just fork this repo and hack on.

## Resources

* [GitHub ❤ ~/](http://dotfiles.github.com/)
* [Mathias’s dotfiles](https://github.com/mathiasbynens/dotfiles)
* [Jan Moesen’s dotfiles](https://github.com/janmoesen/tilde)
* [Nicolas Gallagher’s dotfiles](https://github.com/necolas/dotfiles)
* [Zach Holman’s dotfiles](https://github.com/holman/dotfiles)
* [Jacob Gillespie’s dotfiles](https://github.com/jacobwg/dotfiles)
* [Yet Another Dotfile Repo](https://github.com/skwp/dotfiles)
* [Mac OS X Lion Setup](https://github.com/ptb/Mac-OS-X-Lion-Setup)
* [Yet another cool story about bash prompt](http://habrahabr.ru/company/mailru/blog/145008/) (in Russian)

---

:shipit: