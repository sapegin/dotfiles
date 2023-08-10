## Scripts

### adobe-settings

Enables Adobe Photoshop and Lightroom settings syncronization.

### osx

Sane OSX defaults. Based on [~/.osx](https://github.com/mathiasbynens/dotfiles/blob/master/.macos) by @mathiasbynens.

### stuff

Installs Homebrew, Git, [git-friendly](https://github.com/jamiew/git-friendly), Node.js, etc.

### zsh

Installs zsh, registers zsh as the default shell.

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

