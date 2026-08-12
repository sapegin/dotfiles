---
name: later
description: Capture an idea or task related to the current work in the Obsidian Later inbox without interrupting the current task.
disable-model-invocation: true
argument-hint: Idea or task to capture
---

Capture the user’s argument in `~/murder/0-Inbox/Later.md`, enriched only with context already available in the conversation and working tree.

## Compose the entry

Use the argument as a concise Markdown heading. Write one short free-form paragraph that makes the note understandable after the present conversation has been forgotten:

- say what the user was doing when the idea arose;
- explain why the note was created or deferred;
- mention only files, symbols, decisions, or constraints needed to recognize and resume it.

Do not use fixed sections, investigate the deferred work, or invent missing details. Avoid repeating the heading in the paragraph. If the argument and available context are already self-sufficient, keep the paragraph to one sentence.

## Append the entry

Run the `later` CLI from the current working directory so it can collect Git metadata. Pass the heading and paragraph as separate quoted arguments:

```bash
later "$heading" "$paragraph"
```

The CLI adds the current date-time, repository, and branch. Report success only after it exits successfully. Do not continue work on the captured item.
