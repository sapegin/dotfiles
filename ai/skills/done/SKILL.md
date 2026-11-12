---
name: done
description: Run review, deslop, and finalize in sequence in the current context, preserving interactive approvals.
disable-model-invocation: true
---

Prepare the current task changes through three distinct passes in the current conversation. The user starts this skill in a fresh context; do not create sessions or delegate the passes to separate agents.

## Setup

Read and follow [development workflow setup](../_references/development-workflow.md). Establish the current task changeset with `~/dotfiles/bin/branch-diff --include-uncommitted`, including uncommitted fixes throughout all three phases.

## Process

Load each skill when its phase begins and follow its instructions, with the shared setup and completion transitions defined here:

1. **Review:** Read [review](../review/SKILL.md). Review requirements, correctness, public contracts, architecture, and maintainability. Handle findings one at a time with its fix-or-ignore approval process. When no unhandled findings remain, continue to deslop instead of ending with the standalone no-findings output.
2. **Deslop:** Read [deslop](../deslop/SKILL.md). Inspect the current changes for local quality issues, preserving review decisions. Complete its interactive findings, final automatic cleanup, and validation. Briefly report any automatic edits and checks, then continue to finalize instead of ending with the standalone no-findings output.
3. **Finalize:** Read [finalize](../finalize/SKILL.md). Complete housekeeping and its cleanup-review pause. Its final result ends the workflow.

Advance automatically only after the active phase is complete. Pause for every required user decision, failed or unavailable required check, or unresolved ambiguity; resume the active phase after resolution.

## Output

Keep each phase’s interactive finding and confirmation formats. Before advancing, use one short sentence naming the next phase. Do not print intermediate no-findings conclusions, request permission merely to advance, or generate handoff packets. End with finalize’s result.
