# fzf

> Fuzzy finder for the shell

# Shell hotkeys

- Search files and paste path on the command line:

`Ctrl+T`

- Search command history:

`Ctrl+R`

- `cd` into a directory:

`Alt+C`

- Fuzzy-complete a path (`**` is the trigger in dotfiles):

`vim **<Tab>`

- Fuzzy-complete with query already typed:

`cd foo**<Tab>`

# Inside fzf

- Move up / down:

`Up` / `Down` or `Ctrl+K` / `Ctrl+J`

- Accept selection (paste / run):

`Enter`

- Cancel:

`Esc` or `Ctrl+C` or `Ctrl+G`

- Toggle multi-select:

`Tab` / `Shift+Tab`

- Clear query:

`Ctrl+U`

- Delete word in query:

`Ctrl+W`

- Toggle preview window (useful with `Ctrl+T`; bat preview is enabled in dotfiles):

`Ctrl+/`

# History search (`Ctrl+R`)

- Toggle sort: relevance ↔ chronological:

`Ctrl+R (again)`

- Toggle “raw” mode (see neighbors of a match):

`Alt+R`

- In raw mode, jump between matches only:

`Ctrl+P` / `Ctrl+N`

# Basics

- Pipe any list into fzf:

`fd | fzf`

- Start with a query:

`fzf --query foo`

- Multi-select, then act on results:

`fd | fzf --multi`

- Preview file contents (already set for `Ctrl+T` via `FZF_CTRL_T_OPTS`):

`--preview 'bat -n --color=always {}'`
