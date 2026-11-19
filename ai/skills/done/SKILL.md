---
name: done
description: Run review, deslop, and finalize in sequence, preserving interactive approvals, then refresh the configured commit draft if needed.
disable-model-invocation: true
---

Prepare the current task changes through three distinct passes in the current conversation. The user starts this skill in a fresh context; do not create sessions or delegate the passes to separate agents.

## Setup

Read the repository instructions and run `~/dotfiles/bin/branch-diff` without arguments. If it fails, ask for clarification. Identify task changes and preserve unrelated work. Keep the initial scope across phases, reading the current changes and any edits made during the run. If a clean feature branch becomes dirty, keep its committed diff in scope.

Establish intended behavior from the user’s requirements, specifications, approved decisions, callers, tests, types, schemas, and documentation. Treat implementation descriptions as context unless they record an approved requirement change. Resolve conflicting requirements before reporting findings.

Carry forward approvals and ignored findings. Revisit a decision only when new evidence warrants it, and explain that evidence before asking for approval. Approval of one fix doesn’t authorize other fixes, commits, or publication.

Reuse earlier checks only if their command, result, and checked state are known and relevant inputs haven’t changed. Label reused results as earlier evidence. Otherwise, rerun the checks or mark the evidence stale or unknown. Follow the active phase’s validation requirements.

## Process

Load and complete each phase in order:

1. [Review](../review/SKILL.md)
2. [Deslop](../deslop/SKILL.md)
3. [Finalize](../finalize/SKILL.md)

Advance automatically only after the active phase is complete. Pause for every required user decision, failed or unavailable required check, or unresolved ambiguity; resume the active phase after resolution.

## Commit draft

After finalize and any required cleanup approval, inspect the pending task changes, including staged and unstaged edits. Resolve the absolute draft path with `git rev-parse --path-format=absolute --git-path COMMIT_DRAFT`. Use it only if it matches the effective `commit.template` from `git config --get commit.template`; otherwise skip this step.

Update the draft only if pending task changes warrant a commit message and the existing message does not already fit. Inspect up to 20 recent non-merge commit subjects (`git log -20 --no-merges --format=%s`) and follow the prevailing convention, such as Conventional Commits. Keep the subject short and the body focused on essential changes and rationale. Omit incidental tests, docs, and cleanup; describe them when they are the purpose of the change. Preserve user-written drafts and ask before replacing text of unclear ownership. Do not stage or commit as part of this step.

## Output

Keep each phase’s interactive finding and confirmation formats. Before advancing, use one short sentence naming the next phase. Do not print intermediate no-findings conclusions, request permission merely to advance, or generate handoff packets. After all three phases and the commit draft step, include a **Manual testing** section only if changed behavior still needs a human check that automation couldn’t cover. For each check, state the setup (such as the screen reader, browser, or physical device), what to do, and what to expect. Present these as checks still to run, separate from completed verification. If a required check is blocked, follow the pause rule above.

End with this sign-off: “Huzzah! The review is complete. I took the liberty of tidying up.” Send it even when finalize made no edits. Omit routine draft updates from the reply unless asked.
