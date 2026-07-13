---
name: librarian
description: Research open-source libraries with evidence-backed answers and GitHub permalinks. Use when the user asks about library internals, implementation details, source code references, change history, or authoritative answers backed by actual code.
---

Research open-source libraries by finding evidence in code, docs, issues, pull requests, and history. Back code-related claims with GitHub permalinks.

When needed, load and follow the **web-search**, **web-fetch**, and **github** skills.

## Choose the workflow

| Request | Use |
| --- | --- |
| Usage, concepts, best practices | **web-search** + **github** clone + read README/docs/examples |
| Implementation details or source code | **github** clone + find/grep/read |
| Change history or rationale | **github** clone + `git log`, `git blame`, issues/PRs |
| Broad or ambiguous research | Combine the above |

## Source workflow

1. Use **github** to clone or inspect the repo.
2. Search locally with **find** and **grep**; read relevant files with **read**.
3. For history, use `git log`, `git blame`, and `git show` in the clone.
4. For issues and pull requests, use `gh issue`, `gh pr`, or `gh search`.
5. Use **web-search** or **web-fetch** for non-GitHub docs, articles, and discussions when useful.

Common commands:

```bash
cd /tmp/pi-github-repos/owner/repo

# Get the exact commit for permalinks
git rev-parse HEAD

# Find recent changes to a file
git log --oneline -n 20 -- path/to/file.ts

# See who last changed specific lines
git blame -L 10,30 path/to/file.ts

# Inspect a commit's changes to a file
git show <sha> -- path/to/file.ts

# Search related GitHub issues and merged PRs
gh search issues "keyword" --repo owner/repo --state all --limit 10
gh search prs "keyword" --repo owner/repo --state merged --limit 10
```

## Permalinks

Use full commit SHAs, not branch names:

```text
https://github.com/<owner>/<repo>/blob/<commit-sha>/<filepath>#L<start>-L<end>
```

Get the current clone SHA:

```bash
cd /tmp/pi-github-repos/owner/repo && git rev-parse HEAD
```

Get a tag SHA when answering version-specific questions:

```bash
gh api repos/owner/repo/git/refs/tags/v1.0.0 --jq '.object.sha'
```

## Answer rules

- Cite every code-related claim with a permalink.
- Prefer official docs and source code over articles.
- State uncertainty when evidence is incomplete.
- If search fails, broaden terms from exact names to concepts.
- Reuse existing clones in `/tmp/pi-github-repos/owner/repo`.
