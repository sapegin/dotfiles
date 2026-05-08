---
name: write-pr-description
description: Write a concise pull request description for the current branch compared to the base branch. Use when preparing pull request text, summarizing branch changes, or drafting a pull request body.
---

Write a pull request description for the changes in the current branch in comparison to the base branch.

## Process

- Identify the base branch and inspect the diff before reading broader context.
- Read commit messages, changed file names, and surrounding code needed to understand the change.
- Infer the reason for the change only when it is clear from the branch, commits, issue references, code, or user context.
- Do not mention unrelated changes unless they are part of the diff.

## Output

Return only the pull request description in Markdown:

1. A one-line title.
2. A paragraph of 1-3 sentences explaining the nature of the change and the reason behind it, if known.
3. A short bullet list of notable code changes without excessive detail.

Keep the description practical and specific. Do not include review findings, risk analysis, test plans, checklists, or implementation trivia unless the user asks for them.

Example:

```md
Add language switcher to the footer

Adds language switcher to both — main and campaign — footers.

- Move all footer-related files to a new folder
- Extract bottom section of the footer (with legal links and copyright) to a component and reuse it in both footers
- Add `LanguageSwitcher` component that is used in the footer and header
```
