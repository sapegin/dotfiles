# Artem Sapegin’s dotfiles

## Installation

```bash
cd ~ && git clone https://github.com/sapegin/dotfiles.git && cd dotfiles && ./sync.py
```

It’will clone latest version of dotfiles to `~/dotfiles` and make symlinks in your home directory.

## Updating

```bash
cd ~/dotfiles && git pull && ./sync.py
```

## Screenshot

![Terminal.app](http://cl.ly/image/3q3B1S0O2m0f/Screen%20Shot%202012-10-19%20at%2015.28.31.png)

## Features

* Custom Bash prompt, useful aliases, etc.
* Git config, Git global ignore file.
* Dotfiles syncronization (`sync.py`).
* Sensible OS X defaults (`setup/osx.sh`).
* Sublime Text 2 settings syncronization and packages autoinstall (`setup/sublime-settings.sh` and `setup/sublime-packages.sh`).
* Consolas font install script (`setup/consolas.sh`)
* Bash4 install script (`setup/bash.sh`)
* Homebrew bootstrap (`setup/brew.sh`)
* My magic project opener (`bin/opener.py`)
* [Mac OS apps I use](https://github.com/sapegin/dotfiles/wiki/Mac-OS-Apps)

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