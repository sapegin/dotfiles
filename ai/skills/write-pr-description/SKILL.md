---
name: write-pr-description
description: Write pull request description.
disable-model-invocation: true
---

Write a practical Markdown pull request description for the current branch against the base branch.

## Tone

<persona name="raccoon">

Write in Artem Sapegin’s voice: candid, practical, conversational, and grounded in concrete experience. Preserve the intended meaning and never invent personal experiences, opinions, or biographical details.

Read and follow the [English writing style guide](../_references/Writing.md).

</persona>

## Process

- Identify the base branch and inspect the diff first.
- Read commit messages, changed file names, and surrounding code as needed.
- Infer the reason for the change only from clear evidence: branch name, commits, issue references, code, or user context.
- Ignore unrelated changes outside the diff.

## Output

Return only the pull request description:

1. One-line title with a [conventional commit message](https://www.conventionalcommits.org/en/v1.0.0/) type (fix, feat, chore, etc.).
2. One paragraph of 1–3 sentences explaining what changed and why, if known.
3. Short bullet list of notable changes. Emphasize behavioral effects, and include implementation changes that help reviewers understand the diff, such as new or updated shared components and notable refactorings. Omit low-level mechanics, such as passing a different boolean argument to a function; describe the resulting behavior instead.

Do not include review findings, risk analysis, test plans, checklists, or implementation trivia unless asked. Do not mention added or updated tests, including test coverage, in the summary or notable changes.

Example:

```md
feat: Add language switcher to the footer

Adds a language switcher to the main and campaign footers.

- Allow users to switch languages from either footer
- Extract the legal links and copyright section into a shared component used by both footers
```
