# Washing your code

Guidance from Artem Sapegin’s [Washing your code](https://sapegin.me/book/) book. Use this file only for languages without a dedicated guide.

## Avoid loops

Manual `for`/`while` loops with indices often hide what the code is doing to a collection.

- Name the operation (filter, map, find, sum) instead of walking indices when the language offers a clear idiom.
- Prefer one step per idea; split chained transforms when a single callback mixes concerns.
- Use a plain loop when side effects, early exit, or async sequencing read clearer than a functional combinator — clarity wins over style.

## Avoid conditions

Conditions add nesting, test cases, and cognitive load — remove unnecessary ones.

- Replace multipart or negated condition soup with well-named booleans or small functions.
- Prefer lookup maps or tables when behavior is data-driven dispatch instead of long `if`/`switch` chains.
- Prefer explicit comparisons (`length === 0`, `length > 0`) over truthiness when it makes intent obvious.
- Convert irregular input (missing vs empty collection, single item vs array) once at the boundary, then run generic logic on a uniform shape.
- Avoid duplicating the same algorithm for “has data” and “no data” branches when normalization can merge them.

## Avoid reassigning variables

Reassignment forces readers to track “what is this binding now?” at every use.

- Prefer bindings that are assigned once and never repurposed; use a new name when the meaning changes.
- Declare as close to first use as the language allows.
- Build complete values in one expression or one place instead of incrementally patching when that reads clearer.
- Use destructuring with defaults instead of assign-then-maybe-overwrite patterns.

## Avoid mutation

Shared mutable state makes bugs and reading cost spike.

- Do not mutate function parameters or caller-owned collections unless the API contract explicitly requires in-place update.
- Prefer creating new values (copies, spreads, persistent updates) over changing existing objects in place.
- When mutation is necessary, keep it local, obvious, and documented by the function name or type.
- Prefer non-mutating operations on copies when the language distinguishes them (`toSorted` vs `sort`, etc.).

Readers cannot assume a value still matches what an earlier line showed; hidden mutation in helpers causes distant bugs.

## Comments

- Remove comments that narrate syntax, repeat names, or over-explain obvious code.
- Keep the project’s standard documentation form on exported APIs when that is an existing convention — brief public API docs are intentional, even when they restate the name. Do not narrate implementation line by line.
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
- More than two parameters is a smell; any positional boolean parameter is a smell — use an options object, named arguments, or split functions.
- At call sites, readers should not need to open the callee to decode `null` or bare `true`/`false`.
- Prefer positive predicates (`isVisible`, `hasData`) over negatives (`isNotHidden`, `hasNoData`).

## Divide and conquer

- Duplication is cheaper than the wrong abstraction — wait until the similarity is real, not superficial.
- If an abstraction needs many conditions and options, consider splitting into separate modules.
- Extract when it lowers cognitive load: hides complexity, names a step in a narrative, or isolates a reusable boundary.
- Do not chop a linear algorithm into many one-line functions in separate files if readers must jump everywhere to follow the flow — scrolling one function can beat abstraction theater.
- Code length alone is not a split signal; unreadable mixing of abstraction levels is.
- Single responsibility in practice: one reason to change at a time, not “exactly N lines”.
- Early returns and guard clauses to flatten nesting.
- Avoid premature abstraction — solve the current requirement. Reject one-use helpers, pass-through wrappers, factories, speculative options, and extension points for hypothetical futures.

## Don’t make me think

- Brevity is not clarity — shortest code that passes tests is often not the clearest.
- Avoid puzzle idioms (obscure operators, nested ternaries, dense one-liners) when a straightforward form exists.
- Reduce the next reader’s cognitive load; if you hesitate, so will they.
- Prefer language features and APIs meant for humans reading code (`includes` over bitwise tricks, obvious string formatting, explicit truncations).
- Do not shrink code at the cost of naming, conditions, or mutation safety.

## Clarity

- Replace unexplained numeric literals with named constants when the name captures a real constraint or domain concept; keep obvious local values inline.

## Other techniques

### Make impossible states impossible

- Replace several exclusive boolean flags with one state type (enum, tagged union, status field).
- Model loading / success / error / idle explicitly instead of independent `isLoading` and `hasError` that can both be true.
- Let the type system reject invalid combinations where the language allows.

### Normalize input

- Normalize at the boundary — function entry, API layer, parser — not in every consumer.
- An array means “list of items”; use empty collection for none, not `null`, `undefined`, or `[null]` placeholders, unless the wire format truly requires otherwise and is converted once.
- Use defaults, nullish coalescing, or explicit conversion once, then run generic logic on normalized data.
- Prefer fixing the producer or schema over defensive checks scattered through business logic.
- Convert to wire/backend shapes at the edge when raw formats would force non-idiomatic code in the core.

### Errors and state in types

- Make error and empty states explicit in types where practical.
- Avoid try/catch (or equivalent) for ordinary control flow — reserve it for real failures.
