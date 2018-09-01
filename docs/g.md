# g

> Quick grep: rg (ripgrep), ack or grep. Usage with `ripgrep`:

- Recursively search the current directory for a regex pattern:

`g {{pattern}}`

- Search for a pattern only in a certain filetype (e.g., html, css, etc.):

`g -t {{filetype}} {{pattern}}`

- Search for a pattern in files matching a glob (e.g., `README.*`):

`g -g {{glob}} {{pattern}}`

- Match only at word boundaries:

`g -w {{pattern}}`

- Search for a pattern only in a file or directory:

`g {{pattern}} {{file_or_dir}}`

- Replace a pattern (will only print results, use `wg` to do actual replace):

`g {{pattern}} {{filename}} --replace {{replacement}}`
