---
name: fix-pr-ci
description: Analyze and fix CI failures for current pull request.
disable-model-invocation: true
---

Fetch failing CI logs, identify the root causes, and make the smallest code changes needed to fix all reported failures.

## Success criteria

- All failing or errored CI checks for that pull request have been inspected.
- Every code change traces directly to a reported CI failure.
- Relevant local validation passes, or any remaining failure is reported with evidence.

## Process

1. Run the CI log checker:

   ```bash
   git-ci-logs
   ```

   It reports failed checks, fetches failed GitHub Actions logs, and identifies checks whose logs are external. If it cannot find a pull request for the current branch, stop and ask the user how to proceed.

2. Analyze before editing:
   - Group failures by root cause, not by repeated job output.
   - Prefer exact compiler, linter, test, and stack-trace messages over guesses.
   - Read the implicated source files and tests before changing anything.
   - Ignore unrelated warnings and unrelated failing checks unless they block the requested CI repair.

3. Fix failures with minimal edits:
   - Match existing project style and conventions.
   - Do not refactor, rename, reorganize, or broaden the change unless the CI failure requires it.
   - Do not silence tests, loosen assertions, disable lint rules, or skip checks unless the failure proves the check is wrong and the user agrees.
   - Preserve user edits and unrelated working-tree changes.

4. Validate locally with the closest matching commands from the logs first, then broader project validation when available. Examples:

   ```bash
   npm test
   npm run lint
   ```

## Output

Report concisely:

- Which CI runs or checks failed.
- The root cause of each failure.
- Files changed to fix them.
- Local validation commands run and their results.
- Any CI checks that could not be inspected or remain failing.
