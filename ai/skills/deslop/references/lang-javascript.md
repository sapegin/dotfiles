# Clean code for JavaScript and TypeScript

Guidance from Artem Sapegin’s [Washing your code](https://sapegin.me/book/) book, with JS/TS idioms (see also `~/_/washingcode-book/ai/Rules.md`).

Prioritize readability and maintainability over cleverness or brevity. Make impossible states impossible. Use the type system to catch errors at compile time rather than runtime.

## Avoid loops

- Prefer array methods (`map`, `filter`, `find`, `some`, `every`) over traditional `for` loops.
- Use `for...of` when side effects are needed; never `for...in` on arrays or C-style index loops when a higher-level form is clearer.
- Avoid `forEach` when `for...of` reads better or allows early exit.
- Prefer one step per idea; chain steps (`array.map().filter()`) instead of one dense callback when two names would help.
- Avoid `reduce` except small idiomatic aggregates (e.g. summing numbers).
- Use a plain loop when side effects, early exit, or async sequencing read clearer than a functional combinator — clarity wins over style.

## Avoid conditions

- Replace multipart or negated condition soup with well-named booleans or small functions.
- Prefer lookup maps or tables when behavior is data-driven dispatch instead of long `if`/`switch` chains.
- Prefer explicit comparisons: `array.length === 0` / `array.length > 0`, not `!array.length` / `array.length` alone.
- Use `===` / `!==`, not `==` / `!=`.
- Convert irregular input once at the boundary, then run generic logic on a uniform shape.
- Avoid duplicating the same algorithm for “has data” and “no data” branches when normalization can merge them.

## Avoid reassigning variables

- Prefer `const` by default; use `let` only when reassignment is required.
- Prefer bindings that are assigned once and never repurposed; use a new name when the meaning changes.
- Declare as close to first use as possible.
- Build complete values in one expression or one place instead of incrementally patching when that reads clearer.
- Use destructuring with defaults instead of assign-then-maybe-overwrite patterns.

## Avoid mutation

- Never mutate function parameters or passed objects/arrays unless the API requires it.
- Prefer creating new values (spread, copies) over changing existing objects in place.
- Prefer `toSorted()` / `toReversed()` instead of mutating `sort()` / `reverse()`.
- When mutation is necessary, keep it local, obvious, and documented by the function name or type.

Readers cannot assume a value still matches what an earlier line showed; hidden mutation in helpers causes distant bugs.

## Comments

- Remove comments that narrate syntax, repeat names, or over-explain obvious code.
- Keep JSDoc on exported functions, methods, and types when that is an existing file or project convention — brief exported API docs are intentional, even when they restate the name. Do not use JSDoc to narrate implementation line by line.
- Add concise comments when code depends on non-obvious constraints, external knowledge, workarounds, or decisions that cannot be recovered from the code alone. Explain _why_, not _what_.
- If a comment only restates _what_, try renaming or extracting first — but do not extract a one-off function whose only job is to carry a comment sentence.
- Keep precise TODOs that document intentionally deferred work or known scope limits; resolve or flag low-effort TODOs that can be completed safely in the current change. Use HACK for temporary workarounds — remove when done.
- Drop outdated explanations, commented-out code, and change-history journals.

## Naming

- Use descriptive, searchable names; avoid abbreviations (`lineNumber`, not `lineNum`) and mystery acronyms except established domain terms.
- Single-letter names only in tiny scopes (short callbacks, index in a three-line loop).
- Use US English spelling in shared code unless the project standard differs.
- Functions and methods: verbs or verb phrases (`fetchWeather`, `getUserData`).
- Variables and properties: nouns.
- More than two parameters is a smell; any positional boolean parameter is a smell — use an options object or split functions.
- At call sites, readers should not need to open the callee to decode `null` or bare `true`/`false`.
- Prefer positive predicates (`isVisible`, `hasData`) over negatives (`isNotHidden`, `hasNoData`).

## Divide and conquer

- Duplication is cheaper than the wrong abstraction — wait until the similarity is real, not superficial.
- If an abstraction needs many conditions and options, consider splitting into separate modules.
- Extract when it lowers cognitive load: hides complexity, names a step in a narrative, or isolates a reusable boundary.
- Do not chop a linear algorithm into many one-line functions in separate files if readers must jump everywhere to follow the flow.
- Code length alone is not a split signal; unreadable mixing of abstraction levels is.
- Single responsibility in practice: one reason to change at a time, not “exactly N lines”.
- Early returns and guard clauses to flatten nesting.
- Avoid premature abstraction — solve the current requirement. Reject one-use helpers, pass-through wrappers, factories, speculative options, and extension points for hypothetical futures.
- Use an options object when arity grows.

## Don’t make me think

- Brevity is not clarity — shortest code that passes tests is often not the clearest.
- Avoid puzzle idioms (obscure operators, nested ternaries, dense one-liners, bitwise tricks) when a straightforward form exists.
- Prefer APIs meant for humans reading code (`includes` over `~indexOf`, template literals over awkward concatenation, `Math.trunc` over `~~`).
- Reduce the next reader’s cognitive load; if you hesitate, so will they.
- Do not shrink code at the cost of naming, conditions, or mutation safety.

## Clarity

- Replace unexplained numeric literals with named constants when the name captures a real constraint or domain concept; keep obvious local values inline.

## Other techniques

### Make impossible states impossible

- Replace several exclusive boolean flags with one state type (discriminated union or string literal union).
- Model loading / success / error / idle explicitly instead of independent `isLoading` and `hasError` that can both be true.
- Let TypeScript reject invalid combinations.

### Normalize input

- Normalize at the boundary — function entry, API layer, parser — not in every consumer.
- An array is always an array: use `[]` for no data, never `undefined`, `null`, or sparse arrays like `[null]`.
- Use default parameters, nullish coalescing (`??`), or explicit conversion once, then run a generic algorithm on the normalized data.
- Prefer fixing the producer or schema over defensive checks scattered through business logic.
- Convert to wire/backend shapes at the edge when raw formats would force non-idiomatic code in the core.

### Errors and state in types

- Make error and empty states explicit in type definitions.
- Avoid try/catch for ordinary control flow — reserve it for real failures.
- Use optional chaining (`?.`) and nullish coalescing (`??`) when they shorten safe paths without hiding bugs.

## TypeScript

- Strict configuration; never `any`; use `unknown` and narrow.
- Prefer `type` over `interface` for object shapes unless project convention differs.
- `readonly` on data that should not mutate.
- Group related constants; prefer aligned prefixes (`SIZE_SMALL`) or string enums (`Size`, `OrderStatus`) when transpiled normally.
- Use `as const` objects plus derived union types when types are stripped (`erasableSyntaxOnly`, native Node TS) — enums emit runtime code.
- Flag unjustified type assertions, non-null assertions, broad index signatures, duplicate domain types, and overly optional fields. Prefer `satisfies` over `as` for object literals when it preserves useful literal types.
- When loose types force repeated checks or impossible combinations, model only valid values (discriminated unions, non-empty tuples, branded primitives validated at creation). Do not strengthen types when operations are already total.
- Treat `!`, unchecked indexing, and “should never happen” throws as evidence that an input should be strengthened or a result should include `undefined`.
- Prefer discriminants, `in`, `typeof` / `instanceof`, and truthful type guards before assertions. Require `never` exhaustiveness checks for discriminated unions instead of silent `default` branches.
- Validate external data once where it enters the typed system, then trust the validated type internally. Derive types from schemas and source with `Pick`, `Omit`, `Parameters`, `ReturnType`, `Awaited`, `typeof` instead of copying shapes.

## Async hazards

Floating promises, missing `await`, needless serialization, races, stale updates, absent cleanup, and ignored cancellation.

## Framework cargo culting

Unnecessary effects, memoization without evidence, separately stored derived state, trivial custom hooks, and abstractions copied from patterns the repository does not use.

## Node.js misuse

Needless wrappers or polyfills around supported built-ins, shell commands where Node APIs suffice, unnecessary mixing of ESM and CommonJS, casual `process.exit()` that bypasses cleanup, unclosed files/streams/servers, unparsed environment configuration, and synchronous I/O on hot paths. Prefer consistent use of either async or sync Node APIs.

## React

- Single-responsibility components; custom hooks for stateful logic.
- Discriminated unions and `useReducer` instead of many booleans.
- One `variant` prop instead of many boolean props.
- Extract complex JSX into named variables, functions, or child components.
- Performance and data fetching: [React best practices index](../_references/react-best-practices/Index.md) — load only relevant entries.

## Examples

### Collections

```ts
const userNames = users.map(user => user.name);

for (const user of users) {
  notify(user);
}
```

### State union

```ts
type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: User[] }
  | { status: 'error'; error: string };
```

### Immutable update

```ts
const users = [...existingUsers, newUser].toSorted((a, b) =>
  a.name.localeCompare(b.name)
);
```

### Normalize input

```ts
// After types guarantee ages: CustomerAge[] and customerCards: string[]
function hasDiscount(customers: Record<string, Customer>) {
  return Object.values(customers).some(customer =>
    customer.ages.some(ageGroup => ageGroup.customerCards.length > 0)
  );
}
```
