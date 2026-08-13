---
name: sentry
description: Investigate a Sentry issue, trace it into the current codebase, and assess its cause, impact, and suggest the smallest fix.
disable-model-invocation: true
argument-hint: Sentry issue ID
---

Investigate one Sentry issue in the current repository using the new `sentry` developer CLI.

## Input

Accept exactly one Sentry short issue ID, such as `WEB-123` or `FRONTEND-WQ`.

## Prerequisites

Assume the `sentry` command is installed and authenticated.

## Investigation

1. Run `sentry issue view <issue-id> --json`. Let the CLI detect the organization and project; specify them only if detection fails or chooses the wrong target.
2. Gather representative event evidence when the issue view lacks a complete stack trace, breadcrumbs, request details, release, environment, tags, or runtime context. Prefer the recommended event when available; otherwise inspect the latest event. Use `sentry issue events <issue-id> --json` and `sentry event view` as needed. Run the relevant command with `--help` rather than guessing unsupported arguments.
3. Inspect the implicated code and history. Determine whether the application can produce the failing state and, when practical, reproduce the observable behavior.
4. Sample more events only when necessary to determine whether the issue groups several causes or to assess recurrence.

Remain read-only in Sentry. Do not resolve, archive, assign, merge, or otherwise mutate the issue.

## Report

Report:

- whether the issue is genuine;
- the evidence and likely root cause;
- frequency, affected users, first seen, and last seen when available;
- whether the current application can still generate the failing state;
- suggested severity;
- the smallest credible fix and meaningful verification.
