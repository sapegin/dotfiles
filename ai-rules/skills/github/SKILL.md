---
name: github
description: Fetching code from GitHub, interacting with GitHub repositories, pull requests, issues, and API. Use when working with GitHub resources instead.
---

## When to use

- Browsing or reading code from a GitHub repository: clone it and use read/find/grep/ls/bash
- Viewing or creating pull requests, issues, releases, or gists
- Fetching repo metadata or any GitHub API data
- Interacting with GitHub Actions (runs, workflows)
- Any task involving GitHub that you might otherwise use `curl`, `wget`, or `web-fetch` for

## When NOT to use

- Non-GitHub URLs — use `web-fetch` for those
- Public web content that happens to be hosted on GitHub Pages (`*.github.io`) — use `web-fetch`
- Local git operations (`git commit`, `git push`) — use `git` directly

## Key principle

**Always use `gh` instead of `curl`, `wget`, or `web-fetch` for GitHub URLs.** The `gh` CLI uses the user’s authenticated token automatically.

## Browsing repository code

**When you only need one file**, use `gh api`:

```bash
# Get raw file content directly (skips base64)
gh api repos/owner/repo/contents/path/to/file.py \
  -H "Accept: application/vnd.github.raw+json"

# Get file from a specific branch/ref
gh api repos/owner/repo/contents/path/to/file.py?ref=develop \
  -H "Accept: application/vnd.github.raw+json"

# List directory contents
gh api repos/owner/repo/contents/src/ --jq '.[].name'
```

**To read or browse files from a GitHub repo, clone it locally and use normal file tools** (read/find/grep/ls/bash).

```bash
clonedir="$TMPDIR/gh-clones-$(date +%s)"
mkdir -p "$clonedir"
gh repo clone owner/repo "$clonedir/repo" -- --depth 1
```

For targeted lookups on a clone you already have, use read/find/grep/ls/bash directly.

## Examples

```bash
# View a repo
gh repo view owner/repo

# List and view pull request
gh pr list --repo owner/repo
gh pr view 123 --repo owner/repo

# List pull request and issues comments
gh api repos/owner/repo/pulls/123/comments --jq '.[].body'
gh api repos/owner/repo/issues/123/comments --jq '.[].body'

# List and view issues
gh issue list --repo owner/repo
gh issue view 456 --repo owner/repo

# Search issues
gh search issues "memory leak language:rust"
gh search issues "label:bug state:open" --repo owner/repo

# Call any REST API endpoint
gh api repos/owner/repo/contents/README.md

# Call with pagination and jq filtering
gh api repos/owner/repo/pulls --paginate --jq '.[].title'
```
