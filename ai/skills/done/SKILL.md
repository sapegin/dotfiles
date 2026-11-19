---
name: done
description: Run review, deslop, and finalize in sequence, preserving interactive approvals, then refresh the configured commit draft if needed.
disable-model-invocation: true
---

Prepare the current task changes through three distinct passes in the current conversation. The user starts this skill in a fresh context; do not create sessions or delegate the passes to separate agents.

## Setup

Read and follow [development workflow setup](../_references/development-workflow.md), using its `done` invocation rules throughout all three phases.

## Process

Load each skill when its phase begins and follow its instructions, with the shared setup and completion transitions defined here:

1. **Review:** Read [review](../review/SKILL.md). Review requirements, correctness, public contracts, architecture, and maintainability. Handle findings one at a time with its fix-or-ignore approval process. When no unhandled findings remain, continue to deslop instead of ending with the standalone no-findings output.
2. **Deslop:** Read [deslop](../deslop/SKILL.md). Inspect the current changes for local quality issues, preserving review decisions. Complete its interactive findings, final automatic cleanup, and validation. Briefly report any automatic edits and checks, then continue to finalize instead of ending with the standalone no-findings output.
3. **Finalize:** Read [finalize](../finalize/SKILL.md). Complete housekeeping and wait for any required cleanup review.

Advance automatically only after the active phase is complete. Pause for every required user decision, failed or unavailable required check, or unresolved ambiguity; resume the active phase after resolution.

## Commit draft

After finalize and any required cleanup approval, inspect the pending task changes, including staged and unstaged edits. Resolve the absolute draft path with `git rev-parse --path-format=absolute --git-path COMMIT_DRAFT`. Use it only if it matches the effective `commit.template` from `git config --get commit.template`; otherwise skip this step.

Update the draft only if pending task changes warrant a commit message and the existing message does not already fit. Inspect up to 20 recent non-merge commit subjects (`git log -20 --no-merges --format=%s`) and follow the prevailing convention, such as Conventional Commits. Keep the subject short and the body focused on essential changes and rationale. Omit incidental tests, docs, and cleanup; describe them when they are the purpose of the change. Preserve user-written drafts and ask before replacing text of unclear ownership. Do not stage or commit as part of this step.

## Output

Keep each phase’s interactive finding and confirmation formats. Before advancing, use one short sentence naming the next phase. Do not print intermediate no-findings conclusions, request permission merely to advance, or generate handoff packets. After all three phases and the commit draft step, end with a visible reply: “Review, deslop, and finalize are complete.” Send it even when finalize made no edits and would end silently on its own. Omit routine draft updates from the reply unless asked.
