---
name: agent-comments
description: Scan project for agent code comments and fix them.
disable-model-invocation: true
---

Find and fix every `AI:` comment in the current project.

## Run the scanner

From the project root (or the path the user gave):

```bash
~/dotfiles/bin/agent-comments
```

Empty output means there is nothing to fix — say so and stop.

## Parse the output

Each comment is a block:

```text
path/to/file.ts:42
The instruction text
```

Blocks are separated by a blank line. The first line is `file:line`; the rest is the instruction.

## Fix each comment

Work through every comment before re-scanning.

1. Read the file around the reported line and enough surrounding code to understand context.
2. Decide whether the comment is asking a question or giving an actionable instruction.
3. If it is a question, follow the chat workflow below before moving on.
4. If it is an actionable instruction, implement it with the smallest correct change. Match local style; do not refactor unrelated code. Remove the `AI:` comment after the fix.
5. If the comment is ambiguous, risky, or conflicts with project rules, skip it and note why — do not guess.

Prefer fixing comments in dependency order when one fix clearly unblocks another (types before callers, shared helpers before usages).

## Answer questions in chat

Answer one question per turn using this template, then wait for the user’s reply:

```md
{file:line}

**{answer}**

(R)eply, or tell what to do.
```

Leave the comment and code unchanged unless the user requests a change. If they reply `R`, remove only the current comment. If they give an instruction that resolves the question, remove the comment after carrying it out. If they ask a follow-up, answer it using the same template. Move on to the next comment only after resolving the current question.

## Verify

Re-run `~/dotfiles/bin/agent-comments` after all fixes. Repeat the fix loop until the scanner reports no comments or only deliberately skipped comments remain.

Then run the project’s usual validation (`tsc`, linter, tests) when available. Fix failures caused by your changes.

## Report

Summarize:

- Each comment fixed: `file:line` — one line on what changed
- Skipped comments with reason
- Validation results

If nothing was found initially, one sentence is enough.
