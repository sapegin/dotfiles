---
name: github
description: Work with GitHub repositories, source code, pull requests, issues, releases, Actions, and API data using the gh CLI. Use for GitHub URLs and GitHub resources.
---

Use `gh` for GitHub resources. It uses the user’s authenticated token and is preferred over `curl`, `wget`, or `web_fetch` for GitHub URLs.

Do not use this for non-GitHub URLs, GitHub Pages sites (`*.github.io`), or local Git operations like `git commit` and `git push`.

## Repository code

For one file or directory, use `gh api`:

```bash
# Get raw file content directly
gh api repos/owner/repo/contents/path/to/file.py \
  -H "Accept: application/vnd.github.raw+json"

# List directory contents
gh api repos/owner/repo/contents/src/ --jq '.[].name'
```

For broader browsing, prepare a revision-pinned research checkout:

```bash
~/dotfiles/bin/github-source owner/repo
~/dotfiles/bin/github-source owner/repo v1.0.0
```

The CLI clones or refreshes `/tmp/pi-github-repos/owner/repo`, checks out the requested revision detached, and returns its `directory` and full `commit` SHA. Omitting the revision fetches the latest default-branch HEAD. It refuses dirty checkouts; report the error without resetting or deleting local work.

Fetch additional history explicitly when `git log` or `git blame` needs it; the helper fetches only depth one. Search the returned directory with `find`, `grep`, `read`, `ls`, and `bash`.

## Common commands

```bash
# View repository metadata
gh repo view owner/repo

# List and inspect pull requests
gh pr list --repo owner/repo
gh pr view <number> --repo owner/repo --comments

# List and inspect issues
gh issue list --repo owner/repo
gh issue view <number> --repo owner/repo --comments

# Search issues and merged pull requests
gh search issues "keyword" --repo owner/repo --limit 10
gh search prs "keyword" --repo owner/repo --merged --limit 10

# List recent release tags
gh api repos/owner/repo/releases --jq '.[0:5] | .[].tag_name'
```
