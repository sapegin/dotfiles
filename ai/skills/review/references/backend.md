# Backend and data

## Behavioral correctness

Logic errors, wrong assumptions, incorrect conditions or defaults, boundary and off-by-one mistakes, ordering assumptions, duplicate operations, partial failures, and subtle changes in business or user-visible behavior. Consider empty input, repeated actions, locale, currency, dates, time zones, and other relevant edge cases. State machines with unhandled status branches or `default:` paths that silently no-op.

## State and concurrency

Ownership and synchronization across local state, global state, caches, URLs, processes, threads, and persistent stores. Stale values, races, deadlocks, unsafe shared mutation, redundant derived state, lost updates, incorrect asynchronous ordering, obsolete asynchronous results overwriting current ones, and check-then-act on shared resources.

## Data and contracts

API and event shapes, types, units, optionality, validation, parsing, serialization, pagination, unknown variants, cache invalidation, and assumptions made across trust boundaries.

## Persistence and migrations

Transaction boundaries, atomicity, idempotency, schema and data migration ordering, mixed-version operation, rollback safety, destructive changes, and preservation of existing data.

## Errors and recovery

Unhandled null values, exceptions, and error-as-data variants; swallowed failures; false success; indefinite loading or waiting; unsafe retries; lost user input; partial state left after failure; unhelpful fallbacks; and errors without a practical recovery path.

## Side effects and resources

Files, network calls, database operations, subprocesses, routing, storage, analytics, timers, subscriptions, event listeners, cleanup, cancellation, signals, and shutdown behavior. Paths, encodings, resource ownership, repeated execution, and cleanup or cancellation across every completion, error, and superseded-work path.

## Node.js runtime

Compatibility with the supported Node version and module system; environment-variable parsing; process exit codes, signals, and shutdown; file, stream, and server cleanup; stream errors; child-process arguments and exit handling; and whether synchronous I/O is appropriate for the execution path.

## Performance and scale

Raise performance findings only when the changed path has a plausible scale, frequency, or user-visible cost. N+1 query/fetch per item in loops or list rendering; nested scans where a keyed lookup belongs; over-fetching and missing pagination on unbounded lists; synchronous work that belongs in a queue; missing indexes implied by query patterns (flag for verification only — do not claim without schema evidence).
