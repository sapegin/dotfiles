## Scripts

### osx

Sane OSX defaults. Based on [~/.osx](https://github.com/mathiasbynens/dotfiles/blob/master/.macos) by @mathiasbynens.

### setup

Installs Homebrew, Git, Node.js, etc.

## Tips & tricks

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
