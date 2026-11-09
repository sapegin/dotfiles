---
name: finalize
description: Run final cleanup, pause for review of any edits, and offer to open a pull request.
disable-model-invocation: true
---

Prepare the current changes for handoff after review and deslop. This is a housekeeping pass, not another review or correctness audit.

## Process

### 1. Establish context

Read and follow [development workflow setup](../_references/development-workflow.md) for target resolution, prior decisions, and verification evidence. Do not assume earlier review, cleanup, or verification occurred without evidence in the conversation.

### 2. Clean up

- Run the repository’s formatter and linter.
- Check the changed content for unresolved conflict markers, accidental debug statements, and temporary agent instructions (such as `// AI:` comments) or notes left in deliverable files. Preserve intentional logging, examples, and documented instructions. Ask before removing ambiguous content.
- Keep edits limited to this housekeeping. If a substantive problem appears, report it and pause for direction rather than starting another review or redesign.
- Inspect tool-generated changes. Run only lightweight checks or focused tests warranted by cleanup edits; do not rerun full test suites or expensive end-to-end checks.
- Report failed or unavailable housekeeping checks and pause before offering publication until the user resolves or explicitly accepts them. Do not describe unrun checks as passed.

### 3. Pause after edits

If cleanup changed files, summarize the edits and checks, then ask: “May I (c)ommit these changes, or (s)kip and continue without committing?” Wait for the user to review and respond before proceeding.

If approved, commit only the reviewed cleanup changes with the message `Cleanup`. Preserve unrelated staged and unstaged work; ask if the cleanup cannot be isolated safely.

Check intervening edits before continuing. If further cleanup changes files, pause again; otherwise proceed to the handoff without repeating unchanged checks.

### 4. Offer the handoff

Check the current branch before offering publication. If it is `main`, suggest a concise branch name based on the task and repository conventions. Ask: “Use `<branch-name>`? (a)pprove, or type another branch name.” Wait for approval or an alternative name; an explicit alternative approves that name. Validate the name and check that it does not already exist locally or on the remote. If invalid or taken, ask for another name. Create and switch to the approved branch from the current HEAD, preserving staged, unstaged, and untracked work. Do not reset or rewrite `main`. Branch-name approval does not authorize commits or publication.

Use the [GitHub skill](../github/SKILL.md) to identify any existing pull request for the intended branch. If GitHub access is unavailable, report that limitation and offer a local handoff instead.

Ask: “May I (o)pen a pull request?” If one already exists, ask instead: “May I (u)pdate the existing pull request?” Wait for approval; stop if the user declines. Do not push or create or edit a pull request until the user approves that action. Reuse an existing pull request rather than creating a duplicate.

After approval:

- Recheck the branch and working tree. If the branch is `main` or differs from the approved publication branch, pause for direction. If task changes are uncommitted, prepare the next action and stop; never commit automatically. Do not publish a partial branch while implying it includes uncommitted work.
- Load [write-pr-description](../write-pr-description/SKILL.md) to generate the title and body from the final branch diff. Use its title as the pull request title and the remaining copy as the body. Keep verification evidence in the completion report rather than adding it to the pull request copy.
- Push the intended branch and create or update the pull request using the GitHub skill. Do not force-push, merge, release, or deploy.
- Return the pull request URL and report publication failures plainly.

## Output

Use parenthesized letter choices for confirmation prompts. Interpret the indicated letters case-insensitively as the corresponding actions; accept explicit instructions as well.

Keep progress and completion reports short:

- Summarize cleanup performed, or state that no cleanup was needed.
- Report checks using the applicable verification format, distinguishing completed, skipped, failed, and unavailable checks. Do not repeat earlier verification as if it ran during this invocation.
- End with either the review-and-continue pause or the pull request offer, never both. After approved publication, end with its result instead.
