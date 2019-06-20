# Artem Sapegin’s dotfiles

![iTerm2](https://github.com/sapegin/squirrelsong/raw/master/squirrelsong_terminal.png)

## Features

- Custom color scheme for iTerm and Terminal.app: [Squirrelsong](https://github.com/sapegin/dotfiles/tree/master/color).
- Custom zsh theme with Git status, etc: [Squirrelbook](https://github.com/sapegin/dotfiles/blob/master/zsh/themes/squirrelbook.zsh-theme).
- Dotfiles synchronization: [sync.py](https://github.com/sapegin/dotfiles/blob/master/sync.py).
- Sensible macOS defaults: [setup/osx.sh](https://github.com/sapegin/dotfiles/blob/master/setup/osx.sh).
- Visual Studio Code settings synchronization: [vscode](https://github.com/sapegin/dotfiles/tree/master/vscode).
- zsh install script: [setup/zsh.sh](https://github.com/sapegin/dotfiles/blob/master/setup/zsh.sh).
- My magic project opener ([bin/repo](https://github.com/sapegin/dotfiles/blob/master/bin/repo)).
- [zsh aliases](https://github.com/sapegin/dotfiles/blob/master/zsh/aliases.zsh).
- [Git aliases](https://github.com/sapegin/dotfiles/blob/master/tilde/gitconfig).
- [Lots of scripts](https://github.com/sapegin/dotfiles/tree/master/bin).
- User scripts for browser: [userscripts/](https://github.com/sapegin/dotfiles/tree/master/userscripts).
- Stop words lists that I use with Marked 2: [dict/](https://github.com/sapegin/dotfiles/tree/master/dict).
- [macOS apps I use](https://github.com/sapegin/dotfiles/wiki/OS-X-Apps).

## Installation

(Fork this repository if you want to use my dotfiles.)

Prerequisites:

1.  [Install Xcode Command Line Tools](http://railsapps.github.io/xcode-command-line-tools.html).
1.  [Generate SSH key](https://help.github.com/articles/generating-ssh-keys/).
1.  [Install Homebrew](http://brew.sh/).

Then run these commands in the terminal:

```
brew install git
git clone git@github.com:sapegin/dotfiles.git ~/dotfiles
cd ~/dotfiles
./sync.py
cd ~/dotfiles/setup
```

Now you can run scripts like `osx.sh` or `server.sh` to install other stuff.

## Updating

```bash
dotfiles
```

## Notes

You can use any file extensions in `tilde/` to invoke proper syntax highlighting in code editor.

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
