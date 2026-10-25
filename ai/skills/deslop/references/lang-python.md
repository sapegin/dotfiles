# Clean code for Python

Guidance from Artem Sapegin’s [Washing your code](https://sapegin.me/book/) book, mapped to Python idioms (PEP 8 + project formatters such as Ruff/Black).

Prioritize readability and maintainability over cleverness or brevity. Make impossible states impossible. Use type hints to catch errors early where practical.

## Avoid loops

- Prefer comprehensions or generator expressions when the transform is one clear idea.
- Use `for item in collection` instead of manual `range(len(...))` when index is unnecessary.
- Use `enumerate` when both index and value matter.
- Prefer one step per idea; split chained transforms when a single expression mixes concerns.
- Use a plain loop when side effects, early exit, or multi-step logic would obscure a comprehension — clarity wins over style.

## Avoid conditions

- Replace multipart or negated condition soup with well-named booleans or small functions.
- Prefer lookup dicts or tables when behavior is data-driven dispatch instead of long `if`/`match` chains.
- Prefer explicit comparisons (`len(items) == 0`, `len(items) > 0`) over truthiness when it makes intent obvious.
- Convert irregular input once at the boundary, then run generic logic on a uniform shape.
- Avoid duplicating the same algorithm for “has data” and “no data” branches when normalization can merge them.

## Avoid reassigning variables

- Prefer bindings that are assigned once and never repurposed; use a new name when the meaning changes.
- Declare as close to first use as practical.
- Build complete values in one expression or one place instead of incrementally patching when that reads clearer.
- Prefer unpacking with defaults over assign-then-maybe-overwrite patterns.

## Avoid mutation

- Do not mutate function parameters or caller-owned lists/dicts unless the function contract says so.
- Prefer creating new values (`@dataclass(frozen=True)`, new list/dict copies) over changing existing objects in place.
- No mutable default arguments; use `None` and assign inside the function.
- When mutation is necessary, keep it local, obvious, and documented by the function name or type.

Readers cannot assume a value still matches what an earlier line showed; hidden mutation in helpers causes distant bugs.

## Comments

- Remove comments that narrate syntax, repeat names, or over-explain obvious code.
- Keep docstrings on exported modules, classes, and functions when that is an existing project convention — brief public API docs are intentional, even when they restate the name. Do not use docstrings to narrate implementation line by line.
- Add concise comments when code depends on non-obvious constraints, external knowledge, workarounds, or decisions that cannot be recovered from the code alone. Explain _why_, not _what_.
- If a comment only restates _what_, try renaming or extracting first — but do not extract a one-off function whose only job is to carry a comment sentence.
- Keep precise TODOs that document intentionally deferred work or known scope limits; resolve or flag low-effort TODOs that can be completed safely in the current change. Use HACK for temporary workarounds — remove when done.
- Drop outdated explanations, commented-out code, and change-history journals.

## Naming

- `snake_case` for functions, variables, modules, and methods; `PascalCase` for classes; `UPPER_SNAKE` for module-level constants.
- Use descriptive, searchable names; avoid abbreviations (`line_number`, not `line_num`) and mystery acronyms except established domain terms.
- Single-letter names only in tiny scopes (short lambdas, index in a three-line loop).
- Use US English spelling in shared code unless the project standard differs.
- Functions: verbs or verb phrases (`fetch_weather`, `get_user_data`).
- Variables and properties: nouns.
- More than two parameters is a smell; any positional boolean parameter is a smell — use keyword-only parameters (`*`), a dataclass/`TypedDict`, or split functions.
- At call sites, readers should not need to open the callee to decode `None` or bare `True`/`False`.
- Prefer positive predicates (`is_visible`, `has_data`) over negatives (`is_not_hidden`, `has_no_data`).

## Divide and conquer

- Duplication is cheaper than the wrong abstraction — wait until the similarity is real, not superficial.
- If an abstraction needs many conditions and options, consider splitting into separate modules.
- Extract when it lowers cognitive load: hides complexity, names a step in a narrative, or isolates a reusable boundary.
- Do not chop a linear algorithm into many one-line functions in separate files if readers must jump everywhere to follow the flow.
- Code length alone is not a split signal; unreadable mixing of abstraction levels is.
- Single responsibility in practice: one reason to change at a time, not “exactly N lines”.
- Early returns and guard clauses to flatten nesting.
- Avoid premature abstraction — solve the current requirement. Reject one-use helpers, pass-through wrappers, factories, speculative options, and extension points for hypothetical futures.
- Use a dataclass or `TypedDict` when arity grows.

## Don’t make me think

- Brevity is not clarity — shortest code that passes tests is often not the clearest.
- Avoid puzzle idioms (dense one-liners, obscure operator tricks) when a straightforward form exists.
- Prefer language features meant for humans reading code (f-strings, clear builtins over clever bit tricks).
- Reduce the next reader’s cognitive load; if you hesitate, so will they.
- Do not shrink code at the cost of naming, conditions, or mutation safety.

## Clarity

- Replace unexplained numeric literals with named constants when the name captures a real constraint or domain concept; keep obvious local values inline.

## Other techniques

### Make impossible states impossible

- Replace several exclusive boolean flags with one state type (`Literal`, `Enum`, or tagged union).
- Model loading / success / error / idle explicitly instead of independent `is_loading` and `has_error` that can both be true.
- Let type checkers reject invalid combinations where practical.

### Normalize input

- Normalize at the boundary — function entry, API layer, parser — not in every consumer.
- A sequence means “list of items”; use `[]` for none, not `None` where the rest of the code expects a sequence, unless the wire format truly requires otherwise and is converted once.
- Use defaults or explicit conversion once, then run generic logic on normalized data.
- Prefer fixing the producer or schema over defensive checks scattered through business logic.
- Convert to wire/backend shapes at the edge when raw formats would force non-idiomatic code in the core.

### Errors and state in types

- Type hints on public APIs; make error and empty states explicit where practical.
- Raise specific exceptions; do not use exceptions for ordinary control flow.
- Prefer `T | None` only at boundaries; validate once and use non-optional types internally when possible.

## Example

```python
def get_active_display_names(users: Iterable[User]) -> list[str]:
    return [user.display_name for user in users if user.is_active]
```
