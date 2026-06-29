---
name: fix-pr-ci
description: Fetch the current branch pull request’s CI logs, analyze reported failures, and fix them. Use when asked to investigate failing PR checks, or fix CI failures.
---

Use `gh` to inspect the pull request for the current branch, fetch failing CI logs, identify the root causes, and make the smallest code changes needed to fix all reported failures.

## Success criteria

- The current branch has an associated pull request.
- All failing, cancelled, or errored CI checks for that pull request have been inspected.
- Every code change traces directly to a reported CI failure.
- Relevant local validation passes, or any remaining failure is reported with evidence.

## Process

1. Confirm repository and pull request context:

   ```bash
   git status --short
   git branch --show-current
   gh pr view --json number,url,headRefName,baseRefName,statusCheckRollup
   ```

   If there is no pull request for the current branch, stop and ask the user how to proceed.

2. Inspect failing checks first:

   ```bash
   gh pr checks
   gh pr checks --json name,state,bucket,link,workflow --jq '.[] | select(.bucket == "fail" or .bucket == "cancel")'
   gh pr view --json statusCheckRollup --jq '.statusCheckRollup[] | select(.conclusion != "SUCCESS" and .conclusion != "SKIPPED" and .conclusion != null)'
   ```

3. Fetch logs for failed GitHub Actions runs. Prefer failed logs only; fall back to full logs when needed:

   ```bash
   gh run list --branch "$(git branch --show-current)" --limit 20
   gh run view <run-id> --json databaseId,displayTitle,event,status,conclusion,workflowName,url,jobs
   gh run view <run-id> --log-failed
   gh run view <run-id> --log
   ```

   If a check link contains `/actions/runs/<run-id>`, use that run ID. When a failed check exposes only a details URL, open it with `gh api` if it is a GitHub API URL; otherwise report that the check is external and summarize the accessible metadata.

4. Analyze before editing:
   - Group failures by root cause, not by repeated job output.
   - Prefer exact compiler, linter, test, and stack-trace messages over guesses.
   - Read the implicated source files and tests before changing anything.
   - Ignore unrelated warnings and unrelated failing checks unless they block the requested CI repair.

5. Fix failures with minimal edits:
   - Match existing project style and conventions.
   - Do not refactor, rename, reorganize, or broaden the change unless the CI failure requires it.
   - Do not silence tests, loosen assertions, disable lint rules, or skip checks unless the failure proves the check is wrong and the user agrees.
   - Preserve user edits and unrelated working-tree changes.

6. Validate locally with the closest matching commands from the logs first, then broader project validation when available. Examples:

   ```bash
   npm test
   npm run lint
   ```

7. Re-check CI status if the branch has been pushed or the user asks you to wait:

   ```bash
   gh pr checks --watch
   ```

## Output

Report concisely:

- Which CI runs or checks failed.
- The root cause of each failure.
- Files changed to fix them.
- Local validation commands run and their results.
- Any CI checks that could not be inspected or remain failing.
