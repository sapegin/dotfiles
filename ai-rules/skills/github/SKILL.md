---
name: github
description: Work with GitHub repositories, source code, pull requests, issues, releases, Actions, and API data using the gh CLI. Use for GitHub URLs and GitHub resources.
---

Use `gh` for GitHub resources. It uses the user’s authenticated token and is preferred over `curl`, `wget`, or **web-fetch** for GitHub URLs.

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

For broader browsing, clone and use normal file tools:

```bash
# Clone to the shared Pi GitHub repo cache
mkdir -p /tmp/pi-github-repos/owner
gh repo clone owner/repo /tmp/pi-github-repos/owner/repo -- --depth 1
```

Reuse `/tmp/pi-github-repos/owner/repo` when it already exists. Search cloned repos with `find`, `grep`, `read`, `ls`, and `bash`.

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
gh search issues "keyword" --repo owner/repo --state all --limit 10
gh search prs "keyword" --repo owner/repo --state merged --limit 10

# List recent release tags
gh api repos/owner/repo/releases --jq '.[0:5] | .[].tag_name'
```
