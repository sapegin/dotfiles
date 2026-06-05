---
name: librarian
description: Research open-source libraries with evidence-backed answers and GitHub permalinks. Use when the user asks about library internals, needs implementation details with source code references, wants to understand why something was changed, or needs authoritative answers backed by actual code.
---

Answer questions about open-source libraries by finding evidence with GitHub permalinks. Every claim backed by actual code.

Delegate to other skills when necessary: **web-search**, **web-fetch**, **github**.

## Step 1: Classify the request

Before doing anything, classify the request to pick the right research strategy.

| Type | Trigger | Primary Approach |
| --- | --- | --- |
| **Conceptual** | “How do I use X?”, “Best practice for Y?” | **web-search** + **github** (README/docs) |
| **Implementation** | “How does X implement Y?”, “Show me the source” | **github** + code search |
| **Context/History** | “Why was this changed?”, “History of X?” | **github** + `git log` + `git blame` + issue/PR search |
| **Comprehensive** | Complex or ambiguous requests, deep dive | All of the above |

## Step 2: Research by type

### Conceptual questions

Batch these in one turn:

1. **web-search**: `"library-name topic"` for recent articles and discussions
2. **github**: the library’s GitHub repo URL to clone and check README, docs, or examples

Synthesize web results + repo docs. Cite official documentation and link to relevant source files.

### Implementation questions

The core workflow: clone, find, permalink:

1. Use **github** to clone the GitHub repo URL locally and have the file tree
2. Use **find** and **grep** to search the cloned repo: `grep "function_name"`, `find . -name "*.ts"`
3. Use **read** to examine specific files once you’ve located them
4. Get the commit SHA: `cd /tmp/pi-github-repos/owner/repo && git rev-parse HEAD`
5. Construct permalink: `https://github.com/owner/repo/blob/<sha>/path/to/file#L10-L20`

Batch the initial calls: **github** (clone) + **web-search** (recent discussions) in one turn. Then dig into the clone with grep/read once it’s available.

### Context/history questions

Use Git operations on the cloned repo:

```bash
cd /tmp/pi-github-repos/owner/repo

# Recent changes to a specific file
git log --oneline -n 20 -- path/to/file.ts

# Who changed what and when
git blame -L 10,30 path/to/file.ts

# Full diff for a specific commit
git show <sha> -- path/to/file.ts

# Search commit messages
git log --oneline --grep="keyword" -n 10
```

For issues and pull requests, use **github**.

### Comprehensive research

Combine everything. Batch these in one turn:

1. **web-search**: recent articles and discussions
2. **github**: clone the repo (or multiple repos if comparing)
3. **bash**: `gh search issues "keyword" --repo owner/repo --limit 10 & gh search prs "keyword" --repo owner/repo --state merged --limit 10 & wait`

Then dig into the clone with **find**, **grep**, **read**, `git blame`, `git log` as needed.

## Step 3: Construct permalinks

Permalinks are the whole point. They make your answers citable and verifiable.

```
https://github.com/<owner>/<repo>/blob/<commit-sha>/<filepath>#L<start>-L<end>
```

Getting the SHA from a cloned repo:

```bash
cd /tmp/pi-github-repos/owner/repo && git rev-parse HEAD
```

Getting the SHA from a tag:

```bash
gh api repos/owner/repo/git/refs/tags/v1.0.0 --jq '.object.sha'
```

Always use full commit SHAs, not branch names. Branch links break when code changes. Permalinks don't.

## Step 4: Cite everything

Every code-related claim needs a permalink. Format:

```markdown
The stale time check happens in [`notifyManager.ts`](https://github.com/TanStack/query/blob/abc123/packages/query-core/src/notifyManager.ts#L42-L50):

\`\`\`typescript function isStale(query: Query, staleTime: number): boolean { return query.state.dataUpdatedAt + staleTime < Date.now() } \`\`\`
```

For conceptual answers, link to official docs and relevant source files. For implementation answers, every function/class reference should have a permalink.

## Failure recovery

| Failure | Recovery |
| --- | --- |
| grep finds nothing | Broaden the query, try concept names instead of exact function names |
| gh CLI rate limited | Use the already-cloned repo in /tmp/pi-github-repos/ for git operations |
| Uncertain about implementation | State your uncertainty explicitly, propose a hypothesis, show what evidence you did find |

## Guidelines

- Vary search queries when running multiple searches: different angles, not the same pattern repeated
- Prefer recent sources; filter out outdated results when they conflict with newer information
- For version-specific questions, clone the tagged version
- When the repo is already cloned from a previous **github** call, reuse it: check the path before cloning again
