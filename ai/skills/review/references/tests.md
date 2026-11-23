# Tests

## Meaningful tests

Consequential new paths and regressions without coverage. Map critical paths (money, auth, data mutation, core product behavior) and flag dangerous paths with zero or trivial coverage. Modules with high git churn and no tests as “characterization tests first” candidates. Missing coverage at public boundaries, such as unit tests with no API integration coverage. Absence of a one-command verification baseline as a prerequisite for risky changes.

For UI behavior, prefer end-to-end tests of the complete page. Use component tests when they can exercise the whole contract in isolation and a page test adds no meaningful coverage. Use unit tests as a last resort, mainly for business logic and low-level code. Check important error cases and boundaries at the level where they can be exercised reliably.

At any UI test level, use semantic controls, locating them by role and accessible name where possible. Assert outcomes users can observe. A test should fail for the defect it claims to prevent and survive refactoring that preserves behavior. Flag assertions that rely on component state, incidental DOM structure, or other implementation details.

Flag tests and assertions that add no confidence beyond existing coverage. Look for gaps in behavior that matters rather than chasing a coverage percentage.

When UI flows change, check whether keyboard-only paths and screen-reader-relevant names, roles, and states are covered — especially route transitions, dialogs, form errors, and async status updates. Use the repo’s automated accessibility checks when they exist.

For screen-reader announcements, DOM assertions and automated accessibility scans verify prerequisites, not actual speech. Require assistive-technology confirmation or mark announcement behavior unverified.

## Test reliability

Tests that depend on live external APIs, network access, wall-clock timing, arbitrary sleeps or timeouts, shared mutable state, nondeterministic ordering, brittle snapshots, excessive mocking, or needless complexity.
