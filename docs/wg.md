# wg

> Replace in files. Uses ripgrep to find files, so all ripgrep arguments work. Use `g` command for dry-run, and then replace it with `wg`.

- Replace a pattern in a file:

`wg {{pattern}} {{filename}} --replace {{replacement}}`

- Replace a pattern in all files:

`wg {{pattern}} --replace {{replacement}}`
