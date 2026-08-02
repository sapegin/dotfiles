# Tests

## Meaningful tests

Consequential new paths and regressions without coverage. Map critical paths (money, auth, data mutation, core product behavior) and flag dangerous paths with zero or trivial coverage. Modules with high git churn and no tests as “characterization tests first” candidates. Missing layers (unit-only with no API-boundary integration, or slow E2E for what a unit test would catch). Absence of a one-command verification baseline as a prerequisite for risky changes.

For unit tests, check important negative paths, error cases, boundaries, and edge cases. For integration tests, verify user-visible behavior through semantic queries for content and controls that users can interact with, rather than component state, DOM structure, or other implementation details. Ensure tests exercise public behavior, can fail for the defect they claim to prevent, and do not reproduce implementation logic.

When UI flows change, check whether keyboard-only paths and screen-reader-relevant names, roles, and states are covered — especially route transitions, dialogs, form errors, and async status updates. Use the repo’s automated accessibility checks when they exist.

## Test reliability

Tests that depend on live external APIs, network access, wall-clock timing, arbitrary sleeps or timeouts, shared mutable state, nondeterministic ordering, brittle snapshots, excessive mocking, or needless complexity.
