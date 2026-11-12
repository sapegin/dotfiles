---
name: finalize
description: Run final cleanup and pause for review of any edits.
disable-model-invocation: true
---

Prepare the current changes for handoff after review and deslop. This is a housekeeping pass, not another review or correctness audit.

## Process

### 1. Establish context

Read and follow [development workflow setup](../_references/development-workflow.md) for target resolution, prior decisions, and verification evidence. Do not assume earlier review, cleanup, or verification occurred without evidence in the conversation.

### 2. Clean up

- Run the repository’s formatter and linter.
- Check the changed content for accidental debug statements, temporary agent instructions (such as `// AI:` comments) or notes left in deliverable files. Preserve intentional logging, examples, and documented instructions. Ask before removing ambiguous content.
- Keep edits limited to this housekeeping. If a substantive problem appears, report it and pause for direction rather than starting another review or redesign.
- Inspect tool-generated changes. Run only lightweight checks or focused tests warranted by cleanup edits; do not rerun full test suites or expensive end-to-end checks.
- Report failed or unavailable housekeeping checks and pause until the user resolves or explicitly accepts them. Do not describe unrun checks as passed.

### 3. Pause after edits

If cleanup changed files, list the updates briefly, then ask the user to review them before considering the task finished. Wait for a response before ending.

Check intervening edits before ending. If further cleanup changes files, pause again; otherwise end without repeating unchanged checks.

## Output

- If cleanup changed nothing, end with no finalize report. Do not narrate clean checks, absent debris, or that no cleanup was needed.
- If cleanup changed files, report only a brief bullet list of the updates, then end with the review pause.
- Still report failed or unavailable housekeeping checks and pause as required above. Do not repeat earlier verification as if it ran during this invocation.
