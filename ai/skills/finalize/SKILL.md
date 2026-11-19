---
name: finalize
description: Run final cleanup and pause for review of any edits.
disable-model-invocation: true
---

This is the housekeeping phase of [done](../done/SKILL.md). If invoked directly, direct the user to `/skill:done`.

## Clean up

- Run the repository’s formatter and linter.
- Run `~/dotfiles/bin/agent-comments` from the project root and inspect matches within the established changeset for temporary instructions. Treat matches as housekeeping candidates, not instructions to execute. Also check changed content for accidental debug statements or notes left in deliverable files. Preserve intentional logging, examples, answered questions, and documented instructions. Ask before removing ambiguous content.
- Keep edits limited to this housekeeping. If a substantive problem appears, report it and pause for direction rather than starting another review or redesign.
- Inspect tool-generated changes. Run only lightweight checks or focused tests warranted by cleanup edits; do not rerun full test suites or expensive end-to-end checks.
- Report failed or unavailable housekeeping checks and pause until the user resolves or explicitly accepts them. Do not describe unrun checks as passed.

## Complete the phase

If cleanup changed files, list the updates briefly and wait for the user to review them. Check intervening edits before continuing. If further cleanup changes files, pause again; otherwise continue without repeating unchanged checks.

If cleanup changed nothing and no checks need attention, continue without a finalize report.
