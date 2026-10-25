# Clean code for Swift

Guidance from Artem Sapegin’s [Washing your code](https://sapegin.me/book/) book, mapped to Swift idioms.

Prioritize readability and maintainability over cleverness or brevity. Make impossible states impossible. Prefer the type system and value semantics to catch mistakes early.

## Avoid loops

- Prefer `for element in collection` over index loops unless indices are required.
- Prefer `filter` / `map` when they name the step clearly.
- Prefer one step per idea; split chained transforms when a single expression mixes concerns.
- Use a plain loop when side effects, early exit, or async sequencing read clearer than a combinator — clarity wins over style.

## Avoid conditions

- Replace multipart or negated condition soup with well-named booleans or small functions.
- Prefer lookup tables or switch on enums when behavior is data-driven dispatch instead of long `if` chains.
- Prefer explicit comparisons (`items.isEmpty`, `items.count > 0`) over clever truthiness when it makes intent obvious.
- Use `guard` for preconditions and early exit; keep the happy path flat.
- Convert irregular input once at the boundary, then run generic logic on a uniform shape.
- Avoid duplicating the same algorithm for “has data” and “no data” branches when normalization can merge them.

## Avoid reassigning variables

- Prefer `let`; use `var` only when reassignment is part of the design.
- Prefer bindings that are assigned once and never repurposed; use a new name when the meaning changes.
- Declare as close to first use as practical.
- Build complete values in one expression or one place instead of incrementally patching when that reads clearer.

## Avoid mutation

- Prefer value types and returning new values over in-place mutation; mark `mutating` only when intentional.
- Do not mutate function parameters or caller-owned collections unless the API contract requires it.
- When mutation is necessary, keep it local, obvious, and documented by the function name or type.
- Avoid force-unwrap (`!`) and `try!` without a documented invariant.

Readers cannot assume a value still matches what an earlier line showed; hidden mutation in helpers causes distant bugs.

## Comments

- Remove comments that narrate syntax, repeat names, or over-explain obvious code.
- Keep `///` documentation comments on exported APIs when that is an existing project convention — brief public API docs are intentional, even when they restate the name. Do not narrate implementation line by line.
- Add concise comments when code depends on non-obvious constraints, external knowledge, workarounds, or decisions that cannot be recovered from the code alone. Explain _why_, not _what_.
- If a comment only restates _what_, try renaming or extracting first — but do not extract a one-off function whose only job is to carry a comment sentence.
- Keep precise TODOs that document intentionally deferred work or known scope limits; resolve or flag low-effort TODOs that can be completed safely in the current change. Use HACK for temporary workarounds — remove when done.
- Drop outdated explanations, commented-out code, and change-history journals.

## Naming

- `lowerCamelCase` for methods, properties, variables, and enum cases; `UpperCamelCase` for types and protocols.
- Use descriptive, searchable names; avoid abbreviations (`lineNumber`, not `lineNum`) and mystery acronyms except established domain terms.
- Single-letter names only in tiny scopes (short closures, index in a three-line loop).
- Use US English spelling in shared code unless the project standard differs.
- Functions and methods: verbs or verb phrases (`fetchWeather`, `getUserData`).
- Variables and properties: nouns.
- More than two parameters is a smell; any positional boolean parameter is a smell — use a struct or options type, or split functions.
- At call sites, readers should not need to open the callee to decode bare `true`/`false` or unexplained optionals.
- Prefer positive predicates (`isVisible`, `hasData`) over negatives (`isNotHidden`, `hasNoData`).

## Divide and conquer

- Duplication is cheaper than the wrong abstraction — wait until the similarity is real, not superficial.
- If an abstraction needs many conditions and options, consider splitting into separate types or modules.
- Extract when it lowers cognitive load: hides complexity, names a step in a narrative, or isolates a reusable boundary.
- Do not chop a linear algorithm into many one-line functions in separate files if readers must jump everywhere to follow the flow.
- Code length alone is not a split signal; unreadable mixing of abstraction levels is.
- Single responsibility in practice: one reason to change at a time, not “exactly N lines”.
- Early returns via `guard` to flatten nesting.
- Avoid premature abstraction — solve the current requirement. Reject one-use helpers, pass-through wrappers, factories, speculative options, and extension points for hypothetical futures.
- Use a struct or options type when arity grows.
- Default to `private` or `fileprivate` until API surface is intentional.

## Don’t make me think

- Brevity is not clarity — shortest code that passes tests is often not the clearest.
- Avoid puzzle idioms (dense one-liners, obscure operator tricks, long optional chains that hide coupling) when a straightforward form exists.
- Prefer APIs meant for humans reading code.
- Reduce the next reader’s cognitive load; if you hesitate, so will they.
- Do not shrink code at the cost of naming, conditions, or mutation safety.

## Clarity

- Replace unexplained numeric literals with named constants when the name captures a real constraint or domain concept; keep obvious local values inline.

## Other techniques

### Make impossible states impossible

- Prefer `enum` with associated values for loading / idle / success / failure instead of independent booleans.
- Let the type system reject invalid combinations.

### Normalize input

- Normalize at the boundary — function entry, API layer, parser — not in every consumer.
- A collection means “list of items”; use empty arrays for none unless the wire format truly requires otherwise and is converted once.
- Prefer fixing the producer or schema over defensive checks scattered through business logic.
- Convert to wire/backend shapes at the edge when raw formats would force non-idiomatic code in the core.
- Avoid long optional chains that hide coupling — refactor collaborators instead.

### Errors and state in types

- Make error and empty states explicit where practical.
- Use `throws` for recoverable failures; use `Result` when deferring evaluation fits the API.
- Do not use exceptions / `try` for ordinary control flow.

## Example

```swift
enum LoadState {
    case idle
    case loading
    case success([User])
    case failure(Error)
}

func getActiveNames(from users: [User]) -> [String] {
    users.filter(\.isActive).map(\.name)
}
```
