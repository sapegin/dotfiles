# JavaScript and TypeScript

Read and follow [Clean code for JavaScript/TypeScript](../../_references/JavaScript.md).

## Type-system discipline

- **Type-system evasion:** Flag `any`, unjustified type assertions, non-null assertions, broad index signatures, duplicate domain types, overly optional fields, and `unknown` values used without proper narrowing. Prefer `satisfies` over `as` for object literals when it preserves useful literal types.
- **Constructive modeling:** When loose types force repeated checks, assertions, or impossible state combinations, represent only valid values with discriminated unions, non-empty tuples, tuple pairs, derived values, or branded primitives validated at creation. Do not strengthen types when the existing operations are already total.
- **Total signatures:** Treat `!`, unchecked indexing, and “should never happen” throws as evidence that an input should be strengthened or a result should include `undefined`; leave the empty case to the caller that understands it.
- **Narrowing:** Prefer discriminants, `in`, `typeof` or `instanceof`, and truthful type guards, in that order, before assertions. A type guard must verify its complete claim. Require `never` exhaustiveness checks for discriminated unions instead of silent or permissive `default` branches.

## Boundary types

Validate external data once where it enters the typed system, then trust the validated type internally. Persisted JSON needs parse-failure handling and versioning when its shape can evolve; wire formats should preserve forward compatibility using the schema tool’s supported unknown-field behavior. Derive types from generated schemas and existing source types with utilities such as `Pick`, `Omit`, `Parameters`, `ReturnType`, `Awaited`, and `typeof` instead of copying their shapes.

## Async hazards

Floating promises, missing `await`, needless serialization, races, stale updates, absent cleanup, and ignored cancellation.

## Framework cargo culting

Unnecessary effects, memoization without evidence, separately stored derived state, trivial custom hooks, and abstractions copied from patterns the repository does not use.

## Node.js misuse

Needless wrappers or polyfills around supported built-ins, shell commands where Node APIs suffice, unnecessary mixing of ESM and CommonJS, casual `process.exit()` calls that bypass cleanup, unclosed files, streams, or servers, unparsed environment configuration, and synchronous I/O on hot paths. Consistent use of either async or sync Node APIs.
