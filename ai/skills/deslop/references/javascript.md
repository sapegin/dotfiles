# JavaScript and TypeScript

Read and follow [Clean code for JavaScript/TypeScript](../../_references/JavaScript.md).

## Type-system evasion

Flag `any`, unjustified type assertions, non-null assertions, broad index signatures, duplicate domain types, overly optional fields, and `unknown` values used without proper narrowing.

## Async hazards

Floating promises, missing `await`, needless serialization, races, stale updates, absent cleanup, and ignored cancellation.

## Framework cargo culting

Unnecessary effects, memoization without evidence, separately stored derived state, trivial custom hooks, and abstractions copied from patterns the repository does not use.

## Node.js misuse

Needless wrappers or polyfills around supported built-ins, shell commands where Node APIs suffice, unnecessary mixing of ESM and CommonJS, casual `process.exit()` calls that bypass cleanup, unclosed files, streams, or servers, unparsed environment configuration, and synchronous I/O on hot paths. Consistent use of either async or sync Node APIs.
