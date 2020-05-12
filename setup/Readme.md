## Prerequisites

- [Command Line Tools for Xcode](https://developer.apple.com/downloads)

## Scripts

### stuff

Installs Homebrew, Git, [git-extras](https://github.com/tj/git-extras), [git-friendly](https://github.com/jamiew/git-friendly), Node, configures Apache, PHP, MySQL, etc.

### zsh

Installs zsh, registers zsh as the default shell.

### osx

Sane OSX defaults. Based on [~/.osx](https://github.com/mathiasbynens/dotfiles/blob/master/.macos) by @mathiasbynens.

### quicklook

Installs quick look plugins: qlImageSize.

### update

Get macOS software updates, update Homebrew, npm, Ruby packages, dotfiles and some other software.

## Tips & Tricks

### Separate Git identity for work repositories

Assuming your work repositories are inside the `~/PIZZA` folder.

1. First create a separate Git config:

```
git config -f ~/PIZZA/.gitconfig user.email "artem@pizza.io"
git config -f ~/PIZZA/.gitconfig user.name "Artem Sapegin"
```

2. Then create `~/.gitlocal` file:

```
[includeIf "gitdir:~/PIZZA/"]
    path = ~/PIZZA/.gitconfig
```

### Per repository Git identity

```
cd ~/repo
git config user.email "artem.sapegin@pizza.io"
git config user.name "Artem Sapegin"
```

### How to make Home and End keys behave like on Windows

Create `~/Library/KeyBindings/DefaultKeyBinding.dict`:

```
{
  "\UF729"  = moveToBeginningOfParagraph:; // home
  "\UF72B"  = moveToEndOfParagraph:; // end
  "$\UF729" = moveToBeginningOfParagraphAndModifySelection:; // shift-home
  "$\UF72B" = moveToEndOfParagraphAndModifySelection:; // shift-end
  "^\UF729" = moveToBeginningOfDocument:; // ctrl-home
  "^\UF72B" = moveToEndOfDocument:; // ctrl-end
  "^$\UF729" = moveToBeginningOfDocumentAndModifySelection:; // ctrl-shift-home
  "^$\UF72B" = moveToEndOfDocumentAndModifySelection:; // ctrl-shift-end
}
```

### How to remove US English keyboard layout on macOS

Useful when you use some kind of [typography layout](http://ilyabirman.ru/projects/typography-layout/).

```bash
bash  <(curl -fsSkL https://raw.githubusercontent.com/bolknote/shellgames/master/us_layout_remover.sh)
```

### How to open files in different apps depending on their location by Cmd+click in iTerm2

Create a script:

```bash
#!/usr/bin/env bash

if  [[ "$1" == /Users/admin/badoo/* ]]; then
  /usr/local/bin/pstorm "$1"
  open /Applications/PhpStorm.app  # Focus
else
  open "$1"
fi
```

Go to iTerm2 preferences → Profiles → Advanced → Semantic History. Choose _Run command_ and type: `/Users/admin/bin/iopen "\1"`.

### Useful iTerm2 triggers

Go to iTerm2 preferences → Profiles → Advanced → Triggers. Click _Edit_.

| Description | RegExp | Action | Color |
| --- | --- | --- | --- |
| Highlight Git merge conflicts | `CONFLICT \([^)]+\)\:.*` | Highlight Text | Text: `f2ac00` |

## Misc

- [OSX Python developer guide](https://gist.github.com/stefanfoulis/902296)
