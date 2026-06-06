---
name: write-pr-description
description: Write a concise pull request description for the current branch compared to the base branch. Use when preparing pull request text, summarizing branch changes, or drafting a pull request body.
---

Write a practical Markdown pull request description for the current branch against the base branch.

## Process

- Identify the base branch and inspect the diff first.
- Read commit messages, changed file names, and surrounding code as needed.
- Infer the reason for the change only from clear evidence: branch name, commits, issue references, code, or user context.
- Ignore unrelated changes outside the diff.

## Output

Return only the pull request description:

1. One-line title.
2. One paragraph of 1–3 sentences explaining what changed and why, if known.
3. Short bullet list of notable changes.

Do not include review findings, risk analysis, test plans, checklists, or implementation trivia unless asked.

Example:

```md
Add language switcher to the footer

Adds a language switcher to the main and campaign footers.

- Move footer-related files to a dedicated folder
- Extract the legal links and copyright section into a reusable component
- Add `LanguageSwitcher` to the footer and header
```
