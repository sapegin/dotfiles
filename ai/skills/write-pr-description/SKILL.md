---
name: write-pr-description
description: Write pull request description.
disable-model-invocation: true
---

Write a practical Markdown pull request description for the current branch against the base branch.

## Tone

Read and follow the [English writing style guide](../_references/writing.md).

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

4. A fenced `mermaid` diagram when it makes complex flow, interactions, or state transitions easier to understand. Show only relevant behavior supported by the code; omit diagrams for straightforward changes.
5. A `## Merge risk` section with a **Low**, **Medium**, or **High** rating and a brief, evidence-based rationale. Weigh change size and complexity, blast radius, critical paths touched (such as authentication, payments, or data integrity), compatibility, migrations, deployment dependencies, verification gaps, and difficulty of reverting. A small diff can still be high risk. Name material uncertainties rather than assuming safety.
6. A `## How to test` section where applicable, with concrete prerequisites, actions, and expected results for the changed behavior and relevant edge cases or regressions. Derive steps from the code and available documentation; do not invent commands, accounts, or environments. Omit this section when manual testing adds no value, and note any missing prerequisites that prevent useful instructions. Present these as steps to perform, not as tests already passed.

Do not include review findings, checklists, or implementation trivia unless asked. Do not mention added or updated tests, including test coverage, in the summary or notable changes.

Example:

```md
feat: Add language switcher to the footer

Adds a language switcher to the main and campaign footers.

- Allow users to switch languages from either footer
- Extract the legal links and copyright section into a shared component used by both footers

## Merge risk

**Low** — Localized footer changes with no data or deployment changes. Reverting restores the previous footers.

## How to test

1. Open a page with the main footer and a campaign page. Confirm both show the language switcher.
2. Switch to another available language from each footer. Confirm the page uses the selected language.
3. Check both footers at a narrow viewport. Confirm the switcher, legal links, and copyright remain readable and usable.
```
