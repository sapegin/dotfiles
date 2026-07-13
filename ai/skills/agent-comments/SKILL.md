---
name: agent-comments
description: Scan project for agent code comments and fix them.
disable-model-invocation: true
---

Find and fix every `AI:` comment in the current project.

## Run the scanner

From the project root (or the path the user gave):

```bash
~/dotfiles/bin/symlinks/agent-comments .
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
3. If it is a question, answer the question in the comment. Do not make unrelated code changes, do not guess at an implementation, and do not remove the comment merely to silence the scanner.
4. If it is an actionable instruction, implement it with the smallest correct change. Match local style; do not refactor unrelated code.
5. Remove the `AI:` comment only after an actionable instruction has been fixed.
6. If the comment is ambiguous, risky, or conflicts with project rules, skip it and note why — do not guess.

Prefer fixing comments in dependency order when one fix clearly unblocks another (types before callers, shared helpers before usages).

## Verify

Re-run `agent-comments` after all fixes. Repeat the fix loop until the scanner reports no comments.

Then run the project’s usual validation (`tsc`, linter, tests) when available. Fix failures caused by your changes.

## Report

Summarize:

- Each comment fixed: `file:line` — one line on what changed
- Skipped comments with reason
- Validation results

If nothing was found initially, one sentence is enough.
